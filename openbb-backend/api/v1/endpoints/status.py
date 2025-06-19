from fastapi import APIRouter
from config.providers_config import PROVIDER_INFO
from config import settings
import os

router = APIRouter()

@router.get("/providers")
async def get_provider_status():
    """Get status of available data providers"""
    providers_status = {
        # Always available
        "yfinance": {
            "name": "Yahoo Finance",
            "status": "active",
            "requires_key": False
        },
        "mock": {
            "name": "Mock Data",
            "status": "active",
            "requires_key": False
        }
    }
    
    # Check for API keys using settings
    if settings.ALPHA_VANTAGE_API_KEY:
        providers_status["alpha_vantage"] = {
            "name": "Alpha Vantage",
            "status": "active",
            "requires_key": True,
            "limits": "500 calls/day",
            "key_configured": True
        }
    
    if settings.POLYGON_API_KEY:
        providers_status["polygon"] = {
            "name": "Polygon.io",
            "status": "active", 
            "requires_key": True,
            "limits": "5 calls/minute",
            "key_configured": True
        }
    
    if settings.FMP_API_KEY:
        providers_status["fmp"] = {
            "name": "Financial Modeling Prep",
            "status": "active",
            "requires_key": True,
            "limits": "250 calls/day",
            "key_configured": True
        }
    
    if settings.OPENBB_PAT and settings.OPENBB_PAT != "your_openbb_personal_access_token_here":
        providers_status["openbb"] = {
            "name": "OpenBB Platform",
            "status": "active",
            "requires_key": True,
            "limits": "Varies by plan"
        }
    
    total_providers = len([p for p in providers_status.values() if p["status"] == "active"])
    
    return {
        "total_active_providers": total_providers,
        "providers": providers_status,
        "recommended_keys": [
            {
                "provider": "alpha_vantage",
                "signup_url": "https://www.alphavantage.co/support/#api-key",
                "benefits": "Historical data, fundamentals"
            },
            {
                "provider": "polygon",
                "signup_url": "https://polygon.io/dashboard/signup",
                "benefits": "Real-time data, news"
            }
        ] if total_providers <= 2 else []
    }

@router.get("/data-coverage")
async def get_data_coverage():
    """Get information about what data is available"""
    return {
        "available_features": {
            "historical_prices": ["yfinance", "alpha_vantage", "polygon", "fmp", "mock"],
            "company_overview": ["yfinance", "alpha_vantage", "fmp", "mock"],
            "company_news": ["yfinance", "polygon", "mock"],
            "share_statistics": ["yfinance", "mock"],
            "price_targets": ["yfinance", "fmp", "mock"],
            "financial_statements": ["alpha_vantage", "polygon", "fmp"],
            "management_team": ["fmp", "mock"],
            "revenue_breakdown": ["fmp", "mock"]
        },
        "notes": {
            "yfinance": "Free, no key required. Best for basic data.",
            "alpha_vantage": "Free tier available. Good for historical data.",
            "polygon": "Free tier available. Best for real-time data.",
            "fmp": "Free tier available. Most comprehensive fundamentals.",
            "mock": "Always available fallback with sample data."
        }
    }