from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import date
from models import schemas
from services import OpenBBService, CacheService
from services.multi_provider_service import MultiProviderService

router = APIRouter()

# Initialize services
openbb_service = OpenBBService()
cache_service = CacheService()
multi_provider_service = MultiProviderService()

@router.get("/price/historical", response_model=schemas.BaseResponse)
async def get_historical_prices(
    symbol: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    interval: Optional[str] = "1d"
):
    """Get historical price data for a symbol"""
    try:
        # Check cache first
        cache_key = f"price:historical:{symbol}:{start_date}:{end_date}:{interval}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_price_historical(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            interval=interval
        )
        
        # Cache the result
        cache_service.set(cache_key, data)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/price/quote", response_model=schemas.BaseResponse)
async def get_quote(
    symbol: str,
    provider: Optional[str] = Query(None, description="Data provider (polygon, alpha_vantage, fmp, etc.)")
):
    """Get real-time quote for a symbol with provider selection"""
    try:
        # Check cache with shorter TTL for real-time data
        cache_key = f"price:quote:{symbol}:{provider or 'auto'}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="quote",
            symbol=symbol,
            provider=provider
        )
        
        if data:
            # Cache with short TTL for real-time data
            cache_service.set(cache_key, data, ttl=30)  # 30 seconds cache
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(
                success=False, 
                error=f"Unable to fetch quote for {symbol} from any provider"
            )
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/overview", response_model=schemas.BaseResponse)
async def get_fundamental_overview(symbol: str):
    """Get fundamental overview for a symbol"""
    try:
        # Check cache
        cache_key = f"fundamental:overview:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_fundamental_overview(symbol)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)  # Cache for 1 hour
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/ownership/share-statistics", response_model=schemas.BaseResponse)
async def get_share_statistics(symbol: str):
    """Get share statistics for a symbol"""
    try:
        # Check cache
        cache_key = f"ownership:share-statistics:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_share_statistics(symbol)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/management", response_model=schemas.BaseResponse)
async def get_management_team(symbol: str):
    """Get management team information"""
    try:
        # Check cache
        cache_key = f"fundamental:management:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_management_team(symbol)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=86400)  # Cache for 24 hours
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/revenue-geography", response_model=schemas.BaseResponse)
async def get_revenue_geography(
    symbol: str,
    period: Optional[str] = "annual"
):
    """Get revenue per geography"""
    try:
        # Check cache
        cache_key = f"fundamental:revenue-geography:{symbol}:{period}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_revenue_geography(symbol, period)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=86400)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/revenue-segment", response_model=schemas.BaseResponse)
async def get_revenue_segment(
    symbol: str,
    period: Optional[str] = "annual"
):
    """Get revenue per business segment"""
    try:
        # Check cache
        cache_key = f"fundamental:revenue-segment:{symbol}:{period}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_revenue_segment(symbol, period)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=86400)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/metrics", response_model=schemas.BaseResponse)
async def get_valuation_metrics(
    symbol: str,
    period: Optional[str] = "annual",
    limit: Optional[int] = 100,
    with_ttm: Optional[bool] = True
):
    """Get valuation multiples/metrics"""
    try:
        # Check cache
        cache_key = f"fundamental:metrics:{symbol}:{period}:{limit}:{with_ttm}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_valuation_metrics(
            symbol=symbol,
            period=period,
            limit=limit,
            with_ttm=with_ttm
        )
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/filings", response_model=schemas.BaseResponse)
async def get_company_filings(symbol: str):
    """Get company filings"""
    try:
        # Check cache
        cache_key = f"fundamental:filings:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_company_filings(symbol)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/estimates/price-target", response_model=schemas.BaseResponse)
async def get_price_target(symbol: str):
    """Get analyst price targets"""
    try:
        # Check cache
        cache_key = f"estimates:price-target:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_price_target(symbol)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/income-statement", response_model=schemas.BaseResponse)
async def get_income_statement(
    symbol: str,
    period: Optional[str] = "annual",
    limit: Optional[int] = 10
):
    """Get income statement data"""
    try:
        # Check cache
        cache_key = f"fundamental:income-statement:{symbol}:{period}:{limit}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_income_statement(symbol, period, limit)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/balance-sheet", response_model=schemas.BaseResponse)
