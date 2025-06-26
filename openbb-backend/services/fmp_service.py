"""
Financial Modeling Prep API integration
"""
import os
import requests
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import pandas as pd

class FMPService:
    def __init__(self):
        self.api_key = os.getenv('FMP_API_KEY')
        self.base_url = 'https://financialmodelingprep.com/api/v3'
        
    async def get_company_profile(self, symbol: str) -> Dict[str, Any]:
        """Get company profile"""
        try:
            url = f"{self.base_url}/profile/{symbol}"
            params = {'apikey': self.api_key}
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list) and len(data) > 0:
                profile = data[0]
                return {
                    'symbol': profile.get('symbol'),
                    'name': profile.get('companyName'),
                    'description': profile.get('description'),
                    'sector': profile.get('sector'),
                    'industry': profile.get('industry'),
                    'marketCap': profile.get('mktCap', 0),
                    'employees': profile.get('fullTimeEmployees', 0),
                    'website': profile.get('website'),
                    'exchange': profile.get('exchangeShortName'),
                    'country': profile.get('country'),
                    'currency': profile.get('currency'),
                    'ceo': profile.get('ceo'),
                    'price': profile.get('price', 0),
                    'beta': profile.get('beta', 0),
                    'pe': profile.get('pe', 0),
                    'provider': 'fmp'
                }
            
            return {'symbol': symbol, 'error': 'No data available'}
            
        except Exception as e:
            print(f"FMP profile error: {e}")
            return {'symbol': symbol, 'error': str(e)}
    
    async def get_key_executives(self, symbol: str) -> List[Dict[str, Any]]:
        """Get management team"""
        try:
            # First try the key-executives endpoint (requires paid subscription)
            url = f"{self.base_url}/key-executives/{symbol}"
            params = {'apikey': self.api_key}
            
            response = requests.get(url, params=params)
            
            # Check if we have access to the endpoint
            if response.status_code == 200:
                data = response.json()
                
                if data and isinstance(data, list):
                    executives = []
                    for exec in data[:10]:  # Limit to top 10
                        executives.append({
                            'name': exec.get('name'),
                            'title': exec.get('title'),
                            'pay': exec.get('pay', 0),
                            'currencyPay': exec.get('currencyPay', 'USD'),
                            'gender': exec.get('gender'),
                            'yearBorn': exec.get('yearBorn'),
                            'titleSince': exec.get('titleSince')
                        })
                    
                    return executives
            
            # If key-executives endpoint fails (403 or other error), 
            # fall back to company profile which includes CEO info
            profile_url = f"{self.base_url}/profile/{symbol}"
            profile_response = requests.get(profile_url, params=params)
            
            if profile_response.status_code == 200:
                profile_data = profile_response.json()
                
                if profile_data and isinstance(profile_data, list) and len(profile_data) > 0:
                    profile = profile_data[0]
                    executives = []
                    
                    # Add CEO if available
                    if profile.get('ceo'):
                        executives.append({
                            'name': profile.get('ceo'),
                            'title': 'Chief Executive Officer',
                            'pay': 0,  # Not available in profile
                            'currencyPay': 'USD',
                            'gender': None,
                            'yearBorn': None,
                            'titleSince': None
                        })
                    
                    # Note: Profile endpoint only provides CEO info
                    # For a complete management team, a paid subscription is needed
                    
                    return executives
            
            return []
            
        except Exception as e:
            print(f"FMP executives error: {e}")
            return []
    
    async def get_key_metrics(self, symbol: str, period: str = 'annual', limit: int = 10) -> List[Dict[str, Any]]:
        """Get key financial metrics"""
        try:
            url = f"{self.base_url}/key-metrics/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                metrics = []
                for item in data:
                    metrics.append({
                        'date': item.get('date'),
                        'period': item.get('period'),
                        'marketCap': item.get('marketCap'),
                        'enterpriseValue': item.get('enterpriseValue'),
                        'peRatio': item.get('peRatio'),
                        'priceToSalesRatio': item.get('priceToSalesRatio'),
                        'priceToBookRatio': item.get('pbRatio'),
                        'evToSales': item.get('evToSales'),
                        'evToEbitda': item.get('evToOperatingCashFlow'),
                        'debtToEquity': item.get('debtToEquity'),
                        'currentRatio': item.get('currentRatio'),
                        'roe': item.get('roe'),
                        'roa': item.get('roa'),
                        'provider': 'fmp'
                    })
                
                return metrics
            
            return []
            
        except Exception as e:
            print(f"FMP metrics error: {e}")
            return []
    
    async def get_financial_growth(self, symbol: str, period: str = 'annual', limit: int = 5) -> List[Dict[str, Any]]:
        """Get revenue and earnings growth data"""
        try:
            url = f"{self.base_url}/financial-growth/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                return data
            
            return []
            
        except Exception as e:
            print(f"FMP growth error: {e}")
            return []
    
    async def get_analyst_estimates(self, symbol: str) -> Dict[str, Any]:
        """Get analyst price targets and recommendations"""
        try:
            url = f"{self.base_url}/analyst-price-target/{symbol}"
            params = {'apikey': self.api_key}
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list) and len(data) > 0:
                targets = data[0]
                return {
                    'symbol': symbol,
                    'targetHigh': targets.get('targetHigh', 0),
                    'targetLow': targets.get('targetLow', 0),
                    'targetMean': targets.get('targetMean', 0),
                    'targetMedian': targets.get('targetMedian', 0),
                    'lastUpdated': targets.get('lastUpdated'),
                    'analysts': targets.get('analysts', 0),
                    'provider': 'fmp'
                }
            
            return {'symbol': symbol, 'error': 'No analyst data'}
            
        except Exception as e:
            print(f"FMP analyst estimates error: {e}")
            return {'symbol': symbol, 'error': str(e)}
    
    async def get_share_float(self, symbol: str) -> Dict[str, Any]:
        """Get share float and ownership data"""
        try:
            url = f"{self.base_url}/shares_float/{symbol}"
            params = {'apikey': self.api_key}
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list) and len(data) > 0:
                float_data = data[0]
                return {
                    'symbol': symbol,
                    'date': float_data.get('date'),
                    'freeFloat': float_data.get('freeFloat', 0),
                    'floatShares': float_data.get('floatShares', 0),
                    'outstandingShares': float_data.get('outstandingShares', 0),
                    'source': float_data.get('source'),
                    'provider': 'fmp'
                }
            
            return {'symbol': symbol, 'error': 'No share float data'}
            
        except Exception as e:
            print(f"FMP share float error: {e}")
            return {'symbol': symbol, 'error': str(e)}
    
    async def get_revenue_geographic_segments(self, symbol: str, period: str = 'annual') -> List[Dict[str, Any]]:
        """Get revenue breakdown by geography"""
        try:
            url = f"{self.base_url}/revenue-geographic-segmentation/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                return data
            
            return []
            
        except Exception as e:
            print(f"FMP geographic segments error: {e}")
            return []
    
    async def get_revenue_product_segments(self, symbol: str, period: str = 'annual') -> List[Dict[str, Any]]:
        """Get revenue breakdown by product/business line"""
        try:
            url = f"{self.base_url}/revenue-product-segmentation/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                return data
            
            return []
            
        except Exception as e:
            print(f"FMP product segments error: {e}")
            return []
    
    async def get_income_statement(self, symbol: str, period: str = 'annual', limit: int = 10) -> List[Dict[str, Any]]:
        """Get income statement data"""
        try:
            url = f"{self.base_url}/income-statement/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                return data
            
            return []
            
        except Exception as e:
            print(f"FMP income statement error: {e}")
            return []
    
    async def get_balance_sheet(self, symbol: str, period: str = 'annual', limit: int = 10) -> List[Dict[str, Any]]:
        """Get balance sheet data"""
        try:
            url = f"{self.base_url}/balance-sheet-statement/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                return data
            
            return []
            
        except Exception as e:
            print(f"FMP balance sheet error: {e}")
            return []
    
    async def get_cash_flow_statement(self, symbol: str, period: str = 'annual', limit: int = 10) -> List[Dict[str, Any]]:
        """Get cash flow statement data"""
        try:
            url = f"{self.base_url}/cash-flow-statement/{symbol}"
            params = {
                'apikey': self.api_key,
                'period': period,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                return data
            
            return []
            
        except Exception as e:
            print(f"FMP cash flow statement error: {e}")
            return []
    
    async def get_sec_filings(self, symbol: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get SEC filings for a company"""
        try:
            url = f"{self.base_url}/sec_filings/{symbol}"
            params = {
                'apikey': self.api_key,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if not isinstance(data, list):
                return []
            
            filings = []
            for item in data:
                filing = {
                    'date': item.get('fillingDate', ''),
                    'cik': item.get('cik', ''),
                    'type': item.get('type', ''),
                    'url': item.get('finalLink', item.get('link', '')),
                    'provider': 'fmp'
                }
                filings.append(filing)
            
            return filings
            
        except Exception as e:
            print(f"FMP SEC filings error: {e}")
            return []
    
    async def get_earnings_transcript(self, symbol: str, year: int, quarter: int) -> Dict[str, Any]:
        """Get earnings call transcript for a specific quarter and year"""
        try:
            url = f"{self.base_url}/earning_call_transcript/{symbol}"
            params = {
                "quarter": quarter,
                "year": year,
                "apikey": self.api_key
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and len(data) > 0:
                transcript = data[0]  # FMP returns array with single transcript
                
                return {
                    "symbol": transcript.get("symbol", symbol),
                    "quarter": transcript.get("quarter", quarter),
                    "year": transcript.get("year", year),
                    "date": transcript.get("date", ""),
                    "content": transcript.get("content", ""),
                    "provider": "fmp"
                }
            else:
                return {"error": "No transcript data found"}
                
        except Exception as e:
            print(f"FMP earnings transcript error: {e}")
            return {"error": f"Failed to fetch earnings transcript: {str(e)}"}
    
    async def get_earnings_transcript_dates(self, symbol: str) -> List[Dict[str, Any]]:
        """Get available earnings transcript dates for a symbol"""
        try:
            # Use v4 API for transcript dates
            url = f"https://financialmodelingprep.com/api/v4/earning_call_transcript"
            params = {
                "symbol": symbol,
                "apikey": self.api_key
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            # Transform to our expected format
            if isinstance(data, list):
                return [
                    {
                        "symbol": item.get("symbol", symbol),
                        "year": item.get("year"),
                        "quarter": item.get("quarter"),
                        "date": item.get("date", "")
                    }
                    for item in data
                ]
            else:
                return []
                
        except Exception as e:
            print(f"FMP transcript dates error: {e}")
            return []
    
    async def get_company_news(
        self,
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get company news from FMP"""
        try:
            url = f"{self.base_url}/stock_news"
            params = {
                'apikey': self.api_key,
                'tickers': symbol,
                'limit': limit
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data and isinstance(data, list):
                formatted_news = []
                for item in data:
                    # Parse the published date
                    pub_date = item.get('publishedDate', '')
                    if pub_date:
                        try:
                            pub_datetime = datetime.strptime(pub_date, '%Y-%m-%d %H:%M:%S')
                        except:
                            pub_datetime = datetime.now()
                    else:
                        pub_datetime = datetime.now()
                    
                    # Filter by date if provided
                    if start_date and pub_datetime.date() < start_date:
                        continue
                    if end_date and pub_datetime.date() > end_date:
                        continue
                    
                    formatted_news.append({
                        "title": item.get("title", ""),
                        "url": item.get("url", ""),
                        "published": pub_datetime.isoformat(),
                        "source": item.get("site", ""),
                        "summary": item.get("text", "")[:200] + "..." if len(item.get("text", "")) > 200 else item.get("text", ""),
                        "symbol": item.get("symbol", symbol),
                        "image": item.get("image", ""),
                        "provider": "fmp"
                    })
                
                return formatted_news[:limit]
            
            return []
                
        except Exception as e:
            print(f"FMP news error: {e}")
            return []