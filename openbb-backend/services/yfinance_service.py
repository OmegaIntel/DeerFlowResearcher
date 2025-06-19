"""
Simple service using yfinance for basic financial data (no API key needed)
"""
import yfinance as yf
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import pandas as pd

class YFinanceService:
    """Free financial data service using Yahoo Finance"""
    
    async def get_price_historical(
        self, 
        symbol: str, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        interval: str = "1d"
    ) -> Dict[str, Any]:
        """Get historical price data"""
        try:
            ticker = yf.Ticker(symbol)
            
            # Get historical data
            hist = ticker.history(
                start=start_date,
                end=end_date,
                interval=interval
            )
            
            if not hist.empty:
                # Convert to expected format
                data = []
                for idx, row in hist.iterrows():
                    data.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "open": row["Open"],
                        "high": row["High"],
                        "low": row["Low"],
                        "close": row["Close"],
                        "volume": row["Volume"]
                    })
                
                return {
                    "symbol": symbol,
                    "data": data,
                    "count": len(data)
                }
            
            return {"symbol": symbol, "data": [], "count": 0}
            
        except Exception as e:
            raise Exception(f"Failed to fetch data from Yahoo Finance: {str(e)}")
    
    async def get_fundamental_overview(self, symbol: str) -> Dict[str, Any]:
        """Get company overview"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                "symbol": symbol,
                "name": info.get("longName", ""),
                "description": info.get("longBusinessSummary", ""),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "marketCap": info.get("marketCap", 0),
                "employees": info.get("fullTimeEmployees", 0),
                "website": info.get("website", ""),
                "exchange": info.get("exchange", ""),
                "pe": info.get("trailingPE", 0),
                "eps": info.get("trailingEps", 0),
                "dividendYield": info.get("dividendYield", 0),
                "beta": info.get("beta", 0)
            }
            
        except Exception as e:
            raise Exception(f"Failed to fetch company info: {str(e)}")
    
    async def get_company_news(self, symbol: str, **kwargs) -> List[Dict[str, Any]]:
        """Get recent news"""
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            return [
                {
                    "title": item.get("title", ""),
                    "url": item.get("link", ""),
                    "published": datetime.fromtimestamp(item.get("providerPublishTime", 0)).isoformat(),
                    "source": item.get("publisher", ""),
                    "summary": item.get("summary", "")
                }
                for item in news[:50]  # Limit to 50 items
            ]
            
        except Exception as e:
            return []  # News might not be available for all symbols