"""
Alpha Vantage API integration
"""
import os
import requests
import aiohttp
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import pandas as pd

class AlphaVantageService:
    def __init__(self):
        self.api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        self.base_url = 'https://www.alphavantage.co/query'
        
    async def get_price_historical(
        self, 
        symbol: str,
        outputsize: str = 'compact'  # 'compact' = 100 days, 'full' = 20+ years
    ) -> Dict[str, Any]:
        """Get historical daily prices"""
        try:
            params = {
                'function': 'TIME_SERIES_DAILY',
                'symbol': symbol,
                'apikey': self.api_key,
                'outputsize': outputsize
            }
            
            response = requests.get(self.base_url, params=params)
            data = response.json()
            
            if 'Time Series (Daily)' in data:
                time_series = data['Time Series (Daily)']
                
                price_data = []
                for date_str, values in time_series.items():
                    price_data.append({
                        'date': date_str,
                        'open': float(values['1. open']),
                        'high': float(values['2. high']),
                        'low': float(values['3. low']),
                        'close': float(values['4. close']),
                        'volume': int(values['5. volume'])
                    })
                
                # Sort by date
                price_data.sort(key=lambda x: x['date'])
                
                return {
                    'symbol': symbol,
                    'data': price_data,
                    'count': len(price_data),
                    'provider': 'alpha_vantage'
                }
            
            return {'symbol': symbol, 'data': [], 'error': data.get('Note', 'No data')}
            
        except Exception as e:
            print(f"Alpha Vantage error: {e}")
            return {'symbol': symbol, 'data': [], 'error': str(e)}
    
    async def get_company_overview(self, symbol: str) -> Dict[str, Any]:
        """Get company fundamental overview"""
        try:
            params = {
                'function': 'OVERVIEW',
                'symbol': symbol,
                'apikey': self.api_key
            }
            
            response = requests.get(self.base_url, params=params)
            data = response.json()
            
            if 'Symbol' in data:
                return {
                    'symbol': data.get('Symbol'),
                    'name': data.get('Name'),
                    'description': data.get('Description'),
                    'sector': data.get('Sector'),
                    'industry': data.get('Industry'),
                    'marketCap': int(data.get('MarketCapitalization', 0)),
                    'pe': float(data.get('PERatio', 0) or 0),
                    'eps': float(data.get('EPS', 0) or 0),
                    'dividendYield': float(data.get('DividendYield', 0) or 0),
                    'beta': float(data.get('Beta', 0) or 0),
                    'exchange': data.get('Exchange'),
                    'country': data.get('Country'),
                    'currency': data.get('Currency'),
                    'provider': 'alpha_vantage'
                }
            
            return {'symbol': symbol, 'error': 'No data available'}
            
        except Exception as e:
            print(f"Alpha Vantage overview error: {e}")
            return {'symbol': symbol, 'error': str(e)}
    
    async def get_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get real-time quote for a symbol"""
        try:
            params = {
                'function': 'GLOBAL_QUOTE',
                'symbol': symbol,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check for rate limiting
                        if 'Note' in data or 'Information' in data:
                            print(f"Alpha Vantage rate limit hit")
                            return None
                        
                        if 'Global Quote' in data:
                            quote_data = data['Global Quote']
                            return {
                                'symbol': quote_data.get('01. symbol'),
                                'price': float(quote_data.get('05. price', 0)),
                                'open': float(quote_data.get('02. open', 0)),
                                'high': float(quote_data.get('03. high', 0)),
                                'low': float(quote_data.get('04. low', 0)),
                                'volume': int(quote_data.get('06. volume', 0)),
                                'latest_trading_day': quote_data.get('07. latest trading day'),
                                'previous_close': float(quote_data.get('08. previous close', 0)),
                                'change': float(quote_data.get('09. change', 0)),
                                'change_percent': float(quote_data.get('10. change percent', '0%').replace('%', '')),
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage quote error: {e}")
            return None
    
    async def get_intraday_prices(self, symbol: str, interval: str = '5min') -> Optional[Dict[str, Any]]:
        """Get intraday prices for a symbol"""
        try:
            params = {
                'function': 'TIME_SERIES_INTRADAY',
                'symbol': symbol,
                'interval': interval,
                'apikey': self.api_key,
                'outputsize': 'compact'
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        # Check for rate limiting
                        if 'Note' in data or 'Information' in data:
                            print(f"Alpha Vantage rate limit hit")
                            return None
                        
                        time_series_key = f'Time Series ({interval})'
                        if 'Meta Data' in data and time_series_key in data:
                            meta_data = data['Meta Data']
                            time_series = data[time_series_key]
                            
                            prices = []
                            for timestamp, values in time_series.items():
                                prices.append({
                                    'timestamp': timestamp,
                                    'open': float(values['1. open']),
                                    'high': float(values['2. high']),
                                    'low': float(values['3. low']),
                                    'close': float(values['4. close']),
                                    'volume': int(values['5. volume'])
                                })
                            
                            return {
                                'symbol': meta_data['2. Symbol'],
                                'interval': interval,
                                'last_refreshed': meta_data['3. Last Refreshed'],
                                'time_zone': meta_data['6. Time Zone'],
                                'prices': prices,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage intraday error: {e}")
            return None
    
    async def get_sma(self, symbol: str, time_period: int = 20, series_type: str = 'close') -> Optional[Dict[str, Any]]:
        """Get Simple Moving Average (SMA) for a symbol"""
        try:
            params = {
                'function': 'SMA',
                'symbol': symbol,
                'interval': 'daily',
                'time_period': time_period,
                'series_type': series_type,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'Technical Analysis: SMA' in data:
                            sma_data = data['Technical Analysis: SMA']
                            
                            formatted_data = []
                            for date_str, values in list(sma_data.items())[:60]:  # Last 60 days
                                formatted_data.append({
                                    'date': date_str,
                                    'value': float(values['SMA'])
                                })
                            
                            return {
                                'symbol': symbol,
                                'indicator': 'SMA',
                                'time_period': time_period,
                                'data': formatted_data,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage SMA error: {e}")
            return None
    
    async def get_ema(self, symbol: str, time_period: int = 12, series_type: str = 'close') -> Optional[Dict[str, Any]]:
        """Get Exponential Moving Average (EMA) for a symbol"""
        try:
            params = {
                'function': 'EMA',
                'symbol': symbol,
                'interval': 'daily',
                'time_period': time_period,
                'series_type': series_type,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'Technical Analysis: EMA' in data:
                            ema_data = data['Technical Analysis: EMA']
                            
                            formatted_data = []
                            for date_str, values in list(ema_data.items())[:60]:
                                formatted_data.append({
                                    'date': date_str,
                                    'value': float(values['EMA'])
                                })
                            
                            return {
                                'symbol': symbol,
                                'indicator': 'EMA',
                                'time_period': time_period,
                                'data': formatted_data,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage EMA error: {e}")
            return None
    
    async def get_rsi(self, symbol: str, time_period: int = 14, series_type: str = 'close') -> Optional[Dict[str, Any]]:
        """Get Relative Strength Index (RSI) for a symbol"""
        try:
            params = {
                'function': 'RSI',
                'symbol': symbol,
                'interval': 'daily',
                'time_period': time_period,
                'series_type': series_type,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'Technical Analysis: RSI' in data:
                            rsi_data = data['Technical Analysis: RSI']
                            
                            formatted_data = []
                            for date_str, values in list(rsi_data.items())[:60]:
                                formatted_data.append({
                                    'date': date_str,
                                    'value': float(values['RSI'])
                                })
                            
                            return {
                                'symbol': symbol,
                                'indicator': 'RSI',
                                'time_period': time_period,
                                'data': formatted_data,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage RSI error: {e}")
            return None
    
    async def get_macd(self, symbol: str, fast_period: int = 12, slow_period: int = 26, signal_period: int = 9) -> Optional[Dict[str, Any]]:
        """Get MACD (Moving Average Convergence Divergence) for a symbol"""
        try:
            params = {
                'function': 'MACD',
                'symbol': symbol,
                'interval': 'daily',
                'series_type': 'close',
                'fastperiod': fast_period,
                'slowperiod': slow_period,
                'signalperiod': signal_period,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'Technical Analysis: MACD' in data:
                            macd_data = data['Technical Analysis: MACD']
                            
                            formatted_data = []
                            for date_str, values in list(macd_data.items())[:60]:
                                formatted_data.append({
                                    'date': date_str,
                                    'macd': float(values['MACD']),
                                    'signal': float(values['MACD_Signal']),
                                    'histogram': float(values['MACD_Hist'])
                                })
                            
                            return {
                                'symbol': symbol,
                                'indicator': 'MACD',
                                'fast_period': fast_period,
                                'slow_period': slow_period,
                                'signal_period': signal_period,
                                'data': formatted_data,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage MACD error: {e}")
            return None
    
    async def get_bollinger_bands(self, symbol: str, time_period: int = 20, nbdevup: int = 2, nbdevdn: int = 2) -> Optional[Dict[str, Any]]:
        """Get Bollinger Bands for a symbol"""
        try:
            params = {
                'function': 'BBANDS',
                'symbol': symbol,
                'interval': 'daily',
                'time_period': time_period,
                'series_type': 'close',
                'nbdevup': nbdevup,
                'nbdevdn': nbdevdn,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'Technical Analysis: BBANDS' in data:
                            bbands_data = data['Technical Analysis: BBANDS']
                            
                            formatted_data = []
                            for date_str, values in list(bbands_data.items())[:60]:
                                formatted_data.append({
                                    'date': date_str,
                                    'upper_band': float(values['Real Upper Band']),
                                    'middle_band': float(values['Real Middle Band']),
                                    'lower_band': float(values['Real Lower Band'])
                                })
                            
                            return {
                                'symbol': symbol,
                                'indicator': 'BBANDS',
                                'time_period': time_period,
                                'data': formatted_data,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage Bollinger Bands error: {e}")
            return None
    
    async def get_stochastic(self, symbol: str, fastkperiod: int = 14, slowkperiod: int = 3, slowdperiod: int = 3) -> Optional[Dict[str, Any]]:
        """Get Stochastic oscillator for a symbol"""
        try:
            params = {
                'function': 'STOCH',
                'symbol': symbol,
                'interval': 'daily',
                'fastkperiod': fastkperiod,
                'slowkperiod': slowkperiod,
                'slowdperiod': slowdperiod,
                'slowkmatype': 0,
                'slowdmatype': 0,
                'apikey': self.api_key
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if 'Technical Analysis: STOCH' in data:
                            stoch_data = data['Technical Analysis: STOCH']
                            
                            formatted_data = []
                            for date_str, values in list(stoch_data.items())[:60]:
                                formatted_data.append({
                                    'date': date_str,
                                    'k': float(values['SlowK']),
                                    'd': float(values['SlowD'])
                                })
                            
                            return {
                                'symbol': symbol,
                                'indicator': 'STOCH',
                                'data': formatted_data,
                                'provider': 'alpha_vantage'
                            }
                        
                        return None
                    return None
        except Exception as e:
            print(f"Alpha Vantage Stochastic error: {e}")
            return None