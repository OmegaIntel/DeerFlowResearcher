"""
Test suite for Options Flow widget backend functionality
Following TDD approach - tests written before implementation
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, date
import json

# Import services to be tested
from services.polygon_service import PolygonService
from services.benzinga_service import BenzingaService
from services.multi_provider_service import MultiProviderService


class TestPolygonOptionsChain:
    """Test Polygon.io options chain functionality"""
    
    @pytest.fixture
    def polygon_service(self):
        """Create Polygon service instance"""
        return PolygonService()
    
    @pytest.fixture
    def mock_options_chain_response(self):
        """Mock response from Polygon options chain endpoint"""
        return {
            "status": "OK",
            "results": [
                {
                    "contract_type": "call",
                    "expiration_date": "2024-07-19",
                    "strike_price": 150,
                    "underlying_ticker": "AAPL",
                    "ticker": "O:AAPL240719C00150000",
                    "day": {
                        "close": 5.25,
                        "open": 4.80,
                        "high": 5.50,
                        "low": 4.75,
                        "volume": 1250,
                        "vwap": 5.15
                    },
                    "details": {
                        "expiration_date": "2024-07-19",
                        "strike_price": 150,
                        "contract_type": "call"
                    },
                    "greeks": {
                        "delta": 0.65,
                        "gamma": 0.02,
                        "theta": -0.05,
                        "vega": 0.15
                    },
                    "implied_volatility": 0.32,
                    "open_interest": 5200
                },
                {
                    "contract_type": "put",
                    "expiration_date": "2024-07-19",
                    "strike_price": 150,
                    "underlying_ticker": "AAPL",
                    "ticker": "O:AAPL240719P00150000",
                    "day": {
                        "close": 2.10,
                        "open": 2.25,
                        "high": 2.35,
                        "low": 2.05,
                        "volume": 850,
                        "vwap": 2.18
                    },
                    "details": {
                        "expiration_date": "2024-07-19",
                        "strike_price": 150,
                        "contract_type": "put"
                    },
                    "greeks": {
                        "delta": -0.35,
                        "gamma": 0.02,
                        "theta": -0.04,
                        "vega": 0.15
                    },
                    "implied_volatility": 0.31,
                    "open_interest": 3100
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_get_options_chain_success(self, polygon_service, mock_options_chain_response):
        """Test successful options chain retrieval"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_options_chain_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await polygon_service.get_options_chain("AAPL")
            
            assert result is not None
            assert len(result["contracts"]) == 2
            
            # Check call option
            call_option = result["contracts"][0]
            assert call_option["contract_type"] == "call"
            assert call_option["strike"] == 150
            assert call_option["expiration"] == "2024-07-19"
            assert call_option["last_price"] == 5.25
            assert call_option["volume"] == 1250
            assert call_option["open_interest"] == 5200
            assert call_option["implied_volatility"] == 0.32
            assert call_option["delta"] == 0.65
            
            # Check put option
            put_option = result["contracts"][1]
            assert put_option["contract_type"] == "put"
            assert put_option["strike"] == 150
            assert put_option["last_price"] == 2.10
    
    @pytest.mark.asyncio
    async def test_get_options_chain_with_expiration_filter(self, polygon_service):
        """Test options chain with specific expiration date"""
        mock_response = {
            "status": "OK",
            "results": [
                {
                    "contract_type": "call",
                    "expiration_date": "2024-07-19",
                    "strike_price": 150,
                    "ticker": "O:AAPL240719C00150000",
                    "day": {"close": 5.25, "volume": 1250},
                    "open_interest": 5200
                }
            ]
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await polygon_service.get_options_chain(
                "AAPL", 
                expiration_date="2024-07-19"
            )
            
            assert result is not None
            assert len(result["contracts"]) == 1
            assert result["contracts"][0]["expiration"] == "2024-07-19"
    
    @pytest.mark.asyncio
    async def test_get_unusual_options_activity(self, polygon_service):
        """Test unusual options activity detection"""
        # Mock options with unusual volume
        mock_response = {
            "status": "OK",
            "results": [
                {
                    "contract_type": "call",
                    "strike_price": 150,
                    "ticker": "O:AAPL240719C00150000",
                    "day": {"volume": 10000, "close": 5.25},  # High volume
                    "open_interest": 5200,
                    "details": {"expiration_date": "2024-07-19"},
                    "implied_volatility": 0.45  # High IV
                }
            ]
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await polygon_service.get_unusual_options_activity("AAPL")
            
            assert result is not None
            assert len(result["unusual_activity"]) > 0
            assert result["unusual_activity"][0]["volume"] == 10000
            assert result["unusual_activity"][0]["volume_ratio"] > 1.0


class TestBenzingaOptionsActivity:
    """Test Benzinga options activity functionality"""
    
    @pytest.fixture
    def benzinga_service(self):
        """Create Benzinga service instance"""
        with patch.dict('os.environ', {'BENZINGA_API_KEY': 'test_benzinga_key'}):
            return BenzingaService()
    
    @pytest.fixture
    def mock_options_activity_response(self):
        """Mock response from Benzinga options activity endpoint"""
        return {
            "data": [
                {
                    "ticker": "AAPL",
                    "date": "2024-06-19",
                    "time": "10:30:00",
                    "strike": 150,
                    "expiration": "2024-07-19",
                    "option_type": "CALL",
                    "volume": 5000,
                    "open_interest": 2500,
                    "price": 5.25,
                    "underlying_price": 152.50,
                    "sentiment": "BULLISH",
                    "unusual_activity": True,
                    "description": "Sweep of 5000 AAPL Jul 150 Calls"
                },
                {
                    "ticker": "AAPL",
                    "date": "2024-06-19",
                    "time": "11:15:00",
                    "strike": 145,
                    "expiration": "2024-07-19",
                    "option_type": "PUT",
                    "volume": 3000,
                    "open_interest": 1800,
                    "price": 2.10,
                    "underlying_price": 152.50,
                    "sentiment": "BEARISH",
                    "unusual_activity": True,
                    "description": "Block trade of 3000 AAPL Jul 145 Puts"
                }
            ]
        }
    
    @pytest.mark.asyncio
    async def test_get_options_activity_success(self, benzinga_service, mock_options_activity_response):
        """Test successful options activity retrieval"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_options_activity_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await benzinga_service.get_options_activity("AAPL")
            
            assert result is not None
            assert len(result) == 2
            
            # Check first activity
            first_activity = result[0]
            assert first_activity["ticker"] == "AAPL"
            assert first_activity["strike"] == 150
            assert first_activity["option_type"] == "CALL"
            assert first_activity["volume"] == 5000
            assert first_activity["sentiment"] == "BULLISH"
            assert first_activity["unusual_activity"] is True
    
    @pytest.mark.asyncio
    async def test_get_options_activity_with_filters(self, benzinga_service):
        """Test options activity with sentiment filter"""
        mock_response = {
            "data": [
                {
                    "ticker": "AAPL",
                    "strike": 150,
                    "option_type": "CALL",
                    "sentiment": "BULLISH",
                    "volume": 5000
                }
            ]
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await benzinga_service.get_options_activity(
                "AAPL",
                sentiment="BULLISH"
            )
            
            assert result is not None
            assert len(result) == 1
            assert all(activity["sentiment"] == "BULLISH" for activity in result)


class TestMultiProviderOptionsFlow:
    """Test multi-provider options flow functionality"""
    
    @pytest.fixture
    def multi_provider_service(self):
        """Create multi-provider service instance with mocked providers"""
        with patch.dict('os.environ', {
            'POLYGON_API_KEY': 'test_polygon_key',
            'BENZINGA_API_KEY': 'test_benzinga_key'
        }):
            service = MultiProviderService()
            service.polygon = AsyncMock()
            service.benzinga = AsyncMock()
            return service
    
    @pytest.mark.asyncio
    async def test_get_options_flow_with_polygon(self, multi_provider_service):
        """Test options flow retrieval using Polygon"""
        mock_options_data = {
            "symbol": "AAPL",
            "contracts": [
                {
                    "contract_type": "call",
                    "strike": 150,
                    "expiration": "2024-07-19",
                    "volume": 5000,
                    "open_interest": 2500,
                    "last_price": 5.25
                }
            ],
            "provider": "polygon"
        }
        
        multi_provider_service.polygon.get_options_chain = AsyncMock(
            return_value=mock_options_data
        )
        
        result = await multi_provider_service.get_data(
            data_type="options",
            symbol="AAPL",
            provider="polygon"
        )
        
        assert result is not None
        assert result["symbol"] == "AAPL"
        assert result["provider"] == "polygon"
        assert len(result["contracts"]) == 1
    
    @pytest.mark.asyncio
    async def test_get_options_flow_failover(self, multi_provider_service):
        """Test automatic failover from Polygon to Benzinga"""
        mock_benzinga_data = [
            {
                "ticker": "AAPL",
                "strike": 150,
                "option_type": "CALL",
                "volume": 5000,
                "sentiment": "BULLISH"
            }
        ]
        
        # Mock Polygon to fail
        multi_provider_service.polygon.get_options_chain = AsyncMock(
            side_effect=Exception("Service unavailable")
        )
        
        # Mock Benzinga to succeed
        multi_provider_service.benzinga.get_options_activity = AsyncMock(
            return_value=mock_benzinga_data
        )
        
        result = await multi_provider_service.get_data(
            data_type="options",
            symbol="AAPL"
        )
        
        assert result is not None
        # The result format would depend on how we normalize the data
        assert len(result) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])