from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Annotated
from sqlalchemy.orm import Session
from sqlalchemy import and_
import logging
import os
import httpx
from datetime import datetime
import uuid
from urllib.parse import urlparse

from src.db_models.integrations import Integration, IntegrationLog
from src.db.db_session import get_db
from src.api.api_get_current_user import get_current_user, User

logger = logging.getLogger(__name__)
router = APIRouter()

# APIdeck configuration
APIDECK_APP_ID = os.getenv("APIDECK_APP_ID")
APIDECK_API_KEY = os.getenv("APIDECK_API_KEY")
APIDECK_CONSUMER_ID = os.getenv("APIDECK_CONSUMER_ID", "omegaintel-default-consumer")
APIDECK_BASE_URL = "https://unify.apideck.com"

# Service configurations (without mentioning APIdeck)
SUPPORTED_SERVICES = {
    "box": {
        "name": "Box",
        "description": "Cloud content management and file sharing",
        "icon": "box"
    },
    "dropbox": {
        "name": "Dropbox",
        "description": "Cloud storage and file synchronization",
        "icon": "dropbox"
    },
    "google-drive": {
        "name": "Google Drive",
        "description": "Cloud storage and file management",
        "icon": "google-drive"
    },
    "microsoft-outlook": {
        "name": "Microsoft Outlook",
        "description": "Email and calendar management",
        "icon": "outlook"
    },
    "microsoft-onedrive": {
        "name": "OneDrive",
        "description": "Microsoft cloud storage",
        "icon": "onedrive"
    },
    "microsoft-sharepoint": {
        "name": "SharePoint",
        "description": "Document management and collaboration",
        "icon": "sharepoint"
    },
    "salesforce": {
        "name": "Salesforce",
        "description": "Customer relationship management",
        "icon": "salesforce"
    }
}


class IntegrationCreate(BaseModel):
    service_type: str


class IntegrationUpdate(BaseModel):
    enabled: Optional[bool] = None


class IntegrationResponse(BaseModel):
    id: str
    service_type: str
    service_name: str
    enabled: bool
    is_connected: bool
    metadata: Optional[Dict[str, Any]] = None
    created_at: str
    last_synced_at: Optional[str] = None

    class Config:
        from_attributes = True


class VaultSessionResponse(BaseModel):
    session_token: str
    vault_url: str


@router.get("/integrations/test")
async def test_integrations():
    """Test endpoint to verify integrations API is working."""
    return {"status": "ok", "message": "Integrations API is working"}


@router.get("/integrations")
async def list_integrations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """List all available integrations for the current user."""
    logger.info(f"[Integrations] List integrations called for user: {current_user.email}")
    try:
        # Get user's existing integrations
        user_integrations = db.query(Integration).filter(
            Integration.user_id == current_user.id
        ).all()
        
        # Create a map of existing integrations
        existing_map = {int.service_type: int for int in user_integrations}
        
        # Build response with all supported services
        integrations = []
        for service_type, config in SUPPORTED_SERVICES.items():
            if service_type in existing_map:
                # Use existing integration data
                integration = existing_map[service_type]
                integrations.append(IntegrationResponse(
                    id=str(integration.id),
                    service_type=integration.service_type,
                    service_name=integration.service_name,
                    enabled=integration.enabled,
                    is_connected=integration.is_connected,
                    metadata=integration.connection_metadata,
                    created_at=integration.created_at.isoformat(),
                    last_synced_at=integration.last_synced_at.isoformat() if integration.last_synced_at else None
                ))
            else:
                # Create a placeholder for non-existing integration
                integrations.append(IntegrationResponse(
                    id="",
                    service_type=service_type,
                    service_name=config["name"],
                    enabled=False,
                    is_connected=False,
                    metadata={"description": config["description"]},
                    created_at=datetime.utcnow().isoformat(),
                    last_synced_at=None
                ))
        
        return integrations
    except Exception as e:
        logger.error(f"Error listing integrations: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to list integrations")


