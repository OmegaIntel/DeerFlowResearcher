"""
Polygon.io API integration
"""
import os
import requests
import aiohttp
from typing import Optional, Dict, Any, List
from datetime import date, datetime, timedelta
import pandas as pd

class PolygonService:
    def __init__(self):
        self.api_key = os.getenv('POLYGON_API_KEY')
        self.base_url = 'https://api.polygon.io'
        
    async def get_price_historical(
        self, 
        symbol: str,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        timespan: str = 'day'
    ) -> Dict[str, Any]:
        """Get historical prices from Polygon"""
        try:
            if not end_date:
                end_date = date.today()
            if not start_date:
                start_date = end_date - timedelta(days=30)
            
            url = f"{self.base_url}/v2/aggs/ticker/{symbol}/range/1/{timespan}/{start_date}/{end_date}"
            params = {
                'apiKey': self.api_key,
                'adjusted': 'true',
                'sort': 'asc'
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == 'OK' and 'results' in data:
                price_data = []
                for bar in data['results']:
                    price_data.append({
                        'date': datetime.fromtimestamp(bar['t'] / 1000).strftime('%Y-%m-%d'),
                        'open': bar['o'],
                        'high': bar['h'],
                        'low': bar['l'],
                        'close': bar['c'],
                        'volume': bar['v']
                    })
                
                return {
                    'symbol': symbol,
                    'data': price_data,
                    'count': len(price_data),
                    'provider': 'polygon'
                }
            
            return {'symbol': symbol, 'data': [], 'error': data.get('message', 'No data')}
            
        except Exception as e:
            print(f"Polygon error: {e}")
            return {'symbol': symbol, 'data': [], 'error': str(e)}
    
    async def get_ticker_details(self, symbol: str) -> Dict[str, Any]:
        """Get ticker details"""
        try:
            url = f"{self.base_url}/v3/reference/tickers/{symbol}"
            params = {'apiKey': self.api_key}
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == 'OK' and 'results' in data:
                results = data['results']
                return {
                    'symbol': symbol,
                    'name': results.get('name'),
                    'market': results.get('market'),
                    'locale': results.get('locale'),
                    'type': results.get('type'),
                    'active': results.get('active'),
                    'currency': results.get('currency_name'),
                    'description': results.get('description', ''),
                    'homepage': results.get('homepage_url'),
                    'marketCap': results.get('market_cap', 0),
                    'provider': 'polygon'
                }
            
            return {'symbol': symbol, 'error': 'No data available'}
            
        except Exception as e:
            print(f"Polygon ticker details error: {e}")
            return {'symbol': symbol, 'error': str(e)}
    
    async def get_company_news(
        self,
        symbol: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get company news"""
        try:
            url = f"{self.base_url}/v2/reference/news"
            params = {
                'apiKey': self.api_key,
                'ticker': symbol,
                'limit': limit,
                'sort': 'published_utc',
                'order': 'desc'
            }
            
            response = requests.get(url, params=params)
            data = response.json()
            
            if data.get('status') == 'OK' and 'results' in data:
                news_items = []
                for item in data['results']:
                    news_items.append({
                        'title': item.get('title'),
                        'url': item.get('article_url'),
                        'published': item.get('published_utc'),
                        'source': item.get('publisher', {}).get('name', 'Unknown'),
                        'summary': item.get('description', ''),
                        'tickers': item.get('tickers', []),
                        'provider': 'polygon'
                    })
                
                return news_items
            
            return []
            
        except Exception as e:
            print(f"Polygon news error: {e}")
            return []
    
    async def get_snapshot(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time snapshot for a stock"""
        try:
            url = f"{self.base_url}/v2/snapshot/locale/us/markets/stocks/tickers/{symbol}"
            params = {'apiKey': self.api_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('status') == 'OK' and 'ticker' in data:
                            ticker_data = data['ticker']
                            day_data = ticker_data.get('day', {})
                            prev_day = ticker_data.get('prevDay', {})
                            
                            return {
                                'symbol': ticker_data.get('ticker'),
                                'price': day_data.get('c', 0),
                                'open': day_data.get('o', 0),
                                'high': day_data.get('h', 0),
                                'low': day_data.get('l', 0),
                                'volume': day_data.get('v', 0),
                                'vwap': day_data.get('vw', 0),
                                'previous_close': prev_day.get('c', 0),
                                'change': ticker_data.get('todaysChange', 0),
                                'change_percent': ticker_data.get('todaysChangePerc', 0),
                                'updated': ticker_data.get('updated'),
                                'provider': 'polygon'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Polygon snapshot error: {e}")
            return None
    
    async def get_last_trade(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get the last trade for a symbol"""
        try:
            url = f"{self.base_url}/v2/last/trade/{symbol}"
            params = {'apiKey': self.api_key}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('status') == 'OK' and 'results' in data:
                            result = data['results']
                            
                            return {
                                'symbol': result.get('T'),
                                'price': result.get('p'),
                                'size': result.get('s'),
                                'timestamp': result.get('t'),
                                'exchange': result.get('x'),
                                'conditions': result.get('c', []),
                                'provider': 'polygon'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Polygon last trade error: {e}")
            return None
    
    async def get_options_chain(self, symbol: str, expiration_date: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Get options chain for a symbol"""
        try:
            url = f"{self.base_url}/v3/snapshot/options/{symbol}"
            params = {'apiKey': self.api_key}
            
            if expiration_date:
                params['expiration_date'] = expiration_date
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get('status') == 'OK' and 'results' in data:
                            contracts = []
                            
                            for contract in data['results']:
                                contracts.append({
                                    'contract_type': contract.get('details', {}).get('contract_type', contract.get('contract_type')),
                                    'strike': contract.get('details', {}).get('strike_price', contract.get('strike_price')),
                                    'expiration': contract.get('details', {}).get('expiration_date', contract.get('expiration_date')),
                                    'ticker': contract.get('ticker'),
                                    'last_price': contract.get('day', {}).get('close', 0),
                                    'bid': contract.get('day', {}).get('close', 0) - 0.05,  # Mock bid
                                    'ask': contract.get('day', {}).get('close', 0) + 0.05,  # Mock ask
                                    'volume': contract.get('day', {}).get('volume', 0),
                                    'open_interest': contract.get('open_interest', 0),
                                    'implied_volatility': contract.get('implied_volatility', 0),
                                    'delta': contract.get('greeks', {}).get('delta', 0),
                                    'gamma': contract.get('greeks', {}).get('gamma', 0),
                                    'theta': contract.get('greeks', {}).get('theta', 0),
                                    'vega': contract.get('greeks', {}).get('vega', 0),
                                    'provider': 'polygon'
                                })
                            
                            return {
                                'symbol': symbol,
                                'contracts': contracts,
                                'provider': 'polygon'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Polygon options chain error: {e}")
            return None
    
    async def get_unusual_options_activity(self, symbol: str, min_volume: int = 1000) -> Optional[Dict[str, Any]]:
        """Get unusual options activity for a symbol"""
        try:
            # First get the options chain
            options_data = await self.get_options_chain(symbol)
            
            if not options_data or not options_data.get('contracts'):
                return None
            
            unusual_activity = []
            
            for contract in options_data['contracts']:
                volume = contract.get('volume', 0)
                open_interest = contract.get('open_interest', 1)  # Avoid division by zero
                implied_volatility = contract.get('implied_volatility', 0)
                
                # Calculate volume to open interest ratio
                volume_ratio = volume / open_interest if open_interest > 0 else 0
                
                # Flag as unusual if high volume, high vol/oi ratio, or high IV
                if (volume >= min_volume and 
                    (volume_ratio > 2.0 or implied_volatility > 0.4)):
                    
                    unusual_activity.append({
                        **contract,
                        'volume_ratio': volume_ratio,
                        'unusual_score': volume_ratio * (1 + implied_volatility)
                    })
            
            # Sort by unusual score
            unusual_activity.sort(key=lambda x: x['unusual_score'], reverse=True)
            
            return {
                'symbol': symbol,
                'unusual_activity': unusual_activity,
                'provider': 'polygon'
            }
        except Exception as e:
            print(f"Polygon unusual options activity error: {e}")
            return None