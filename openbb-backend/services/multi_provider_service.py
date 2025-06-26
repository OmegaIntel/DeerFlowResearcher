"""
Multi-provider service that uses the best available free/cheap data sources
Prioritizes free providers and falls back to others as needed
"""
import os
from typing import Optional, Dict, Any, List
from datetime import date, datetime, timedelta
import yfinance as yf
import pandas as pd
from config.providers_config import PROVIDER_INFO, FUNCTION_TO_PROVIDERS
from .alpha_vantage_service import AlphaVantageService
from .polygon_service import PolygonService
from .fmp_service import FMPService
from .benzinga_service import BenzingaService
from .api_ninjas_service import APINinjasService

class MultiProviderService:
    def __init__(self):
        self.providers = {}
        self._initialize_providers()
        
        # Initialize API services
        self.alpha_vantage = AlphaVantageService() if os.getenv('ALPHA_VANTAGE_API_KEY') else None
        self.polygon = PolygonService() if os.getenv('POLYGON_API_KEY') else None
        self.fmp = FMPService() if os.getenv('FMP_API_KEY') else None
        self.benzinga = BenzingaService() if os.getenv('BENZINGA_API_KEY') else None
        self.api_ninjas = APINinjasService() if os.getenv('API_NINJAS_KEY') else APINinjasService()  # Always try API Ninjas
    
    def _initialize_providers(self):
        """Initialize available providers based on API keys"""
        # Always available - no key required
        self.providers['yfinance'] = True
        self.providers['cboe'] = True
        self.providers['sec'] = True
        
        # Check for API keys in environment
        if os.getenv('ALPHA_VANTAGE_API_KEY'):
            self.providers['alpha_vantage'] = True
            print("✓ Alpha Vantage API key found")
        
        if os.getenv('POLYGON_API_KEY'):
            self.providers['polygon'] = True
            print("✓ Polygon.io API key found")
            
        if os.getenv('FMP_API_KEY'):
            self.providers['fmp'] = True
            print("✓ Financial Modeling Prep API key found")
            
        if os.getenv('TIINGO_TOKEN'):
            self.providers['tiingo'] = True
            print("✓ Tiingo API key found")
            
        if os.getenv('FRED_API_KEY'):
            self.providers['fred'] = True
            print("✓ FRED API key found")
            
        if os.getenv('BENZINGA_API_KEY'):
            self.providers['benzinga'] = True
            print("✓ Benzinga API key found")
            
        # API Ninjas is always available with provided key
        self.providers['api_ninjas'] = True
        print("✓ API Ninjas key available")
    
    async def get_price_historical(
        self, 
        symbol: str, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        interval: str = "1d"
    ) -> Dict[str, Any]:
        """Get historical price data - tries multiple providers"""
        
        # Try Polygon first if available (best real-time data)
        if self.polygon:
            try:
                result = await self.polygon.get_price_historical(symbol, start_date, end_date)
                if result.get('data'):
                    return result
            except Exception as e:
                print(f"Polygon error: {e}")
        
        # Try Alpha Vantage if available
        if self.alpha_vantage:
            try:
                result = await self.alpha_vantage.get_price_historical(symbol, 'full' if start_date else 'compact')
                if result.get('data'):
                    # Filter by date range if specified
                    if start_date or end_date:
                        filtered_data = []
                        for item in result['data']:
                            item_date = datetime.strptime(item['date'], '%Y-%m-%d').date()
                            if start_date and item_date < start_date:
                                continue
                            if end_date and item_date > end_date:
                                continue
                            filtered_data.append(item)
                        result['data'] = filtered_data
                        result['count'] = len(filtered_data)
                    return result
            except Exception as e:
                print(f"Alpha Vantage error: {e}")
        
        # Fallback to yfinance (free, no key required)
        try:
            ticker = yf.Ticker(symbol)
            hist = ticker.history(
                start=start_date,
                end=end_date,
                interval=interval,
                auto_adjust=True
            )
            
            if not hist.empty:
                data = []
                for idx, row in hist.iterrows():
                    data.append({
                        "date": idx.strftime("%Y-%m-%d"),
                        "open": round(row["Open"], 2),
                        "high": round(row["High"], 2),
                        "low": round(row["Low"], 2),
                        "close": round(row["Close"], 2),
                        "volume": int(row["Volume"])
                    })
                
                return {
                    "symbol": symbol,
                    "data": data,
                    "count": len(data),
                    "provider": "yfinance"
                }
        except Exception as e:
            print(f"YFinance error: {e}")
        
        # Final fallback
        return {"symbol": symbol, "data": [], "count": 0, "error": "No data providers available"}
    
    async def get_fundamental_overview(self, symbol: str) -> Dict[str, Any]:
        """Get company overview - tries multiple providers"""
        
        # Try FMP first (most comprehensive)
        if self.fmp:
            try:
                result = await self.fmp.get_company_profile(symbol)
                if result and not result.get('error'):
                    return result
            except Exception as e:
                print(f"FMP overview error: {e}")
        
        # Try Alpha Vantage
        if self.alpha_vantage:
            try:
                result = await self.alpha_vantage.get_company_overview(symbol)
                if result and not result.get('error'):
                    return result
            except Exception as e:
                print(f"Alpha Vantage overview error: {e}")
        
        # Try Polygon
        if self.polygon:
            try:
                result = await self.polygon.get_ticker_details(symbol)
                if result and not result.get('error'):
                    return result
            except Exception as e:
                print(f"Polygon overview error: {e}")
        
        # Fallback to yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if info:
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
                    "country": info.get("country", ""),
                    "currency": info.get("currency", "USD"),
                    "provider": "yfinance"
                }
        except Exception as e:
            print(f"YFinance overview error: {e}")
        
        return {"symbol": symbol, "error": "No data available"}
    
    async def get_share_statistics(self, symbol: str) -> Dict[str, Any]:
        """Get share statistics - try FMP first, then yfinance"""
        # Try FMP first
        if self.fmp:
            try:
                float_data = await self.fmp.get_share_float(symbol)
                if float_data and not float_data.get('error'):
                    # Also get additional data from yfinance
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    
                    return {
                        "symbol": symbol,
                        "sharesOutstanding": float_data.get('outstandingShares', 0),
                        "sharesFloat": float_data.get('floatShares', 0),
                        "freeFloat": float_data.get('freeFloat', 0),
                        "sharesShort": info.get("sharesShort", 0),
                        "shortRatio": info.get("shortRatio", 0),
                        "shortPercentOfFloat": info.get("shortPercentOfFloat", 0) * 100 if info.get("shortPercentOfFloat") else 0,
                        "institutionalOwnership": info.get("heldPercentInstitutions", 0) * 100 if info.get("heldPercentInstitutions") else 0,
                        "insiderOwnership": info.get("heldPercentInsiders", 0) * 100 if info.get("heldPercentInsiders") else 0,
                        "provider": "fmp"
                    }
            except Exception as e:
                print(f"FMP share statistics error: {e}")
        
        # Fallback to yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            shares_outstanding = info.get("sharesOutstanding", 0)
            shares_float = info.get("floatShares", 0)
            shares_short = info.get("sharesShort", 0)
            
            return {
                "symbol": symbol,
                "sharesOutstanding": shares_outstanding,
                "sharesFloat": shares_float,
                "sharesShort": shares_short,
                "shortRatio": info.get("shortRatio", 0),
                "shortPercentOfFloat": info.get("shortPercentOfFloat", 0) * 100 if info.get("shortPercentOfFloat") else 0,
                "institutionalOwnership": info.get("heldPercentInstitutions", 0) * 100 if info.get("heldPercentInstitutions") else 0,
                "insiderOwnership": info.get("heldPercentInsiders", 0) * 100 if info.get("heldPercentInsiders") else 0,
                "provider": "yfinance"
            }
        except Exception as e:
            print(f"Share statistics error: {e}")
            return {"symbol": symbol, "error": str(e)}
    
    async def get_key_metrics(self, symbol: str) -> Dict[str, Any]:
        """Get key financial metrics for a symbol"""
        # Try FMP first
        if self.fmp:
            try:
                metrics = await self.fmp.get_key_metrics(symbol)
                if metrics and not metrics.get("error"):
                    return metrics
            except Exception as e:
                print(f"FMP key metrics error: {e}")
        
        # Fallback to yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get current price for calculations
            current_price = info.get("currentPrice") or info.get("regularMarketPrice", 0)
            
            return {
                "symbol": symbol,
                "name": info.get("longName", ""),
                "peRatio": info.get("trailingPE", 0) or info.get("forwardPE", 0),
                "psRatio": info.get("priceToSalesTrailing12Months", 0),
                "pbRatio": info.get("priceToBook", 0),
                "evToRevenue": info.get("enterpriseToRevenue", 0),
                "evToEbitda": info.get("enterpriseToEbitda", 0),
                "dividendYield": (info.get("dividendYield", 0) or 0) * 100,  # Convert to percentage
                "marketCap": info.get("marketCap", 0),
                "currentPrice": current_price,
                "provider": "yfinance"
            }
        except Exception as e:
            print(f"Key metrics error for {symbol}: {e}")
            return {
                "symbol": symbol,
                "error": str(e),
                "peRatio": 0,
                "psRatio": 0,
                "pbRatio": 0,
                "evToRevenue": 0,
                "evToEbitda": 0,
                "dividendYield": 0
            }
    
    async def get_company_news(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get company news - tries FMP first, then other providers"""
        
        # Try FMP first (we have API key for it)
        if self.fmp:
            try:
                news = await self.fmp.get_company_news(symbol, start_date, end_date, limit)
                if news:
                    return news
            except Exception as e:
                print(f"FMP news error: {e}")
        
        # Try Benzinga second (has links and full content)
        if self.benzinga:
            try:
                news = await self.benzinga.get_company_news(symbol, start_date, end_date, limit)
                if news:
                    return news
            except Exception as e:
                print(f"Benzinga news error: {e}")
        
        # Try Polygon third (good news API)
        if self.polygon:
            try:
                news = await self.polygon.get_company_news(symbol, limit)
                if news:
                    return news
            except Exception as e:
                print(f"Polygon news error: {e}")
        
        # Fallback to yfinance
        try:
            ticker = yf.Ticker(symbol)
            news = ticker.news
            
            if news:
                formatted_news = []
                for item in news[:limit]:
                    # Debug: Print raw news item
                    print(f"YFinance news item: {item}")
                    
                    # Extract content from nested structure
                    content = item.get('content', {})
                    
                    # Parse the published date
                    pub_date_str = content.get('pubDate', '')
                    if pub_date_str:
                        try:
                            pub_time = datetime.strptime(pub_date_str, '%Y-%m-%dT%H:%M:%SZ')
                        except:
                            pub_time = datetime.now()
                    else:
                        pub_time = datetime.now()
                    
                    # Filter by date if provided
                    if start_date and pub_time.date() < start_date:
                        continue
                    if end_date and pub_time.date() > end_date:
                        continue
                    
                    # Extract URL from nested structure
                    url = ''
                    if content.get('clickThroughUrl'):
                        url = content['clickThroughUrl'].get('url', '')
                    elif content.get('canonicalUrl'):
                        url = content['canonicalUrl'].get('url', '')
                    
                    # Extract provider
                    provider_info = content.get('provider', {})
                    source = provider_info.get('displayName', 'Unknown')
                    
                    formatted_news.append({
                        "title": content.get("title", ""),
                        "url": url,
                        "published": pub_time.isoformat(),
                        "source": source,
                        "summary": content.get("summary", "")[:200] + "..." if len(content.get("summary", "")) > 200 else content.get("summary", ""),
                        "provider": "yfinance"
                    })
                
                return formatted_news
        except Exception as e:
            print(f"YFinance news error: {e}")
            import traceback
            traceback.print_exc()
        
        return []
    
    async def get_valuation_metrics(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 5,
        with_ttm: bool = True
    ) -> List[Dict[str, Any]]:
        """Get valuation metrics - calculated from financial statements"""
        
        # For quarterly data, FMP doesn't support valuation metrics by quarter
        # So skip FMP for quarterly requests
        if period.lower() not in ["quarter", "quarterly", "q"] and self.fmp:
            try:
                metrics = await self.fmp.get_key_metrics(symbol, period, limit)
                if metrics:
                    return metrics
            except Exception as e:
                print(f"FMP metrics error: {e}")
        
        # For TTM only, try yfinance for real tickers
        if with_ttm and period.lower() in ["annual"]:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                # Only return yfinance data if we actually get meaningful data
                # Check if we got at least one non-None metric
                pe_ratio = info.get("trailingPE", None)
                ps_ratio = info.get("priceToSalesTrailing12Months", None)
                pb_ratio = info.get("priceToBook", None)
                
                if pe_ratio is not None or ps_ratio is not None or pb_ratio is not None:
                    current_metrics = {
                        "period": "TTM",
                        "date": datetime.now().date().isoformat(),
                        "peRatio": pe_ratio,
                        "forwardPE": info.get("forwardPE", None),
                        "pegRatio": info.get("pegRatio", None),
                        "priceToSalesRatio": ps_ratio,
                        "priceToBookRatio": pb_ratio,
                        "enterpriseValue": info.get("enterpriseValue", None),
                        "evToRevenue": info.get("enterpriseToRevenue", None),
                        "evToEbitda": info.get("enterpriseToEbitda", None),
                        "provider": "yfinance"
                    }
                    
                    return [current_metrics]
                
            except Exception as e:
                print(f"Valuation metrics error: {e}")
        
        # For quarterly data, TTM without real data, or when other sources fail, return empty to fallback to mock
        return []
    
    async def get_management_team(self, symbol: str) -> List[Dict[str, Any]]:
        """Get management team - tries yfinance first (has full team), then FMP"""
        
        # Try yfinance first since it has full management team data
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if 'companyOfficers' in info and info['companyOfficers']:
                formatted = []
                for officer in info['companyOfficers']:
                    formatted.append({
                        "name": officer.get("name", "N/A"),
                        "title": officer.get("title", "N/A"),
                        "compensation": officer.get("totalPay", 0),
                        "currency": "USD",
                        "age": officer.get("age"),
                        "yearBorn": officer.get("yearBorn"),
                        "fiscalYear": officer.get("fiscalYear")
                    })
                if formatted:  # If we got data, return it
                    return formatted
        except Exception as e:
            print(f"YFinance management error: {e}")
        
        # Fallback to FMP if yfinance fails
        if self.fmp:
            try:
                executives = await self.fmp.get_key_executives(symbol)
                if executives:
                    # Format for frontend
                    formatted = []
                    for exec in executives:
                        formatted.append({
                            "name": exec.get("name", "N/A"),
                            "title": exec.get("title", "N/A"),
                            "compensation": exec.get("pay", 0),
                            "currency": exec.get("currencyPay", "USD")
                        })
                    return formatted
            except Exception as e:
                print(f"FMP management error: {e}")
        
        return []
    
    async def get_price_performance(self, symbol: str) -> Dict[str, Any]:
        """Get price performance data across multiple time periods"""
        try:
            # Use yfinance for all data
            ticker = yf.Ticker(symbol)
            
            # Get current info - handle 401 errors gracefully
            try:
                info = ticker.info
                current_price = info.get('currentPrice', info.get('regularMarketPrice'))
            except Exception as e:
                # Try basic quote data only
                try:
                    # Use fast_info which is less likely to trigger 401
                    fast = ticker.fast_info
                    current_price = fast.last_price
                    info = {
                        'previousClose': fast.previous_close,
                        'currency': 'USD',
                        'fiftyTwoWeekHigh': fast.year_high,
                        'fiftyTwoWeekLow': fast.year_low,
                    }
                except:
                    print(f"Unable to get basic quote for {symbol}")
                    return {}
            
            if not current_price:
                print(f"No current price found for {symbol}")
                return {}
            
            # Build the performance object
            performance = {
                "currentPrice": current_price,
                "currency": info.get('currency', 'USD'),
                "previousClose": info.get('previousClose', 0),
                "dayChange": current_price - info.get('previousClose', current_price),
                "dayChangePercent": ((current_price - info.get('previousClose', current_price)) / info.get('previousClose', current_price) * 100) if info.get('previousClose') else 0,
                "yearHigh": info.get('fiftyTwoWeekHigh', 0),
                "yearLow": info.get('fiftyTwoWeekLow', 0),
                "marketCap": info.get('marketCap', 0),
                "volume": info.get('volume', 0),
                "averageVolume": info.get('averageVolume', 0),
                "peRatio": info.get('trailingPE'),
                "provider": "yfinance",
                "performance": {}
            }
            
            # Calculate time-based performances
            try:
                # Get different period histories
                hist_5d = ticker.history(period="5d")
                hist_1mo = ticker.history(period="1mo")
                hist_3mo = ticker.history(period="3mo")
                hist_6mo = ticker.history(period="6mo")
                hist_ytd = ticker.history(period="ytd")
                hist_1y = ticker.history(period="1y")
                hist_2y = ticker.history(period="2y")
                hist_5y = ticker.history(period="5y")
                
                # Calculate 1D return (previous close vs current)
                if info.get('previousClose') and current_price:
                    performance['performance']['1D'] = round(((current_price - info['previousClose']) / info['previousClose'] * 100), 2)
                
                # Calculate 5D return
                if not hist_5d.empty and len(hist_5d) > 0:
                    performance['performance']['5D'] = round(((current_price - hist_5d['Close'].iloc[0]) / hist_5d['Close'].iloc[0] * 100), 2)
                
                # Calculate 1W return (approximately)
                if not hist_1mo.empty and len(hist_1mo) >= 5:
                    # Get price from ~7 days ago
                    idx = min(5, len(hist_1mo) - 1)
                    performance['performance']['1W'] = round(((current_price - hist_1mo['Close'].iloc[idx]) / hist_1mo['Close'].iloc[idx] * 100), 2)
                
                # Calculate 1M return
                if not hist_1mo.empty and len(hist_1mo) > 0:
                    performance['performance']['1M'] = round(((current_price - hist_1mo['Close'].iloc[0]) / hist_1mo['Close'].iloc[0] * 100), 2)
                
                # Calculate 3M return
                if not hist_3mo.empty and len(hist_3mo) > 0:
                    performance['performance']['3M'] = round(((current_price - hist_3mo['Close'].iloc[0]) / hist_3mo['Close'].iloc[0] * 100), 2)
                
                # Calculate 6M return
                if not hist_6mo.empty and len(hist_6mo) > 0:
                    performance['performance']['6M'] = round(((current_price - hist_6mo['Close'].iloc[0]) / hist_6mo['Close'].iloc[0] * 100), 2)
                
                # Calculate YTD return
                if not hist_ytd.empty and len(hist_ytd) > 0:
                    performance['performance']['YTD'] = round(((current_price - hist_ytd['Close'].iloc[0]) / hist_ytd['Close'].iloc[0] * 100), 2)
                
                # Calculate 1Y return
                if not hist_1y.empty and len(hist_1y) > 0:
                    performance['performance']['1Y'] = round(((current_price - hist_1y['Close'].iloc[0]) / hist_1y['Close'].iloc[0] * 100), 2)
                
                # Calculate 3Y return (use 2Y history and extrapolate if needed)
                if not hist_2y.empty and len(hist_2y) > 250:  # At least 1 year of data
                    # Try to get price from 3 years ago
                    target_idx = min(750, len(hist_2y) - 1)  # ~3 years of trading days
                    if target_idx > 0:
                        performance['performance']['3Y'] = round(((current_price - hist_2y['Close'].iloc[target_idx]) / hist_2y['Close'].iloc[target_idx] * 100), 2)
                
                # Calculate 5Y return
                if not hist_5y.empty and len(hist_5y) > 250:  # At least 1 year of data
                    # Get the oldest price available
                    performance['performance']['5Y'] = round(((current_price - hist_5y['Close'].iloc[0]) / hist_5y['Close'].iloc[0] * 100), 2)
                    
            except Exception as e:
                print(f"Error calculating performance for {symbol}: {str(e)}")
                # Set all to None if there's an error
                for period in ['1D', '5D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y']:
                    if period not in performance['performance']:
                        performance['performance'][period] = None
            
            return performance
            
        except Exception as e:
            print(f"YFinance price performance error: {e}")
            return {}
    
    async def get_revenue_geography(self, symbol: str, period: str = "annual") -> List[Dict[str, Any]]:
        """Get revenue by geography - from FMP"""
        if self.fmp:
            try:
                segments = await self.fmp.get_revenue_geographic_segments(symbol, period)
                if segments:
                    return segments
            except Exception as e:
                print(f"FMP geography segments error: {e}")
        
        # No other provider has this data
        return []
    
    async def get_revenue_segment(self, symbol: str, period: str = "annual") -> List[Dict[str, Any]]:
        """Get revenue by segment - from FMP"""
        if self.fmp:
            try:
                segments = await self.fmp.get_revenue_product_segments(symbol, period)
                if segments:
                    return segments
            except Exception as e:
                print(f"FMP product segments error: {e}")
        
        # No other provider has this data
        return []
    
    async def get_company_filings(self, symbol: str) -> List[Dict[str, Any]]:
        """Get company filings - would use SEC EDGAR"""
        # Would implement SEC EDGAR API calls here
        # For now, return empty
        return []
    
    async def get_price_target(self, symbol: str) -> Dict[str, Any]:
        """Get analyst price targets"""
        
        # Try FMP first
        if self.fmp:
            try:
                result = await self.fmp.get_analyst_estimates(symbol)
                if result and not result.get('error'):
                    # Get current price from yfinance
                    try:
                        ticker = yf.Ticker(symbol)
                        current_price = ticker.info.get("currentPrice", ticker.info.get("regularMarketPrice", 0))
                        result["currentPrice"] = current_price
                    except:
                        pass
                    return result
            except Exception as e:
                print(f"FMP price target error: {e}")
        
        # Fallback to yfinance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            return {
                "symbol": symbol,
                "currentPrice": info.get("currentPrice", info.get("regularMarketPrice", 0)),
                "targetMean": info.get("targetMeanPrice", 0),
                "targetMedian": info.get("targetMedianPrice", 0),
                "targetHigh": info.get("targetHighPrice", 0),
                "targetLow": info.get("targetLowPrice", 0),
                "numberOfAnalysts": info.get("numberOfAnalystOpinions", 0),
                "recommendation": info.get("recommendationKey", ""),
                "provider": "yfinance"
            }
        except Exception as e:
            print(f"Price target error: {e}")
            return {"symbol": symbol, "error": str(e)}
    
    # Helper method for Alpha Vantage
    async def get_income_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get income statement data from FMP"""
        if self.fmp:
            try:
                return await self.fmp.get_income_statement(symbol, period, limit)
            except Exception as e:
                print(f"FMP income statement error: {e}")
        
        return []
    
    async def get_balance_sheet(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get balance sheet data from FMP"""
        if self.fmp:
            try:
                return await self.fmp.get_balance_sheet(symbol, period, limit)
            except Exception as e:
                print(f"FMP balance sheet error: {e}")
        
        return []
    
    async def get_cash_flow_statement(
        self,
        symbol: str,
        period: str = "annual",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get cash flow statement data from FMP"""
        if self.fmp:
            try:
                return await self.fmp.get_cash_flow_statement(symbol, period, limit)
            except Exception as e:
                print(f"FMP cash flow statement error: {e}")
        
        return []
    
    async def get_analyst_ratings(self, symbol: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get analyst ratings from Benzinga"""
        if self.benzinga:
            try:
                return await self.benzinga.get_analyst_ratings(symbol, limit)
            except Exception as e:
                print(f"Benzinga analyst ratings error: {e}")
        
        return []
    
    async def get_sec_filings(self, symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get SEC filings from FMP"""
        if self.fmp:
            try:
                return await self.fmp.get_sec_filings(symbol, limit)
            except Exception as e:
                print(f"FMP SEC filings error: {e}")
        
        return []
    
    async def get_earnings_transcript(self, symbol: str, year: int, quarter: int) -> Dict[str, Any]:
        """Get earnings call transcript from API Ninjas"""
        if self.api_ninjas:
            try:
                result = await self.api_ninjas.get_earnings_transcript(symbol, year, quarter)
                if result and not result.get('error'):
                    return result
                print(f"API Ninjas earnings transcript: {result.get('error', 'No data')}")
            except Exception as e:
                print(f"API Ninjas earnings transcript error: {e}")
        
        return {"error": "Earnings transcript service not available"}
    
    async def get_earnings_transcript_dates(self, symbol: str) -> List[Dict[str, Any]]:
        """Get available earnings transcript dates from API Ninjas"""
        if self.api_ninjas:
            try:
                dates = await self.api_ninjas.get_earnings_transcript_dates(symbol)
                if dates:
                    return dates
                print(f"API Ninjas transcript dates: No data for {symbol}")
            except Exception as e:
                print(f"API Ninjas transcript dates error: {e}")
        
        return []

    async def _get_alpha_vantage_historical(self, symbol: str, start_date: Optional[date], end_date: Optional[date]) -> Dict[str, Any]:
        """Get historical data from Alpha Vantage"""
        # Would implement Alpha Vantage API call here
        # Requires additional setup
        return {"symbol": symbol, "data": [], "error": "Alpha Vantage not implemented yet"}
    
    async def get_data(self, data_type: str, symbol: str, provider: str = None, **kwargs) -> Optional[Dict[str, Any]]:
        """
        Universal data fetcher with provider selection and automatic failover
        
        Args:
            data_type: Type of data (quote, price, news, options, fundamentals, technical)
            symbol: Stock symbol
            provider: Specific provider or None for auto-selection
            **kwargs: Additional parameters for specific data types
        
        Returns:
            Data dictionary with provider information or None if all providers fail
        """
        if provider and provider in self.providers and self.providers[provider]:
            # Try specific provider
            try:
                result = await self._fetch_from_provider(provider, data_type, symbol, **kwargs)
                if result:
                    return result
            except Exception as e:
                print(f"Provider {provider} failed for {data_type}: {e}")
        
        # Auto-select providers based on data type
        provider_priority = self._get_provider_priority(data_type)
        
        for provider_name in provider_priority:
            if provider_name in self.providers and self.providers[provider_name]:
                try:
                    result = await self._fetch_from_provider(provider_name, data_type, symbol, **kwargs)
                    if result:
                        return result
                except Exception as e:
                    print(f"Provider {provider_name} failed for {data_type}: {e}")
                    continue
        
        print(f"All providers failed for {data_type} data for {symbol}")
        return None
    
    def _get_provider_priority(self, data_type: str) -> List[str]:
        """Get prioritized list of providers for specific data type"""
        priority_map = {
            'quote': ['polygon', 'alpha_vantage', 'fmp', 'yfinance'],
            'technical': ['alpha_vantage', 'polygon', 'yfinance'],
            'options': ['polygon', 'benzinga', 'yfinance'],
            'fundamentals': ['fmp', 'alpha_vantage', 'polygon'],
            'news': ['benzinga', 'polygon', 'fmp', 'alpha_vantage'],
            'insider': ['fmp', 'benzinga'],
            'price': ['polygon', 'alpha_vantage', 'fmp', 'yfinance'],
            'earnings_transcript': ['api_ninjas', 'fmp'],
        }
        
        # Return prioritized list or default order
        return priority_map.get(data_type, ['fmp', 'alpha_vantage', 'polygon', 'benzinga', 'yfinance'])
    
    async def _fetch_from_provider(self, provider: str, data_type: str, symbol: str, **kwargs) -> Optional[Dict[str, Any]]:
        """Fetch data from specific provider based on data type"""
        
        # Quote data
        if data_type == 'quote':
            if provider == 'polygon' and self.polygon:
                return await self.polygon.get_snapshot(symbol)
            elif provider == 'alpha_vantage' and self.alpha_vantage:
                return await self.alpha_vantage.get_quote(symbol)
            elif provider == 'fmp' and self.fmp:
                # FMP doesn't have get_quote yet, would need to implement
                return None
            elif provider == 'yfinance':
                return self._get_yfinance_quote(symbol)
        
        # Historical price data
        elif data_type == 'price':
            start_date = kwargs.get('start_date')
            end_date = kwargs.get('end_date')
            
            if provider == 'polygon' and self.polygon:
                return await self.polygon.get_price_historical(symbol, start_date, end_date)
            elif provider == 'alpha_vantage' and self.alpha_vantage:
                return await self.alpha_vantage.get_price_historical(symbol)
            elif provider == 'fmp' and self.fmp:
                # Would need to implement FMP historical prices
                return None
            elif provider == 'yfinance':
                return self._get_yfinance_historical(symbol, start_date, end_date)
        
        # News data
        elif data_type == 'news':
            limit = kwargs.get('limit', 10)
            
            if provider == 'benzinga' and self.benzinga:
                return await self.benzinga.get_company_news(symbol, limit=limit)
            elif provider == 'polygon' and self.polygon:
                return await self.polygon.get_company_news(symbol, limit=limit)
            elif provider == 'fmp' and self.fmp:
                # Would need to implement FMP news
                return None
        
        # Fundamentals data
        elif data_type == 'fundamentals':
            if provider == 'fmp' and self.fmp:
                return await self.fmp.get_company_profile(symbol)
            elif provider == 'alpha_vantage' and self.alpha_vantage:
                return await self.alpha_vantage.get_company_overview(symbol)
            elif provider == 'polygon' and self.polygon:
                return await self.polygon.get_ticker_details(symbol)
        
        # Earnings transcript
        elif data_type == 'earnings_transcript':
            year = kwargs.get('year')
            quarter = kwargs.get('quarter')
            
            if provider == 'api_ninjas' and self.api_ninjas:
                return await self.api_ninjas.get_earnings_transcript(symbol, year, quarter)
            elif provider == 'fmp' and self.fmp:
                return await self.fmp.get_earnings_transcript(symbol, year, quarter)
        
        # Options data
        elif data_type == 'options':
            expiration_date = kwargs.get('expiration_date')
            sentiment = kwargs.get('sentiment')
            min_volume = kwargs.get('min_volume')
            
            if provider == 'polygon' and self.polygon:
                return await self.polygon.get_options_chain(symbol, expiration_date)
            elif provider == 'benzinga' and self.benzinga:
                return await self.benzinga.get_options_activity(symbol, sentiment, min_volume)
        
        # Technical indicators
        elif data_type == 'technical':
            indicator = kwargs.get('indicator', 'SMA').upper()
            time_period = kwargs.get('time_period', 20)
            
            if provider == 'alpha_vantage' and self.alpha_vantage:
                if indicator == 'SMA':
                    return await self.alpha_vantage.get_sma(symbol, time_period)
                elif indicator == 'EMA':
                    return await self.alpha_vantage.get_ema(symbol, time_period)
                elif indicator == 'RSI':
                    return await self.alpha_vantage.get_rsi(symbol, time_period)
                elif indicator == 'MACD':
                    fast_period = kwargs.get('fast_period', 12)
                    slow_period = kwargs.get('slow_period', 26)
                    signal_period = kwargs.get('signal_period', 9)
                    return await self.alpha_vantage.get_macd(symbol, fast_period, slow_period, signal_period)
                elif indicator == 'BBANDS':
                    return await self.alpha_vantage.get_bollinger_bands(symbol, time_period)
                elif indicator == 'STOCH':
                    return await self.alpha_vantage.get_stochastic(symbol)
        
        return None
    
    def _get_yfinance_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get quote data from yfinance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            if 'regularMarketPrice' in info:
                return {
                    'symbol': symbol,
                    'price': info.get('regularMarketPrice', 0),
                    'open': info.get('regularMarketOpen', 0),
                    'high': info.get('dayHigh', 0),
                    'low': info.get('dayLow', 0),
                    'volume': info.get('volume', 0),
                    'previous_close': info.get('previousClose', 0),
                    'change': info.get('regularMarketPrice', 0) - info.get('previousClose', 0),
                    'change_percent': ((info.get('regularMarketPrice', 0) - info.get('previousClose', 0)) / info.get('previousClose', 1)) * 100,
                    'provider': 'yfinance'
                }
            return None
        except Exception as e:
            print(f"yfinance quote error: {e}")
            return None