"""
OpenBB Platform API Routes

These routes provide access to OpenBB's comprehensive functionality
while maintaining compatibility with the existing frontend.
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta

from services.openbb_integration import openbb_integration
from services.cache_service import cache_service

router = APIRouter(prefix="/api/v1/openbb", tags=["OpenBB Platform"])

# Company Information Routes
@router.get("/profile/{symbol}")
async def get_company_profile(symbol: str):
    """Get comprehensive company profile via OpenBB"""
    cache_key = f"openbb_profile_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_company_profile(symbol)
    if result and 'error' not in result:
        await cache_service.set(cache_key, result, ttl=3600)  # 1 hour cache
    return result

@router.get("/executives/{symbol}")
async def get_executives(symbol: str):
    """Get management team via OpenBB"""
    cache_key = f"openbb_executives_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_key_executives(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

# Market Data Routes
@router.get("/quote/{symbol}")
async def get_quote(symbol: str):
    """Get real-time quote via OpenBB"""
    cache_key = f"openbb_quote_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_quote(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=60)  # 1 minute cache
    return result

@router.get("/historical/{symbol}")
async def get_historical(
    symbol: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    interval: str = Query("1d")
):
    """Get historical data via OpenBB"""
    if not start_date:
        start_date = (datetime.now() - timedelta(days=365)).strftime("%Y-%m-%d")
    if not end_date:
        end_date = datetime.now().strftime("%Y-%m-%d")
    
    cache_key = f"openbb_historical_{symbol}_{start_date}_{end_date}_{interval}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_historical_data(
        symbol, start_date, end_date, interval
    )
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

# Financial Data Routes
@router.get("/metrics/{symbol}")
async def get_metrics(symbol: str):
    """Get financial metrics via OpenBB"""
    cache_key = f"openbb_metrics_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_financial_metrics(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

# News Routes
@router.get("/news/{symbol}")
async def get_news(
    symbol: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(20)
):
    """Get company news via OpenBB"""
    cache_key = f"openbb_news_{symbol}_{limit}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_company_news(
        symbol, start_date, end_date, limit
    )
    if result:
        await cache_service.set(cache_key, result, ttl=300)  # 5 minute cache
    return result

# Technical Analysis Routes
@router.get("/technical/{symbol}")
async def get_technical_indicators(symbol: str):
    """Get technical indicators via OpenBB"""
    cache_key = f"openbb_technical_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_technical_indicators(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=300)
    return result

# Multi-Asset Routes
@router.get("/crypto/{symbol}")
async def get_crypto_quote(symbol: str):
    """Get cryptocurrency quote via OpenBB"""
    result = await openbb_integration.get_crypto_quote(symbol)
    return result

@router.get("/forex/{pair}")
async def get_forex_quote(pair: str):
    """Get forex quote via OpenBB"""
    result = await openbb_integration.get_forex_quote(pair)
    return result

# Economic Data Routes
@router.get("/economy/calendar")
async def get_economic_calendar(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get economic calendar via OpenBB"""
    if not start_date:
        start_date = datetime.now().strftime("%Y-%m-%d")
    if not end_date:
        end_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
    
    cache_key = f"openbb_calendar_{start_date}_{end_date}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_economic_calendar(start_date, end_date)
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

# ETF Routes
@router.get("/etf/holdings/{symbol}")
async def get_etf_holdings(symbol: str):
    """Get ETF holdings via OpenBB"""
    cache_key = f"openbb_etf_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_etf_holdings(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

# Advanced Analytics Routes
@router.get("/options/{symbol}")
async def get_options_chain(symbol: str):
    """Get options chain via OpenBB"""
    cache_key = f"openbb_options_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_options_chain(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=300)
    return result

@router.get("/insider/{symbol}")
async def get_insider_trading(symbol: str):
    """Get insider trading via OpenBB"""
    cache_key = f"openbb_insider_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_insider_trading(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

@router.get("/institutional/{symbol}")
async def get_institutional_ownership(symbol: str):
    """Get institutional ownership via OpenBB"""
    cache_key = f"openbb_institutional_{symbol}"
    cached = await cache_service.get(cache_key)
    if cached:
        return cached
    
    result = await openbb_integration.get_institutional_ownership(symbol)
    if result:
        await cache_service.set(cache_key, result, ttl=3600)
    return result

# Unified Search Route
@router.get("/search")
async def search_securities(
    query: str = Query(..., description="Search query"),
    asset_class: Optional[str] = Query("equity", description="Asset class filter")
):
    """Search across all asset classes via OpenBB"""
    # This would use OpenBB's search functionality
    # For now, return a placeholder
    return {
        "query": query,
        "asset_class": asset_class,
        "results": [],
        "message": "OpenBB search functionality to be implemented"
    }

# Health Check
@router.get("/health")
async def openbb_health_check():
    """Check OpenBB integration status"""
    return {
        "status": "operational",
        "openbb_available": openbb_integration.obb is not None,
        "timestamp": datetime.now().isoformat()
    }