@router.post("/integrations/{service_type}/enable")
async def enable_integration(
    service_type: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Enable an integration for the current user."""
    logger.info(f"[Integrations] Enable integration called for service: {service_type}, user: {current_user.email}")
    try:
        if service_type not in SUPPORTED_SERVICES:
            raise HTTPException(status_code=400, detail="Unsupported service type")
        
        # Check if integration already exists
        existing = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if existing:
            existing.enabled = True
            db.commit()
            db.refresh(existing)
            integration = existing
        else:
            # Create new integration
            integration = Integration(
                user_id=current_user.id,
                provider="apideck",
                service_type=service_type,
                service_name=SUPPORTED_SERVICES[service_type]["name"],
                enabled=True,
                is_connected=False
            )
            db.add(integration)
            db.commit()
            db.refresh(integration)
            
            # Log the action
            log = IntegrationLog(
                integration_id=integration.id,
                log_type="enable",
                message=f"Integration enabled for {integration.service_name}"
            )
            db.add(log)
            db.commit()
        
        return IntegrationResponse(
            id=str(integration.id),
            service_type=integration.service_type,
            service_name=integration.service_name,
            enabled=integration.enabled,
            is_connected=integration.is_connected,
            metadata=integration.connection_metadata,
            created_at=integration.created_at.isoformat(),
            last_synced_at=integration.last_synced_at.isoformat() if integration.last_synced_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enabling integration: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to enable integration")


@router.post("/integrations/{service_type}/disable")
async def disable_integration(
    service_type: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Disable an integration for the current user."""
    try:
        integration = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        integration.enabled = False
        db.commit()
        
        # Log the action
        log = IntegrationLog(
            integration_id=integration.id,
            log_type="disable",
            message=f"Integration disabled for {integration.service_name}"
        )
        db.add(log)
        db.commit()
        
        return {"message": "Integration disabled successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disabling integration: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to disable integration")


@router.post("/integrations/{service_type}/connect")
async def connect_integration(
    service_type: str,
    current_user: Annotated[User, Depends(get_current_user)],
    request: Request,
    db: Session = Depends(get_db)
):
    """Initialize connection to an external service via APIdeck Vault."""
    logger.info(f"[Integrations] Connect integration called for service: {service_type}, user: {current_user.email}")
    try:
        if service_type not in SUPPORTED_SERVICES:
            raise HTTPException(status_code=400, detail="Unsupported service type")
        
        # Get or create integration
        integration = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found. Please enable it first.")
        
        # Create a unique consumer ID for this user
        consumer_id = f"user-{current_user.id}"
        
        # Create APIdeck Vault session
        headers = {
            "Authorization": f"Bearer {APIDECK_API_KEY}",
            "x-apideck-app-id": APIDECK_APP_ID,
            "x-apideck-consumer-id": consumer_id,
            "Content-Type": "application/json"
        }
        
        # Get the callback URL - for iframe context, we'll redirect to a special handler
        origin = request.headers.get("origin", "")
        referer = request.headers.get("referer", "")
        
        if origin and origin != "null":
            # Use the origin from the request header (frontend URL)
            # Create a special callback page that posts a message to parent window
            callback_url = f"{origin}/auth/callback/integration?service={service_type}"
        elif referer:
            # Extract base URL from referer
            parsed = urlparse(referer)
            base_url = f"{parsed.scheme}://{parsed.netloc}"
            callback_url = f"{base_url}/auth/callback/integration?service={service_type}"
        else:
            # Fallback logic
            scheme = "http"
            host = "localhost:3000"
            
            # Check for production domain
            request_host = request.headers.get("host", "")
            if "www.getomegaintel.com" in request_host:
                scheme = "https"
                host = "www.getomegaintel.com"
            elif "getomegaintel.com" in request_host:
                scheme = "https" 
                host = "www.getomegaintel.com"
                
            callback_url = f"{scheme}://{host}/auth/callback/integration?service={service_type}"
        
        logger.info(f"[Integrations] Origin: {origin}, Referer: {referer}")
        logger.info(f"[Integrations] Using callback URL: {callback_url}")
        
        vault_data = {
            "consumer_metadata": {
                "user_id": str(current_user.id),
                "email": current_user.email,
                "full_name": current_user.full_name or current_user.email
            },
            "redirect_uri": callback_url,
            "settings": {
                "unified_apis": ["file-storage", "crm", "email"]
            }
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{APIDECK_BASE_URL}/vault/sessions",
                headers=headers,
                json=vault_data
            )
            
            if response.status_code != 200:
                logger.error(f"APIdeck Vault session creation failed: {response.text}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to initialize connection"
                )
            
            data = response.json()
            session_token = data.get("data", {}).get("session_token")
            
            if not session_token:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to get session token"
                )
            
            # Log the action
            log = IntegrationLog(
                integration_id=integration.id,
                log_type="connection_init",
                message=f"Connection initialized for {integration.service_name}",
                log_metadata={"consumer_id": consumer_id}
            )
            db.add(log)
            db.commit()
            
            # Return the Vault URL for the frontend
            vault_url = f"https://vault.apideck.com/session/{session_token}"
            
            return VaultSessionResponse(
                session_token=session_token,
                vault_url=vault_url
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting integration: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to connect integration")


@router.post("/integrations/{service_type}/disconnect")
async def disconnect_integration(
    service_type: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Disconnect an integration."""
    try:
        integration = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Remove connection from APIdeck
        if integration.connection_id:
            consumer_id = f"user-{current_user.id}"
            headers = {
                "Authorization": f"Bearer {APIDECK_API_KEY}",
                "x-apideck-app-id": APIDECK_APP_ID,
                "x-apideck-consumer-id": consumer_id
            }
            
            async with httpx.AsyncClient() as client:
                await client.delete(
                    f"{APIDECK_BASE_URL}/vault/connections/{integration.connection_id}",
                    headers=headers
                )
        
        # Update integration status
        integration.is_connected = False
        integration.connection_id = None
        integration.connection_metadata = {}
        db.commit()
        
        # Log the action
        log = IntegrationLog(
            integration_id=integration.id,
            log_type="disconnect",
            message=f"Disconnected from {integration.service_name}"
        )
        db.add(log)
        db.commit()
        
        return {"message": "Integration disconnected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting integration: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to disconnect integration")


@router.post("/integrations/{service_type}/check-connection")
async def check_and_update_connection(
    service_type: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Check and update the connection status of an integration after OAuth callback."""
    logger.info(f"[Integrations] Checking connection status for {service_type}, user: {current_user.email}")
    try:
        integration = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Check connection status with APIdeck
        consumer_id = f"user-{current_user.id}"
        headers = {
            "Authorization": f"Bearer {APIDECK_API_KEY}",
            "x-apideck-app-id": APIDECK_APP_ID,
            "x-apideck-consumer-id": consumer_id
        }
        
        # Map service types to unified APIs
        unified_api_map = {
            'box': 'file-storage',
            'dropbox': 'file-storage',
            'google-drive': 'file-storage',
            'microsoft-onedrive': 'file-storage',
            'microsoft-sharepoint': 'file-storage',
            'microsoft-outlook': 'crm',
            'salesforce': 'crm'
        }
        
        unified_api = unified_api_map.get(service_type, 'file-storage')
        
        async with httpx.AsyncClient() as client:
            # Get all connections for this unified API
            response = await client.get(
                f"{APIDECK_BASE_URL}/vault/connections",
                headers=headers,
                params={"api": unified_api}
            )
            
            if response.status_code == 200:
                connections = response.json().get("data", [])
                logger.info(f"[Integrations] Found {len(connections)} connections for {unified_api}")
                
                # Find our specific service connection
                for conn in connections:
                    if conn.get("service_id") == service_type and conn.get("state") == "callable":
                        # Update integration as connected
                        integration.is_connected = True
                        integration.connection_id = conn.get("id")
                        integration.connection_metadata = {
                            "state": conn.get("state"),
                            "auth_type": conn.get("auth_type"),
                            "created_at": conn.get("created_at"),
                            "updated_at": conn.get("updated_at"),
                            "account_name": conn.get("metadata", {}).get("account", {}).get("name")
                        }
                        integration.last_synced_at = datetime.utcnow()
                        db.commit()
                        
                        # Log the successful connection
                        log = IntegrationLog(
                            integration_id=integration.id,
                            log_type="connected",
                            message=f"Successfully connected to {integration.service_name}"
                        )
                        db.add(log)
                        db.commit()
                        
                        return {
                            "status": "connected",
                            "service_type": service_type,
                            "account_name": conn.get("metadata", {}).get("account", {}).get("name")
                        }
                
                # No callable connection found
                return {
                    "status": "not_connected",
                    "service_type": service_type
                }
            else:
                logger.error(f"[Integrations] Failed to get connections: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "service_type": service_type
                }
                
    except Exception as e:
        logger.error(f"[Integrations] Error checking connection: {str(e)}")
        return {
            "status": "error",
            "service_type": service_type,
            "error": str(e)
        }


@router.get("/integrations/{service_type}/status")
async def check_integration_status(
    service_type: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Check the connection status of an integration."""
    try:
        integration = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Check connection status with APIdeck
        if integration.is_connected and integration.connection_id:
            consumer_id = f"user-{current_user.id}"
            headers = {
                "Authorization": f"Bearer {APIDECK_API_KEY}",
                "x-apideck-app-id": APIDECK_APP_ID,
                "x-apideck-consumer-id": consumer_id
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{APIDECK_BASE_URL}/vault/connections/{service_type}",
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json().get("data", {})
                    
                    # Update metadata
                    integration.connection_metadata = {
                        "account": data.get("name", ""),
                        "state": data.get("state", ""),
                        "enabled": data.get("enabled", False)
                    }
                    integration.last_synced_at = datetime.utcnow()
                    db.commit()
                else:
                    # Connection no longer valid
                    integration.is_connected = False
                    integration.connection_id = None
                    db.commit()
        
        return IntegrationResponse(
            id=str(integration.id),
            service_type=integration.service_type,
            service_name=integration.service_name,
            enabled=integration.enabled,
            is_connected=integration.is_connected,
            metadata=integration.connection_metadata,
            created_at=integration.created_at.isoformat(),
            last_synced_at=integration.last_synced_at.isoformat() if integration.last_synced_at else None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking integration status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check integration status")


@router.post("/integrations/callback")
async def integration_callback(
    service_type: str,
    connection_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """Handle callback after successful connection via APIdeck Vault."""
    try:
        integration = db.query(Integration).filter(
            and_(
                Integration.user_id == current_user.id,
                Integration.service_type == service_type
            )
        ).first()
        
        if not integration:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        # Update integration with connection details
        integration.is_connected = True
        integration.connection_id = connection_id
        integration.last_synced_at = datetime.utcnow()
        db.commit()
        
        # Log the action
        log = IntegrationLog(
            integration_id=integration.id,
            log_type="connected",
            message=f"Successfully connected to {integration.service_name}",
            log_metadata={"connection_id": connection_id}
        )
        db.add(log)
        db.commit()
        
        return {"message": "Integration connected successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error handling integration callback: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to complete integration")