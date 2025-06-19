"""
Alternative OpenBB service that uses direct provider API keys instead of PAT
"""
from typing import Optional, Dict, Any, List
from datetime import date
import os
from openbb import obb

class OpenBBDirectService:
    """Use OpenBB with direct provider API keys instead of PAT"""
    
    def __init__(self):
        # Set provider API keys directly (get free keys from providers)
        
        # Example: Alpha Vantage (free tier available)
        # Get key from: https://www.alphavantage.co/support/#api-key
        if av_key := os.getenv("ALPHA_VANTAGE_API_KEY"):
            obb.user.credentials.alpha_vantage_api_key = av_key
        
        # Example: Polygon.io (free tier available)
        # Get key from: https://polygon.io/dashboard/api-keys
        if polygon_key := os.getenv("POLYGON_API_KEY"):
            obb.user.credentials.polygon_api_key = polygon_key
        
        # Example: Financial Modeling Prep (free tier)
        # Get key from: https://site.financialmodelingprep.com/developer/docs
        if fmp_key := os.getenv("FMP_API_KEY"):
            obb.user.credentials.fmp_api_key = fmp_key
        
        # You can add more providers as needed
        
    async def get_price_historical(self, symbol: str, provider: str = "polygon") -> Dict[str, Any]:
        """Get historical prices using specific provider"""
        try:
            # Use specific provider instead of default
            result = obb.equity.price.historical(
                symbol=symbol,
                provider=provider  # "polygon", "alpha_vantage", "yahoo", etc.
            )
            if result:
                df = result.to_dataframe()
                return {"symbol": symbol, "data": df.to_dict('records')}
            return {"symbol": symbol, "data": []}
        except Exception as e:
            print(f"Error with {provider}: {e}")
            # Try fallback provider
            if provider != "yahoo":
                return await self.get_price_historical(symbol, "yahoo")
            raise e