async def get_balance_sheet(
    symbol: str,
    period: Optional[str] = "annual",
    limit: Optional[int] = 10
):
    """Get balance sheet data"""
    try:
        # Check cache
        cache_key = f"fundamental:balance-sheet:{symbol}:{period}:{limit}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_balance_sheet(symbol, period, limit)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/cash-flow-statement", response_model=schemas.BaseResponse)
async def get_cash_flow_statement(
    symbol: str,
    period: Optional[str] = "annual",
    limit: Optional[int] = 10
):
    """Get cash flow statement data"""
    try:
        # Check cache
        cache_key = f"fundamental:cash-flow-statement:{symbol}:{period}:{limit}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_cash_flow_statement(symbol, period, limit)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/analyst-ratings", response_model=schemas.BaseResponse)
async def get_analyst_ratings(symbol: str, limit: Optional[int] = 20):
    """Get analyst ratings and price targets"""
    try:
        # Check cache
        cache_key = f"fundamental:analyst-ratings:{symbol}:{limit}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_analyst_ratings(symbol, limit)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/sec-filings", response_model=schemas.BaseResponse) 
async def get_sec_filings(symbol: str, limit: Optional[int] = 100):
    """Get SEC filings"""
    try:
        # Check cache
        cache_key = f"fundamental:sec-filings:{symbol}:{limit}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_sec_filings(symbol, limit)
        
        # Cache the result
        cache_service.set(cache_key, data, ttl=3600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/earnings-transcript", response_model=schemas.BaseResponse)
async def get_earnings_transcript(symbol: str, year: int, quarter: int):
    """Get earnings call transcript for a specific quarter and year"""
    try:
        # Check cache
        cache_key = f"fundamental:earnings-transcript:{symbol}:{year}:{quarter}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_earnings_transcript(symbol, year, quarter)
        
        # Cache the result for 24 hours (earnings transcripts don't change)
        cache_service.set(cache_key, data, ttl=86400)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/fundamental/earnings-transcript-dates", response_model=schemas.BaseResponse)
async def get_earnings_transcript_dates(symbol: str):
    """Get available earnings transcript dates for a symbol"""
    try:
        # Check cache
        cache_key = f"fundamental:earnings-transcript-dates:{symbol}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from OpenBB
        data = await openbb_service.get_earnings_transcript_dates(symbol)
        
        # Cache the result for 6 hours
        cache_service.set(cache_key, data, ttl=21600)
        
        return schemas.BaseResponse(success=True, data=data)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/options/chain", response_model=schemas.BaseResponse)
async def get_options_chain(
    symbol: str,
    expiration_date: Optional[str] = Query(None, description="Filter by expiration date (YYYY-MM-DD)"),
    provider: Optional[str] = Query(None, description="Data provider (polygon, benzinga)")
):
    """Get options chain for a symbol"""
    try:
        # Check cache
        cache_key = f"options:chain:{symbol}:{expiration_date}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="options",
            symbol=symbol,
            provider=provider,
            expiration_date=expiration_date
        )
        
        if data:
            # Cache for 5 minutes (options data changes frequently)
            cache_service.set(cache_key, data, ttl=300)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="No options data available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/options/activity", response_model=schemas.BaseResponse)
async def get_options_activity(
    symbol: str,
    sentiment: Optional[str] = Query(None, description="Filter by sentiment (BULLISH, BEARISH)"),
    min_volume: Optional[int] = Query(None, description="Minimum volume threshold"),
    provider: Optional[str] = Query(None, description="Data provider (benzinga, polygon)")
):
    """Get unusual options activity for a symbol"""
    try:
        # Check cache
        cache_key = f"options:activity:{symbol}:{sentiment}:{min_volume}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="options",
            symbol=symbol,
            provider=provider,
            sentiment=sentiment,
            min_volume=min_volume
        )
        
        if data:
            # Cache for 5 minutes
            cache_service.set(cache_key, data, ttl=300)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="No options activity data available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/technical/sma", response_model=schemas.BaseResponse)
