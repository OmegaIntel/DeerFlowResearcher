"""OAuth authentication routes for social login"""
import logging
import secrets
import uuid
from typing import Optional
from urllib.parse import urlencode

# from authlib.integrations.starlette_client import OAuth  # Not needed for manual implementation
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy.orm import Session
from starlette.config import Config

from src.api.api_generate_token import create_access_token
from src.db.db_session import get_db
from src.db_models.users import User
from src.server.oauth_config import get_provider_config

logger = logging.getLogger(__name__)
router = APIRouter()

# OAuth state store (in production, use Redis or database)
oauth_states = {}

def get_environment(request: Request) -> str:
    """Determine if we're in development or production based on the request"""
    import os
    host = request.headers.get("host", "")
    
    # If it's localhost or EC2, use development URLs
    if "localhost" in host or "ec2" in host or "compute" in host:
        return "development"
    
    # If it's the actual domain, use production
    if "getomegaintel.com" in host:
        return "production"
    
    # Otherwise check environment variable
    return "production" if os.getenv("PRODUCTION", "false").lower() == "true" else "development"

def get_redirect_uri(provider: str, request: Request) -> str:
    """Get the appropriate redirect URI based on the request"""
    host = request.headers.get("host", "")
    
    if "localhost" in host:
        return f"http://localhost:8000/api/auth/{provider}/callback"
    elif "ec2" in host or "compute" in host:
        # For EC2, use the same host
        host_without_port = host.split(':')[0]
        return f"http://{host_without_port}:8000/api/auth/{provider}/callback"
    elif "getomegaintel.com" in host:
        # For production domain - check if HTTPS
        x_forwarded_proto = request.headers.get("x-forwarded-proto", "http")
        protocol = "https" if x_forwarded_proto == "https" else "http"
        return f"{protocol}://www.getomegaintel.com/api/auth/{provider}/callback"
    else:
        # Default to production with HTTPS
        return f"https://www.getomegaintel.com/api/auth/{provider}/callback"

@router.get("/auth/{provider}/login")
async def oauth_login(provider: str, request: Request):
    """Initiate OAuth login flow"""
    try:
        environment = get_environment(request)
        config = get_provider_config(provider, environment)
        
        # Check if OAuth credentials are configured
        if not config.get("client_id") or not config.get("client_secret"):
            return JSONResponse(
                status_code=503,
                content={
                    "error": "oauth_not_configured",
                    "message": f"{provider.title()} OAuth is not configured. Please contact the administrator."
                }
            )
        
        # Use dynamic redirect URI based on request
        redirect_uri = get_redirect_uri(provider, request)
        
        # Generate state for CSRF protection
        state = secrets.token_urlsafe(32)
        oauth_states[state] = provider
        
        # Build authorization URL
        params = {
            "client_id": config["client_id"],
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": config["scope"],
            "state": state,
            "access_type": "offline",  # For Google refresh token
            "prompt": "consent"  # Force consent screen
        }
        
        auth_url = f"{config['authorize_url']}?{urlencode(params)}"
        logger.info(f"Redirecting to {provider} auth: {auth_url}")
        logger.info(f"Using redirect URI: {redirect_uri}")
        
        return RedirectResponse(url=auth_url)
        
    except Exception as e:
        logger.error(f"OAuth login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auth/{provider}/callback")
