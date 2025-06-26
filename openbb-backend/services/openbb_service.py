from typing import Optional, Dict, Any, List
from datetime import date, datetime
import pandas as pd
from config import settings
from .multi_provider_service import MultiProviderService

class OpenBBService:
    def __init__(self):
        # Try multi-provider service first
        self.multi_provider = MultiProviderService()
        
        # Check if we should try OpenBB SDK
        self.use_openbb = False
        if settings.OPENBB_PAT and settings.OPENBB_PAT != "your_openbb_personal_access_token_here":
            try:
                from openbb import obb
                obb.account.login(pat=settings.OPENBB_PAT)
                self.obb = obb
                self.use_openbb = True
                print("OpenBB SDK initialized successfully")
            except Exception as e:
                print(f"Failed to initialize OpenBB SDK: {e}")
        
        print("Service initialized with multi-provider support")
    
    async def get_price_historical(
        self, 
        symbol: str, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        interval: str = "1d"
    ) -> Dict[str, Any]:
        """Get historical price data for a symbol"""
        # Try multi-provider first (uses free sources)
        try:
            result = await self.multi_provider.get_price_historical(symbol, start_date, end_date, interval)
            if result.get('data'):
                return result
        except Exception as e:
            print(f"Multi-provider error: {e}")
        
        # Fallback to OpenBB SDK if available
        if self.use_openbb:
            try:
                result = self.obb.equity.price.historical(
                    symbol=symbol,
                    start_date=start_date,
                    end_date=end_date,
                    interval=interval
                )
                if result:
                    df = result.to_dataframe()
                    # Format dates properly
                    data = []
                    for idx, row in df.iterrows():
                        record = row.to_dict()
                        # Convert date to string format if it exists
                        if 'date' in record and pd.notna(record['date']):
                            if isinstance(record['date'], str):
                                # Parse and reformat if it's already a string
                                try:
                                    date_obj = pd.to_datetime(record['date'])
                                    record['date'] = date_obj.strftime('%Y-%m-%d')
                                except:
                                    # Keep original if parsing fails
                                    pass
                            else:
                                # Format datetime objects
                                try:
                                    record['date'] = pd.to_datetime(record['date']).strftime('%Y-%m-%d')
                                except:
                                    record['date'] = str(record['date'])
                        data.append(record)
                    
                    return {
                        "symbol": symbol,
                        "data": data,
                        "count": len(data),
                        "provider": "openbb"
                    }
            except Exception as e:
                print(f"OpenBB SDK error: {e}")
        
        # Return empty data instead of mock
        return {'data': []}
    
    async def get_fundamental_overview(self, symbol: str) -> Dict[str, Any]:
        """Get fundamental overview for a symbol"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_fundamental_overview(symbol)
            if result and not result.get('error'):
                return result
        except Exception as e:
            print(f"Multi-provider error: {e}")
        
        # Return empty data instead of mock
        return {}
    
    async def get_company_news(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50,
        channels: str = "all"
    ) -> List[Dict[str, Any]]:
        """Get company news"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_company_news(symbol, start_date, end_date, limit)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_share_statistics(self, symbol: str) -> Dict[str, Any]:
        """Get share statistics"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_share_statistics(symbol)
            if result and not result.get('error'):
                return result
        except Exception as e:
            print(f"Multi-provider error: {e}")
        
        # Return empty dict instead of mock data
        return {}
    
    async def get_management_team(self, symbol: str) -> List[Dict[str, Any]]:
        """Get management team information"""
        # Try multi-provider first (uses FMP if available)
        try:
            result = await self.multi_provider.get_management_team(symbol)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider management team error: {e}")
        
        # Return empty array instead of mock data
        return []
    
    async def get_price_performance(self, symbol: str) -> Dict[str, Any]:
        """Get price performance data"""
        try:
            result = await self.multi_provider.get_price_performance(symbol)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider price performance error: {e}")
        
        return {}
    
    async def get_revenue_geography(
        self, 
        symbol: str, 
        period: str = "annual"
    ) -> List[Dict[str, Any]]:
        """Get revenue per geography"""
        # Try multi-provider first (uses FMP if available)
        try:
            result = await self.multi_provider.get_revenue_geography(symbol, period)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider revenue geography error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_revenue_segment(
        self, 
        symbol: str, 
        period: str = "annual"
    ) -> List[Dict[str, Any]]:
        """Get revenue per business segment"""
        # Try multi-provider first (uses FMP if available)
        try:
            result = await self.multi_provider.get_revenue_segment(symbol, period)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider revenue segment error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_valuation_metrics(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 100,
        with_ttm: bool = True
    ) -> List[Dict[str, Any]]:
        """Get valuation multiples/metrics"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_valuation_metrics(symbol, period, limit, with_ttm)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_company_filings(self, symbol: str) -> List[Dict[str, Any]]:
        """Get company filings"""
        # Return empty data instead of mock
        return []
    
    async def get_price_target(self, symbol: str) -> Dict[str, Any]:
        """Get analyst price targets"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_price_target(symbol)
            if result and not result.get('error'):
                return result
        except Exception as e:
            print(f"Multi-provider error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_etf_info(self, symbol: str) -> Dict[str, Any]:
        """Get ETF information if applicable"""
        # Return empty data instead of mock
        return {}
    
    async def get_income_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get income statement data"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_income_statement(symbol, period, limit)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider income statement error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_balance_sheet(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get balance sheet data"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_balance_sheet(symbol, period, limit)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider balance sheet error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_cash_flow_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get cash flow statement data"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_cash_flow_statement(symbol, period, limit)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider cash flow statement error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_analyst_ratings(self, symbol: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get analyst ratings and price targets"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_analyst_ratings(symbol, limit)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider analyst ratings error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_sec_filings(self, symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get SEC filings"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_sec_filings(symbol, limit)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider SEC filings error: {e}")
        
        # Return empty data instead of mock
        return []
    
    async def get_earnings_transcript(self, symbol: str, year: int, quarter: int) -> Dict[str, Any]:
        """Get earnings call transcript"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_earnings_transcript(symbol, year, quarter)
            if result and not result.get('error'):
                return result
        except Exception as e:
            print(f"Multi-provider earnings transcript error: {e}")
        
        # Return empty data instead of mock
        return {}
    
    async def get_earnings_transcript_dates(self, symbol: str) -> List[Dict[str, Any]]:
        """Get available earnings transcript dates"""
        # Try multi-provider first
        try:
            result = await self.multi_provider.get_earnings_transcript_dates(symbol)
            if result:
                return result
        except Exception as e:
            print(f"Multi-provider transcript dates error: {e}")
        
        # Return empty data instead of mock
        return []