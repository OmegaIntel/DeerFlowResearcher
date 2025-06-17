"""OAuth configuration for social login providers"""
import os
from typing import Dict, Any

# OAuth provider configurations
OAUTH_PROVIDERS = {
    "google": {
        "client_id": os.getenv("GOOGLE_CLIENT_ID", "REMOVED_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", "REMOVED_CLIENT_SECRET"),
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scope": "openid email profile",
        "redirect_uri": {
            "development": "http://localhost:8000/api/auth/google/callback",
            "production": "https://www.getomegaintel.com/api/auth/google/callback"
        }
    },
    "microsoft": {
        "client_id": os.getenv("MICROSOFT_CLIENT_ID", ""),
        "client_secret": os.getenv("MICROSOFT_CLIENT_SECRET", ""),
        "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "scope": "openid email profile User.Read",
        "redirect_uri": {
            "development": "http://localhost:8000/api/auth/microsoft/callback",
            "production": "https://www.getomegaintel.com/api/auth/microsoft/callback"
        }
    },
    "linkedin": {
        "client_id": os.getenv("LINKEDIN_CLIENT_ID", ""),
        "client_secret": os.getenv("LINKEDIN_CLIENT_SECRET", ""),
        "authorize_url": "https://www.linkedin.com/oauth/v2/authorization",
        "token_url": "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo_url": "https://api.linkedin.com/v2/userinfo",
        "scope": "openid email profile",
        "redirect_uri": {
            "development": "http://localhost:8000/api/auth/linkedin/callback",
            "production": "https://www.getomegaintel.com/api/auth/linkedin/callback"
        }
    }
}

def get_provider_config(provider: str, environment: str = "development") -> Dict[str, Any]:
    """Get OAuth provider configuration"""
    if provider not in OAUTH_PROVIDERS:
        raise ValueError(f"Unknown OAuth provider: {provider}")
    
    config = OAUTH_PROVIDERS[provider].copy()
    # Set the appropriate redirect URI based on environment
    config["redirect_uri"] = config["redirect_uri"][environment]
    
    return config