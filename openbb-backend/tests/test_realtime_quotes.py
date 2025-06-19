"""
Test suite for real-time quote endpoints
Following TDD approach - tests written before implementation
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
import json
import os

# Import services to be tested
from services.alpha_vantage_service import AlphaVantageService
from services.polygon_service import PolygonService
from services.multi_provider_service import MultiProviderService


class TestAlphaVantageRealTimeQuotes:
    """Test Alpha Vantage real-time quote functionality"""
    
    @pytest.fixture
    def alpha_vantage_service(self):
        """Create Alpha Vantage service instance"""
        return AlphaVantageService()
    
    @pytest.fixture
    def mock_quote_response(self):
        """Mock response from Alpha Vantage GLOBAL_QUOTE endpoint"""
        return {
            "Global Quote": {
                "01. symbol": "AAPL",
                "02. open": "150.00",
                "03. high": "155.00",
                "04. low": "149.50",
                "05. price": "153.25",
                "06. volume": "75000000",
                "07. latest trading day": "2024-06-19",
                "08. previous close": "151.00",
                "09. change": "2.25",
                "10. change percent": "1.49%"
            }
        }
    
    @pytest.mark.asyncio
    async def test_get_quote_success(self, alpha_vantage_service, mock_quote_response):
        """Test successful real-time quote retrieval"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_quote_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await alpha_vantage_service.get_quote("AAPL")
            
            assert result is not None
            assert result["symbol"] == "AAPL"
            assert result["price"] == 153.25
            assert result["open"] == 150.00
            assert result["high"] == 155.00
            assert result["low"] == 149.50
            assert result["volume"] == 75000000
            assert result["change"] == 2.25
            assert result["change_percent"] == 1.49
            assert result["previous_close"] == 151.00
            assert result["latest_trading_day"] == "2024-06-19"
    
    @pytest.mark.asyncio
    async def test_get_quote_api_error(self, alpha_vantage_service):
        """Test handling of API errors"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 503
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await alpha_vantage_service.get_quote("AAPL")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_get_quote_rate_limit(self, alpha_vantage_service):
        """Test handling of rate limit response"""
        rate_limit_response = {
            "Note": "Thank you for using Alpha Vantage! Our standard API call frequency is 5 calls per minute"
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=rate_limit_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await alpha_vantage_service.get_quote("AAPL")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_get_intraday_prices(self, alpha_vantage_service):
        """Test intraday price retrieval"""
        mock_intraday_response = {
            "Meta Data": {
                "1. Information": "Intraday (5min) open, high, low, close prices and volume",
                "2. Symbol": "AAPL",
                "3. Last Refreshed": "2024-06-19 16:00:00",
                "4. Interval": "5min",
                "5. Output Size": "Compact",
                "6. Time Zone": "US/Eastern"
            },
            "Time Series (5min)": {
                "2024-06-19 16:00:00": {
                    "1. open": "153.20",
                    "2. high": "153.30",
                    "3. low": "153.15",
                    "4. close": "153.25",
                    "5. volume": "1234567"
                },
                "2024-06-19 15:55:00": {
                    "1. open": "153.10",
                    "2. high": "153.25",
                    "3. low": "153.05",
                    "4. close": "153.20",
                    "5. volume": "987654"
                }
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_intraday_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await alpha_vantage_service.get_intraday_prices("AAPL", interval="5min")
            
            assert result is not None
            assert result["symbol"] == "AAPL"
            assert result["interval"] == "5min"
            assert len(result["prices"]) == 2
            assert result["prices"][0]["timestamp"] == "2024-06-19 16:00:00"
            assert result["prices"][0]["close"] == 153.25


class TestPolygonRealTimeQuotes:
    """Test Polygon.io real-time quote functionality"""
    
    @pytest.fixture
    def polygon_service(self):
        """Create Polygon service instance"""
        return PolygonService()
    
    @pytest.fixture
    def mock_snapshot_response(self):
        """Mock response from Polygon snapshot endpoint"""
        return {
            "status": "OK",
            "ticker": {
                "ticker": "AAPL",
                "todaysChangePerc": 1.49,
                "todaysChange": 2.25,
                "updated": 1718812800000,
                "day": {
                    "o": 150.00,
                    "h": 155.00,
                    "l": 149.50,
                    "c": 153.25,
                    "v": 75000000,
                    "vw": 152.50
                },
                "min": {
                    "o": 153.20,
                    "h": 153.30,
                    "l": 153.15,
                    "c": 153.25,
                    "v": 1234567,
                    "t": 1718812800000
                },
                "prevDay": {
                    "o": 149.00,
                    "h": 152.00,
                    "l": 148.50,
                    "c": 151.00,
                    "v": 65000000,
                    "vw": 150.25
                }
            }
        }
    
    @pytest.mark.asyncio
    async def test_get_snapshot_success(self, polygon_service, mock_snapshot_response):
        """Test successful snapshot retrieval"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_snapshot_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await polygon_service.get_snapshot("AAPL")
            
            assert result is not None
            assert result["symbol"] == "AAPL"
            assert result["price"] == 153.25
            assert result["open"] == 150.00
            assert result["high"] == 155.00
            assert result["low"] == 149.50
            assert result["volume"] == 75000000
            assert result["change"] == 2.25
            assert result["change_percent"] == 1.49
            assert result["previous_close"] == 151.00
            assert result["vwap"] == 152.50
    
    @pytest.mark.asyncio
    async def test_get_last_trade(self, polygon_service):
        """Test last trade retrieval"""
        mock_last_trade = {
            "status": "OK",
            "request_id": "123456",
            "results": {
                "T": "AAPL",
                "f": 1718812800000,
                "q": 100,
                "t": 1718812800123,
                "y": 1718812800000,
                "x": 4,
                "p": 153.25,
                "s": 100
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_last_trade)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await polygon_service.get_last_trade("AAPL")
            
            assert result is not None
            assert result["symbol"] == "AAPL"
            assert result["price"] == 153.25
            assert result["size"] == 100
            assert result["timestamp"] == 1718812800123
            assert result["exchange"] == 4


class TestMultiProviderQuotes:
    """Test multi-provider quote functionality with failover"""
    
    @pytest.fixture
    def multi_provider_service(self):
        """Create multi-provider service instance with mocked providers"""
        # Set environment variables for testing
        with patch.dict(os.environ, {
            'POLYGON_API_KEY': 'test_polygon_key',
            'ALPHA_VANTAGE_API_KEY': 'test_av_key',
            'FMP_API_KEY': 'test_fmp_key',
            'BENZINGA_API_KEY': 'test_benzinga_key'
        }):
            service = MultiProviderService()
            # Mock the provider services
            service.polygon = AsyncMock()
            service.alpha_vantage = AsyncMock()
            service.fmp = AsyncMock()
            service.benzinga = AsyncMock()
            return service
    
    @pytest.mark.asyncio
    async def test_get_quote_with_provider_selection(self, multi_provider_service):
        """Test quote retrieval with specific provider selection"""
        mock_quote = {
            "symbol": "AAPL",
            "price": 153.25,
            "provider": "polygon"
        }
        
        multi_provider_service.polygon.get_snapshot = AsyncMock(return_value=mock_quote)
        
        result = await multi_provider_service.get_data(
            data_type="quote",
            symbol="AAPL",
            provider="polygon"
        )
        
        assert result is not None
        assert result["symbol"] == "AAPL"
        assert result["price"] == 153.25
        assert result["provider"] == "polygon"
        multi_provider_service.polygon.get_snapshot.assert_called_once_with("AAPL")
    
    @pytest.mark.asyncio
    async def test_get_quote_with_automatic_failover(self, multi_provider_service):
        """Test automatic failover when primary provider fails"""
        mock_quote = {
            "symbol": "AAPL",
            "price": 153.25,
            "provider": "alpha_vantage"
        }
        
        # Mock Polygon to fail
        multi_provider_service.polygon.get_snapshot = AsyncMock(
            side_effect=Exception("Service unavailable")
        )
        # Mock Alpha Vantage to succeed
        multi_provider_service.alpha_vantage.get_quote = AsyncMock(
            return_value=mock_quote
        )
        
        result = await multi_provider_service.get_data(
            data_type="quote",
            symbol="AAPL"
        )
        
        assert result is not None
        assert result["symbol"] == "AAPL"
        assert result["price"] == 153.25
        assert result["provider"] == "alpha_vantage"
    
    @pytest.mark.asyncio
    async def test_get_quote_all_providers_fail(self, multi_provider_service):
        """Test behavior when all providers fail"""
        # Mock all providers to fail
        multi_provider_service.polygon.get_snapshot = AsyncMock(
            side_effect=Exception("Service unavailable")
        )
        multi_provider_service.alpha_vantage.get_quote = AsyncMock(
            side_effect=Exception("API limit reached")
        )
        multi_provider_service.fmp.get_quote = AsyncMock(return_value=None)
        
        # Mock yfinance to fail too
        with patch.object(multi_provider_service, '_get_yfinance_quote', return_value=None):
            result = await multi_provider_service.get_data(
                data_type="quote",
                symbol="AAPL"
            )
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_provider_priority_for_quotes(self, multi_provider_service):
        """Test that provider priority is correct for quotes"""
        priority = multi_provider_service._get_provider_priority("quote")
        
        assert priority[0] == "polygon"  # Polygon should be first for real-time quotes
        assert priority[1] == "alpha_vantage"
        assert priority[2] == "fmp"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])