async def get_sma(
    symbol: str,
    time_period: Optional[int] = Query(20, description="Number of periods for SMA calculation"),
    provider: Optional[str] = Query(None, description="Data provider (alpha_vantage)")
):
    """Get Simple Moving Average (SMA) for a symbol"""
    try:
        # Check cache
        cache_key = f"technical:sma:{symbol}:{time_period}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="technical",
            symbol=symbol,
            provider=provider,
            indicator="SMA",
            time_period=time_period
        )
        
        if data:
            # Cache for 15 minutes
            cache_service.set(cache_key, data, ttl=900)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="SMA data not available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/technical/ema", response_model=schemas.BaseResponse)
async def get_ema(
    symbol: str,
    time_period: Optional[int] = Query(12, description="Number of periods for EMA calculation"),
    provider: Optional[str] = Query(None, description="Data provider (alpha_vantage)")
):
    """Get Exponential Moving Average (EMA) for a symbol"""
    try:
        # Check cache
        cache_key = f"technical:ema:{symbol}:{time_period}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="technical",
            symbol=symbol,
            provider=provider,
            indicator="EMA",
            time_period=time_period
        )
        
        if data:
            # Cache for 15 minutes
            cache_service.set(cache_key, data, ttl=900)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="EMA data not available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/technical/rsi", response_model=schemas.BaseResponse)
async def get_rsi(
    symbol: str,
    time_period: Optional[int] = Query(14, description="Number of periods for RSI calculation"),
    provider: Optional[str] = Query(None, description="Data provider (alpha_vantage)")
):
    """Get Relative Strength Index (RSI) for a symbol"""
    try:
        # Check cache
        cache_key = f"technical:rsi:{symbol}:{time_period}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="technical",
            symbol=symbol,
            provider=provider,
            indicator="RSI",
            time_period=time_period
        )
        
        if data:
            # Cache for 15 minutes
            cache_service.set(cache_key, data, ttl=900)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="RSI data not available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/technical/macd", response_model=schemas.BaseResponse)
async def get_macd(
    symbol: str,
    fast_period: Optional[int] = Query(12, description="Fast period for MACD"),
    slow_period: Optional[int] = Query(26, description="Slow period for MACD"),
    signal_period: Optional[int] = Query(9, description="Signal period for MACD"),
    provider: Optional[str] = Query(None, description="Data provider (alpha_vantage)")
):
    """Get MACD (Moving Average Convergence Divergence) for a symbol"""
    try:
        # Check cache
        cache_key = f"technical:macd:{symbol}:{fast_period}:{slow_period}:{signal_period}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="technical",
            symbol=symbol,
            provider=provider,
            indicator="MACD",
            fast_period=fast_period,
            slow_period=slow_period,
            signal_period=signal_period
        )
        
        if data:
            # Cache for 15 minutes
            cache_service.set(cache_key, data, ttl=900)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="MACD data not available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/technical/bbands", response_model=schemas.BaseResponse)
async def get_bollinger_bands(
    symbol: str,
    time_period: Optional[int] = Query(20, description="Number of periods for Bollinger Bands"),
    provider: Optional[str] = Query(None, description="Data provider (alpha_vantage)")
):
    """Get Bollinger Bands for a symbol"""
    try:
        # Check cache
        cache_key = f"technical:bbands:{symbol}:{time_period}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="technical",
            symbol=symbol,
            provider=provider,
            indicator="BBANDS",
            time_period=time_period
        )
        
        if data:
            # Cache for 15 minutes
            cache_service.set(cache_key, data, ttl=900)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="Bollinger Bands data not available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/technical/stoch", response_model=schemas.BaseResponse)
async def get_stochastic(
    symbol: str,
    provider: Optional[str] = Query(None, description="Data provider (alpha_vantage)")
):
    """Get Stochastic oscillator for a symbol"""
    try:
        # Check cache
        cache_key = f"technical:stoch:{symbol}:{provider}"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            return schemas.BaseResponse(success=True, data=cached_data)
        
        # Fetch from multi-provider service
        data = await multi_provider_service.get_data(
            data_type="technical",
            symbol=symbol,
            provider=provider,
            indicator="STOCH"
        )
        
        if data:
            # Cache for 15 minutes
            cache_service.set(cache_key, data, ttl=900)
            return schemas.BaseResponse(success=True, data=data)
        else:
            return schemas.BaseResponse(success=False, error="Stochastic data not available")
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))