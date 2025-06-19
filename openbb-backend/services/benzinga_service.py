"""
Benzinga News API integration
"""
import os
import requests
import aiohttp
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import urllib.parse
import xml.etree.ElementTree as ET

class BenzingaService:
    def __init__(self):
        self.api_key = os.getenv('BENZINGA_API_KEY')
        self.base_url = 'https://api.benzinga.com/api/v2'
        
    async def get_company_news(
        self, 
        symbol: str, 
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get company news from Benzinga"""
        try:
            # If no API key, return empty list
            if not self.api_key:
                print("No Benzinga API key found")
                return []
                
            url = f"{self.base_url}/news"
            params = {
                'token': self.api_key,
                'symbols': symbol,
                'pageSize': limit,
                'displayOutput': 'full'
            }
            
            if start_date:
                params['dateFrom'] = start_date.strftime('%Y-%m-%d')
            if end_date:
                params['dateTo'] = end_date.strftime('%Y-%m-%d')
            
            response = requests.get(url, params=params)
            
            if response.status_code != 200:
                print(f"Benzinga API error: {response.status_code} - {response.text[:200]}")
                return []
                
            # Benzinga returns XML, not JSON
            try:
                root = ET.fromstring(response.text)
                news_items = []
                
                # Find all item elements
                for item in root.findall('.//item'):
                    # Parse each news item
                    article = {
                        'id': item.findtext('id', ''),
                        'title': item.findtext('title', ''),
                        'url': item.findtext('url', ''),
                        'published': item.findtext('created', ''),
                        'updated': item.findtext('updated', ''),
                        'source': 'Benzinga',
                        'summary': item.findtext('teaser', ''),
                        'body': item.findtext('body', ''),
                        'provider': 'benzinga'
                    }
                    
                    # Parse stocks if available
                    stocks_elem = item.find('stocks')
                    if stocks_elem is not None:
                        stocks = []
                        for stock in stocks_elem.findall('stock'):
                            stock_name = stock.findtext('name', '')
                            if stock_name:
                                stocks.append(stock_name)
                        article['stocks'] = stocks
                    else:
                        article['stocks'] = []
                    
                    # Parse channels if available
                    channels_elem = item.find('channels')
                    if channels_elem is not None:
                        channels = []
                        for channel in channels_elem.findall('channel'):
                            channel_name = channel.findtext('name', '')
                            if channel_name:
                                channels.append(channel_name)
                        article['channels'] = channels
                    else:
                        article['channels'] = []
                    
                    news_items.append(article)
                
                return news_items
                
            except Exception as e:
                print(f"Benzinga XML parse error: {e}")
                return []
            
        except Exception as e:
            print(f"Benzinga news error: {e}")
            return []
    
    async def get_market_news(
        self,
        topics: Optional[List[str]] = None,
        channels: Optional[List[str]] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get general market news"""
        try:
            if not self.api_key:
                return []
                
            url = f"{self.base_url}/news"
            params = {
                'token': self.api_key,
                'pageSize': limit,
                'displayOutput': 'full'
            }
            
            if topics:
                params['topics'] = ','.join(topics)
            if channels:
                params['channels'] = ','.join(channels)
            
            response = requests.get(url, params=params)
            
            if response.status_code != 200:
                return []
                
            data = response.json()
            
            news_items = []
            for article in data:
                news_items.append({
                    'id': article.get('id'),
                    'title': article.get('title'),
                    'url': article.get('url'),
                    'published': article.get('created'),
                    'source': 'Benzinga',
                    'summary': article.get('teaser', ''),
                    'channels': article.get('channels', []),
                    'provider': 'benzinga'
                })
            
            return news_items
            
        except Exception as e:
            print(f"Benzinga market news error: {e}")
            return []
    
    async def get_analyst_ratings(
        self,
        symbol: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Get analyst ratings and price targets from Benzinga"""
        try:
            if not self.api_key:
                print("No Benzinga API key found")
                return []
                
            url = f"{self.base_url}/ratings"
            params = {
                'token': self.api_key,
                'symbols': symbol,
                'pageSize': limit
            }
            
            response = requests.get(url, params=params)
            
            if response.status_code != 200:
                print(f"Benzinga ratings API error: {response.status_code}")
                return []
            
            data = response.json()
            
            ratings = []
            for item in data.get('ratings', []):
                # Calculate percentage from current price
                current_price = item.get('price_when_rated', 0)
                adjusted_pt = item.get('adjusted_pt_current', 0)
                
                percentage = 0
                if current_price > 0 and adjusted_pt > 0:
                    percentage = ((adjusted_pt - current_price) / current_price) * 100
                
                rating = {
                    'date': item.get('date'),
                    'analyst_name': item.get('analyst_name', ''),
                    'firm_name': item.get('ratings_firm', ''),
                    'adjusted_price_target': adjusted_pt,
                    'adjusted_previous_price_target': item.get('adjusted_pt_prior', 0),
                    'rating_change': item.get('action_pt', 'Maintains'),
                    'current_rating': item.get('rating_current', ''),
                    'previous_rating': item.get('rating_prior', ''),
                    'percentage': round(percentage, 0),
                    'provider': 'benzinga'
                }
                ratings.append(rating)
            
            return ratings
            
        except Exception as e:
            print(f"Benzinga ratings error: {e}")
            return []
    
    async def get_options_activity(
        self, 
        symbol: str,
        sentiment: Optional[str] = None,
        min_volume: Optional[int] = None
    ) -> Optional[List[Dict[str, Any]]]:
        """Get unusual options activity from Benzinga"""
        try:
            if not self.api_key:
                print("No Benzinga API key found")
                return None
                
            url = f"{self.base_url}/options/activity"
            params = {
                'token': self.api_key,
                'symbols': symbol,
                'pageSize': 100
            }
            
            if sentiment:
                params['sentiment'] = sentiment.upper()
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        activities = []
                        for item in data.get('data', []):
                            # Filter by minimum volume if specified
                            if min_volume and item.get('volume', 0) < min_volume:
                                continue
                            
                            activities.append({
                                'ticker': item.get('ticker'),
                                'date': item.get('date'),
                                'time': item.get('time'),
                                'strike': item.get('strike'),
                                'expiration': item.get('expiration'),
                                'option_type': item.get('option_type'),
                                'volume': item.get('volume'),
                                'open_interest': item.get('open_interest'),
                                'price': item.get('price'),
                                'underlying_price': item.get('underlying_price'),
                                'sentiment': item.get('sentiment'),
                                'unusual_activity': item.get('unusual_activity', False),
                                'description': item.get('description', ''),
                                'provider': 'benzinga'
                            })
                        
                        return activities
                    
                    return None
        except Exception as e:
            print(f"Benzinga options activity error: {e}")
            return None