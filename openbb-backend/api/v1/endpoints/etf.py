from fastapi import APIRouter
from models import schemas
from services import OpenBBService, CacheService

router = APIRouter()

# Initialize services
openbb_service = OpenBBService()
cache_service = CacheService()

@router.get("/info", response_model=schemas.BaseResponse)
async def get_etf_info(symbol: str):
    """Get ETF information"""
    try:
        # Check cache
        cache_key = f"etf:info:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_etf_info(symbol)
        
        # Cache the result
        if data:  # Only cache if we got data
            cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))