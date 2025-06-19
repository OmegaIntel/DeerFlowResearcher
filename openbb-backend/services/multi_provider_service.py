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
    
    async def get_company_news(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get company news - tries Benzinga first, then other providers"""
        
        # Try Benzinga first (has links and full content)
        if self.benzinga:
            try:
                news = await self.benzinga.get_company_news(symbol, start_date, end_date, limit)
                if news:
                    return news
            except Exception as e:
                print(f"Benzinga news error: {e}")
        
        # Try Polygon second (good news API)
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
                    pub_time = datetime.fromtimestamp(item.get("providerPublishTime", 0))
                    
                    # Filter by date if provided
                    if start_date and pub_time.date() < start_date:
                        continue
                    if end_date and pub_time.date() > end_date:
                        continue
                    
                    formatted_news.append({
                        "title": item.get("title", ""),
                        "url": item.get("link", ""),
                        "published": pub_time.isoformat(),
                        "source": item.get("publisher", ""),
                        "summary": item.get("summary", "")[:200] + "..." if len(item.get("summary", "")) > 200 else item.get("summary", ""),
                        "provider": "yfinance"
                    })
                
                return formatted_news
        except Exception as e:
            print(f"YFinance news error: {e}")
        
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
        """Get management team - requires FMP or similar provider"""
        # Try FMP if available
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
        
        # No other provider has management data
        return []
    
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