from fastapi import APIRouter
from typing import Optional
from datetime import date
from models import schemas
from services import OpenBBService, CacheService

router = APIRouter()

# Initialize services
openbb_service = OpenBBService()
cache_service = CacheService()

@router.get("/company", response_model=schemas.BaseResponse)
async def get_company_news(
    symbol: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    limit: Optional[int] = 50,
    channels: Optional[str] = "all"
):
    """Get company news"""
    try:
        # Check cache
        cache_key = f"news:company:{symbol}:{start_date}:{end_date}:{limit}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_company_news(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            channels=channels
        )
        
        # Cache the result for shorter time (news updates frequently)
        cache_service.set(cache_key, data, ttl=300)  # 5 minutes
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))