async def oauth_callback(
    provider: str,
    request: Request,
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Handle OAuth callback"""
    try:
        # Check for errors from provider
        if error:
            logger.error(f"OAuth error from {provider}: {error}")
            return RedirectResponse(url="/auth/login?error=oauth_failed")
        
        # Verify state
        if state not in oauth_states or oauth_states[state] != provider:
            logger.error("Invalid OAuth state")
            return RedirectResponse(url="/auth/login?error=invalid_state")
        
        # Remove used state
        del oauth_states[state]
        
        if not code:
            logger.error("No authorization code received")
            return RedirectResponse(url="/auth/login?error=no_code")
        
        environment = get_environment(request)
        config = get_provider_config(provider, environment)
        
        # Use dynamic redirect URI based on request
        redirect_uri = get_redirect_uri(provider, request)
        
        # Exchange code for tokens
        token_data = await exchange_code_for_token(code, config, redirect_uri)
        if not token_data:
            return RedirectResponse(url="/auth/login?error=token_exchange_failed")
        
        # Get user info
        user_info = await get_user_info(token_data["access_token"], config)
        if not user_info:
            return RedirectResponse(url="/auth/login?error=userinfo_failed")
        
        # Create or update user
        user = await create_or_update_oauth_user(
            db=db,
            email=user_info["email"],
            provider=provider,
            provider_id=user_info["id"],
            full_name=user_info.get("name"),
            profile_picture=user_info.get("picture"),
            access_token=token_data.get("access_token"),
            refresh_token=token_data.get("refresh_token")
        )
        
        # Create JWT token
        access_token = create_access_token(data={"sub": user.email})
        
        # Redirect to frontend with token
        host = request.headers.get("host", "")
        if "localhost" in host:
            frontend_url = "http://localhost:3000"
        elif "ec2" in host or "compute" in host:
            # For EC2, use the same host but port 3000
            host_without_port = host.split(':')[0]
            frontend_url = f"http://{host_without_port}:3000"
        elif "getomegaintel.com" in host:
            # For production domain - check if HTTPS
            x_forwarded_proto = request.headers.get("x-forwarded-proto", "http")
            protocol = "https" if x_forwarded_proto == "https" else "http"
            frontend_url = f"{protocol}://www.getomegaintel.com"
        else:
            frontend_url = "https://www.getomegaintel.com"
            
        redirect_url = f"{frontend_url}/auth/callback?token={access_token}"
        logger.info(f"Redirecting to frontend: {redirect_url}")
        
        return RedirectResponse(url=redirect_url)
        
    except Exception as e:
        logger.error(f"OAuth callback error: {e}", exc_info=True)
        return RedirectResponse(url="/auth/login?error=oauth_error")

async def exchange_code_for_token(code: str, config: dict, redirect_uri: str) -> Optional[dict]:
    """Exchange authorization code for access token"""
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                config["token_url"],
                data={
                    "client_id": config["client_id"],
                    "client_secret": config["client_secret"],
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code"
                }
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Token exchange failed: {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Token exchange error: {e}")
        return None

async def get_user_info(access_token: str, config: dict) -> Optional[dict]:
    """Get user information from OAuth provider"""
    import httpx
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                config["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                data = response.json()
                # Normalize the response
                return {
                    "id": str(data.get("id") or data.get("sub")),
                    "email": data.get("email"),
                    "name": data.get("name") or data.get("displayName"),
                    "picture": data.get("picture") or data.get("avatar_url")
                }
            else:
                logger.error(f"Get user info failed: {response.text}")
                return None
                
    except Exception as e:
        logger.error(f"Get user info error: {e}")
        return None

async def create_or_update_oauth_user(
    db: Session,
    email: str,
    provider: str,
    provider_id: str,
    full_name: Optional[str] = None,
    profile_picture: Optional[str] = None,
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None
) -> User:
    """Create or update user from OAuth data"""
    
    # Check if user exists
    user = db.query(User).filter(User.email == email).first()
    
    if user:
        # Update existing user with OAuth info
        user.oauth_provider = provider
        user.oauth_provider_id = provider_id
        if full_name:
            user.full_name = full_name
        if profile_picture:
            user.profile_picture = profile_picture
        if access_token:
            user.oauth_access_token = access_token
        if refresh_token:
            user.oauth_refresh_token = refresh_token
    else:
        # Create new user
        user = User(
            id=uuid.uuid4(),
            email=email,
            oauth_provider=provider,
            oauth_provider_id=provider_id,
            full_name=full_name,
            profile_picture=profile_picture,
            oauth_access_token=access_token,
            oauth_refresh_token=refresh_token,
            password_hash=None  # No password for OAuth users
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    
    return user