"""
OpenBB Platform Integration Service

This service provides a unified interface to OpenBB's functionality
while using custom API keys instead of OpenBB PAT token.
"""
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, date
import asyncio
from functools import lru_cache

try:
    from openbb import obb
    OPENBB_AVAILABLE = True
except ImportError:
    OPENBB_AVAILABLE = False
    print("Warning: OpenBB not installed. Install with: pip install openbb")

class OpenBBIntegration:
    def __init__(self):
        """Initialize OpenBB with custom API keys"""
        self.obb = None
        if OPENBB_AVAILABLE:
            self._configure_providers()
            self.obb = obb
    
    def _configure_providers(self):
        """Configure all provider API keys"""
        # Set provider credentials from environment
        provider_configs = {
            'fmp_api_key': os.getenv('FMP_API_KEY'),
            'polygon_api_key': os.getenv('POLYGON_API_KEY'),
            'alpha_vantage_api_key': os.getenv('ALPHA_VANTAGE_API_KEY'),
            'benzinga_api_key': os.getenv('BENZINGA_API_KEY'),
            'fred_api_key': os.getenv('FRED_API_KEY'),
            'intrinio_api_key': os.getenv('INTRINIO_API_KEY'),
            'tiingo_api_key': os.getenv('TIINGO_API_KEY'),
            'tradingeconomics_api_key': os.getenv('TRADINGECONOMICS_API_KEY'),
        }
        
        # Configure OpenBB with credentials
        if OPENBB_AVAILABLE:
            for key, value in provider_configs.items():
                if value:
                    setattr(obb.user.credentials, key, value)
    
    # Company Information Methods
    async def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """Get comprehensive company profile using OpenBB"""
        if not OPENBB_AVAILABLE:
            return {'error': 'OpenBB not available'}
        
        try:
            # Use OpenBB's equity profile endpoint
            result = self.obb.equity.profile(symbol=symbol, provider='fmp')
            if result and hasattr(result, 'results'):
                data = result.results[0] if result.results else {}
                return {
                    'symbol': data.get('symbol', symbol),
                    'name': data.get('name'),
                    'description': data.get('description'),
                    'sector': data.get('sector'),
                    'industry': data.get('industry'),
                    'marketCap': data.get('market_cap'),
                    'employees': data.get('employees'),
                    'website': data.get('website'),
                    'exchange': data.get('exchange'),
                    'country': data.get('country'),
                    'ceo': data.get('ceo'),
                    'address': data.get('address'),
                    'phone': data.get('phone'),
                    'provider': 'openbb_fmp'
                }
            return {'symbol': symbol, 'error': 'No data available'}
        except Exception as e:
            print(f"OpenBB profile error: {e}")
            return {'symbol': symbol, 'error': str(e)}
    
    async def get_key_executives(self, symbol: str) -> List[Dict[str, Any]]:
        """Get management team using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.equity.management(symbol=symbol, provider='fmp')
            if result and hasattr(result, 'results'):
                executives = []
                for exec in result.results[:10]:  # Limit to top 10
                    executives.append({
                        'name': exec.get('name'),
                        'title': exec.get('title'),
                        'pay': exec.get('total_pay', 0),
                        'currency': exec.get('currency_pay', 'USD'),
                        'yearBorn': exec.get('year_born'),
                        'titleSince': exec.get('title_since')
                    })
                return executives
            return []
        except Exception as e:
            print(f"OpenBB executives error: {e}")
            return []
    
    # Market Data Methods
    async def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get real-time quote using OpenBB"""
        if not OPENBB_AVAILABLE:
            return {}
        
        try:
            result = self.obb.equity.quote(symbol=symbol, provider='fmp')
            if result and hasattr(result, 'results'):
                quote = result.results[0] if result.results else {}
                return {
                    'symbol': symbol,
                    'price': quote.get('price'),
                    'change': quote.get('change'),
                    'changePercent': quote.get('change_percent'),
                    'volume': quote.get('volume'),
                    'high': quote.get('high'),
                    'low': quote.get('low'),
                    'open': quote.get('open'),
                    'previousClose': quote.get('previous_close'),
                    'marketCap': quote.get('market_cap'),
                    'provider': 'openbb_fmp'
                }
            return {}
        except Exception as e:
            print(f"OpenBB quote error: {e}")
            return {}
    
    async def get_historical_data(
        self, 
        symbol: str, 
        start_date: str, 
        end_date: str,
        interval: str = '1d'
    ) -> List[Dict[str, Any]]:
        """Get historical price data using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.equity.historical(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                interval=interval,
                provider='polygon'
            )
            
            if result and hasattr(result, 'results'):
                return [{
                    'date': item.get('date'),
                    'open': item.get('open'),
                    'high': item.get('high'),
                    'low': item.get('low'),
                    'close': item.get('close'),
                    'volume': item.get('volume'),
                    'provider': 'openbb_polygon'
                } for item in result.results]
            return []
        except Exception as e:
            print(f"OpenBB historical error: {e}")
            return []
    
    # Financial Data Methods
    async def get_financial_metrics(self, symbol: str) -> List[Dict[str, Any]]:
        """Get key financial metrics using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.equity.metrics(symbol=symbol, provider='fmp')
            if result and hasattr(result, 'results'):
                return [{
                    'date': item.get('date'),
                    'marketCap': item.get('market_cap'),
                    'enterpriseValue': item.get('enterprise_value'),
                    'peRatio': item.get('pe_ratio'),
                    'priceToSales': item.get('price_to_sales_ratio'),
                    'priceToBook': item.get('price_to_book_ratio'),
                    'evToSales': item.get('ev_to_sales'),
                    'evToEbitda': item.get('ev_to_ebitda'),
                    'debtToEquity': item.get('debt_to_equity'),
                    'currentRatio': item.get('current_ratio'),
                    'provider': 'openbb_fmp'
                } for item in result.results[:10]]
            return []
        except Exception as e:
            print(f"OpenBB metrics error: {e}")
            return []
    
    # News Methods
    async def get_company_news(
        self, 
        symbol: str, 
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get company news using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.news.company(
                symbol=symbol,
                start_date=start_date,
                end_date=end_date,
                limit=limit,
                provider='benzinga'
            )
            
            if result and hasattr(result, 'results'):
                return [{
                    'title': item.get('title'),
                    'url': item.get('url'),
                    'published': item.get('date'),
                    'source': item.get('source', 'Benzinga'),
                    'summary': item.get('text', '')[:200],
                    'provider': 'openbb_benzinga'
                } for item in result.results]
            return []
        except Exception as e:
            print(f"OpenBB news error: {e}")
            return []
    
    # Technical Analysis Methods
    async def get_technical_indicators(self, symbol: str) -> Dict[str, Any]:
        """Get technical indicators using OpenBB"""
        if not OPENBB_AVAILABLE:
            return {}
        
        try:
            # Get various technical indicators
            sma_result = self.obb.technical.sma(
                symbol=symbol,
                interval='1d',
                provider='fmp'
            )
            
            rsi_result = self.obb.technical.rsi(
                symbol=symbol,
                interval='1d',
                provider='fmp'
            )
            
            return {
                'sma': sma_result.results if sma_result else [],
                'rsi': rsi_result.results if rsi_result else [],
                'provider': 'openbb_technical'
            }
        except Exception as e:
            print(f"OpenBB technical error: {e}")
            return {}
    
    # Multi-Asset Support Methods
    async def get_crypto_quote(self, symbol: str) -> Dict[str, Any]:
        """Get cryptocurrency quote using OpenBB"""
        if not OPENBB_AVAILABLE:
            return {}
        
        try:
            result = self.obb.crypto.quote(symbol=symbol, provider='polygon')
            if result and hasattr(result, 'results'):
                return result.results[0] if result.results else {}
            return {}
        except Exception as e:
            print(f"OpenBB crypto error: {e}")
            return {}
    
    async def get_forex_quote(self, symbol: str) -> Dict[str, Any]:
        """Get forex quote using OpenBB"""
        if not OPENBB_AVAILABLE:
            return {}
        
        try:
            result = self.obb.currency.quote(symbol=symbol, provider='polygon')
            if result and hasattr(result, 'results'):
                return result.results[0] if result.results else {}
            return {}
        except Exception as e:
            print(f"OpenBB forex error: {e}")
            return {}
    
    # Economic Data Methods
    async def get_economic_calendar(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get economic calendar events using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.economy.calendar(
                start_date=start_date,
                end_date=end_date,
                provider='fmp'
            )
            
            if result and hasattr(result, 'results'):
                return result.results
            return []
        except Exception as e:
            print(f"OpenBB calendar error: {e}")
            return []
    
    # ETF Methods
    async def get_etf_holdings(self, symbol: str) -> List[Dict[str, Any]]:
        """Get ETF holdings using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.etf.holdings(symbol=symbol, provider='fmp')
            if result and hasattr(result, 'results'):
                return result.results
            return []
        except Exception as e:
            print(f"OpenBB ETF error: {e}")
            return []
    
    # Advanced Analytics Methods
    async def get_options_chain(self, symbol: str) -> Dict[str, Any]:
        """Get options chain using OpenBB"""
        if not OPENBB_AVAILABLE:
            return {}
        
        try:
            result = self.obb.derivatives.options.chains(
                symbol=symbol,
                provider='polygon'
            )
            
            if result and hasattr(result, 'results'):
                return {
                    'calls': [opt for opt in result.results if opt.get('option_type') == 'call'],
                    'puts': [opt for opt in result.results if opt.get('option_type') == 'put'],
                    'provider': 'openbb_polygon'
                }
            return {}
        except Exception as e:
            print(f"OpenBB options error: {e}")
            return {}
    
    async def get_insider_trading(self, symbol: str) -> List[Dict[str, Any]]:
        """Get insider trading data using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.equity.ownership.insider_trading(
                symbol=symbol,
                provider='fmp'
            )
            
            if result and hasattr(result, 'results'):
                return result.results
            return []
        except Exception as e:
            print(f"OpenBB insider trading error: {e}")
            return []
    
    async def get_institutional_ownership(self, symbol: str) -> List[Dict[str, Any]]:
        """Get institutional ownership using OpenBB"""
        if not OPENBB_AVAILABLE:
            return []
        
        try:
            result = self.obb.equity.ownership.institutional(
                symbol=symbol,
                provider='fmp'
            )
            
            if result and hasattr(result, 'results'):
                return result.results
            return []
        except Exception as e:
            print(f"OpenBB institutional ownership error: {e}")
            return []

# Singleton instance
openbb_integration = OpenBBIntegration()