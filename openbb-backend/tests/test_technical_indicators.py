"""
Test suite for Technical Indicators functionality
Following TDD approach - tests written before implementation
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime, date
import json

# Import services to be tested
from services.alpha_vantage_service import AlphaVantageService
from services.multi_provider_service import MultiProviderService


class TestAlphaVantageTechnicalIndicators:
    """Test Alpha Vantage technical indicators functionality"""
    
    @pytest.fixture
    def alpha_vantage_service(self):
        """Create Alpha Vantage service instance"""
        with patch.dict('os.environ', {'ALPHA_VANTAGE_API_KEY': 'test_av_key'}):
            return AlphaVantageService()
    
    @pytest.fixture
    def mock_sma_response(self):
        """Mock response from Alpha Vantage SMA endpoint"""
        return {
            "Meta Data": {
                "1: Symbol": "AAPL",
                "2: Indicator": "Simple Moving Average (SMA)",
                "3: Last Refreshed": "2024-06-19",
                "4: Interval": "daily",
                "5: Time Period": 20,
                "6: Series Type": "close",
                "7: Time Zone": "US/Eastern"
            },
            "Technical Analysis: SMA": {
                "2024-06-19": {
                    "SMA": "185.2450"
                },
                "2024-06-18": {
                    "SMA": "184.8900"
                },
                "2024-06-17": {
                    "SMA": "184.5600"
                },
                "2024-06-14": {
                    "SMA": "184.2300"
                },
                "2024-06-13": {
                    "SMA": "183.9200"
                }
            }
        }
    
    @pytest.mark.asyncio
    async def test_get_sma_success(self, alpha_vantage_service, mock_sma_response):
        """Test successful SMA retrieval"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.json = AsyncMock(return_value=mock_sma_response)
            mock_get.return_value.__aenter__.return_value = mock_response
            
            result = await alpha_vantage_service.get_sma("AAPL", time_period=20)
            
            assert result is not None
            assert result["symbol"] == "AAPL"
            assert result["indicator"] == "SMA"
            assert result["time_period"] == 20
            assert len(result["data"]) == 5
            assert result["data"][0]["date"] == "2024-06-19"
            assert result["data"][0]["value"] == 185.2450
    
    @pytest.mark.asyncio
    async def test_get_ema_success(self, alpha_vantage_service):
        """Test successful EMA retrieval"""
        mock_response = {
            "Meta Data": {
                "1: Symbol": "AAPL",
                "2: Indicator": "Exponential Moving Average (EMA)",
                "3: Last Refreshed": "2024-06-19",
                "4: Interval": "daily",
                "5: Time Period": 12,
                "6: Series Type": "close",
                "7: Time Zone": "US/Eastern"
            },
            "Technical Analysis: EMA": {
                "2024-06-19": {"EMA": "186.1234"},
                "2024-06-18": {"EMA": "185.7890"}
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await alpha_vantage_service.get_ema("AAPL", time_period=12)
            
            assert result is not None
            assert result["indicator"] == "EMA"
            assert result["time_period"] == 12
            assert result["data"][0]["value"] == 186.1234
    
    @pytest.mark.asyncio
    async def test_get_rsi_success(self, alpha_vantage_service):
        """Test successful RSI retrieval"""
        mock_response = {
            "Meta Data": {
                "1: Symbol": "AAPL",
                "2: Indicator": "Relative Strength Index (RSI)",
                "3: Last Refreshed": "2024-06-19",
                "4: Interval": "daily",
                "5: Time Period": 14,
                "6: Series Type": "close",
                "7: Time Zone": "US/Eastern"
            },
            "Technical Analysis: RSI": {
                "2024-06-19": {"RSI": "58.3421"},
                "2024-06-18": {"RSI": "56.7890"},
                "2024-06-17": {"RSI": "54.2100"}
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await alpha_vantage_service.get_rsi("AAPL", time_period=14)
            
            assert result is not None
            assert result["indicator"] == "RSI"
            assert result["time_period"] == 14
            assert result["data"][0]["value"] == 58.3421
    
    @pytest.mark.asyncio
    async def test_get_macd_success(self, alpha_vantage_service):
        """Test successful MACD retrieval"""
        mock_response = {
            "Meta Data": {
                "1: Symbol": "AAPL",
                "2: Indicator": "Moving Average Convergence/Divergence (MACD)",
                "3: Last Refreshed": "2024-06-19",
                "4: Interval": "daily",
                "5.1: Fast Period": 12,
                "5.2: Slow Period": 26,
                "5.3: Signal Period": 9,
                "6: Series Type": "close",
                "7: Time Zone": "US/Eastern"
            },
            "Technical Analysis: MACD": {
                "2024-06-19": {
                    "MACD": "1.2345",
                    "MACD_Signal": "0.9876",
                    "MACD_Hist": "0.2469"
                },
                "2024-06-18": {
                    "MACD": "1.1234",
                    "MACD_Signal": "0.8765",
                    "MACD_Hist": "0.2469"
                }
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await alpha_vantage_service.get_macd("AAPL")
            
            assert result is not None
            assert result["indicator"] == "MACD"
            assert len(result["data"]) == 2
            assert result["data"][0]["macd"] == 1.2345
            assert result["data"][0]["signal"] == 0.9876
            assert result["data"][0]["histogram"] == 0.2469
    
    @pytest.mark.asyncio
    async def test_get_bollinger_bands_success(self, alpha_vantage_service):
        """Test successful Bollinger Bands retrieval"""
        mock_response = {
            "Meta Data": {
                "1: Symbol": "AAPL",
                "2: Indicator": "Bollinger Bands (BBANDS)",
                "3: Last Refreshed": "2024-06-19",
                "4: Interval": "daily",
                "5: Time Period": 20,
                "6: Deviation multiplier for upper band": 2,
                "7: Deviation multiplier for lower band": 2,
                "8: MA Type": 0,
                "9: Series Type": "close",
                "10: Time Zone": "US/Eastern"
            },
            "Technical Analysis: BBANDS": {
                "2024-06-19": {
                    "Real Upper Band": "188.5432",
                    "Real Middle Band": "185.2450",
                    "Real Lower Band": "181.9468"
                },
                "2024-06-18": {
                    "Real Upper Band": "188.1234",
                    "Real Middle Band": "184.8900",
                    "Real Lower Band": "181.6566"
                }
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await alpha_vantage_service.get_bollinger_bands("AAPL", time_period=20)
            
            assert result is not None
            assert result["indicator"] == "BBANDS"
            assert result["time_period"] == 20
            assert result["data"][0]["upper_band"] == 188.5432
            assert result["data"][0]["middle_band"] == 185.2450
            assert result["data"][0]["lower_band"] == 181.9468
    
    @pytest.mark.asyncio
    async def test_get_stochastic_success(self, alpha_vantage_service):
        """Test successful Stochastic oscillator retrieval"""
        mock_response = {
            "Meta Data": {
                "1: Symbol": "AAPL",
                "2: Indicator": "Stochastic (STOCH)",
                "3: Last Refreshed": "2024-06-19",
                "4: Interval": "daily",
                "5.1: FastK Period": 14,
                "5.2: SlowK Period": 3,
                "5.3: SlowK MA Type": 0,
                "5.4: SlowD Period": 3,
                "5.5: SlowD MA Type": 0,
                "6: Time Zone": "US/Eastern"
            },
            "Technical Analysis: STOCH": {
                "2024-06-19": {
                    "SlowK": "72.3456",
                    "SlowD": "68.9012"
                },
                "2024-06-18": {
                    "SlowK": "68.1234",
                    "SlowD": "65.4567"
                }
            }
        }
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_resp = AsyncMock()
            mock_resp.status = 200
            mock_resp.json = AsyncMock(return_value=mock_response)
            mock_get.return_value.__aenter__.return_value = mock_resp
            
            result = await alpha_vantage_service.get_stochastic("AAPL")
            
            assert result is not None
            assert result["indicator"] == "STOCH"
            assert result["data"][0]["k"] == 72.3456
            assert result["data"][0]["d"] == 68.9012


class TestMultiProviderTechnicalIndicators:
    """Test multi-provider technical indicators functionality"""
    
    @pytest.fixture
    def multi_provider_service(self):
        """Create multi-provider service instance with mocked providers"""
        with patch.dict('os.environ', {
            'ALPHA_VANTAGE_API_KEY': 'test_av_key',
            'POLYGON_API_KEY': 'test_polygon_key'
        }):
            service = MultiProviderService()
            service.alpha_vantage = AsyncMock()
            service.polygon = AsyncMock()
            return service
    
    @pytest.mark.asyncio
    async def test_get_technical_indicator_with_alpha_vantage(self, multi_provider_service):
        """Test technical indicator retrieval using Alpha Vantage"""
        mock_sma_data = {
            "symbol": "AAPL",
            "indicator": "SMA",
            "time_period": 20,
            "data": [
                {"date": "2024-06-19", "value": 185.25},
                {"date": "2024-06-18", "value": 184.89}
            ],
            "provider": "alpha_vantage"
        }
        
        multi_provider_service.alpha_vantage.get_sma = AsyncMock(
            return_value=mock_sma_data
        )
        
        result = await multi_provider_service.get_data(
            data_type="technical",
            symbol="AAPL",
            provider="alpha_vantage",
            indicator="SMA",
            time_period=20
        )
        
        assert result is not None
        assert result["symbol"] == "AAPL"
        assert result["indicator"] == "SMA"
        assert result["provider"] == "alpha_vantage"
    
    @pytest.mark.asyncio
    async def test_get_multiple_indicators(self, multi_provider_service):
        """Test retrieving multiple technical indicators"""
        # Mock different indicators
        mock_sma = {"indicator": "SMA", "data": [{"date": "2024-06-19", "value": 185.25}]}
        mock_rsi = {"indicator": "RSI", "data": [{"date": "2024-06-19", "value": 58.34}]}
        mock_macd = {"indicator": "MACD", "data": [{"date": "2024-06-19", "macd": 1.23, "signal": 0.98}]}
        
        multi_provider_service.alpha_vantage.get_sma = AsyncMock(return_value=mock_sma)
        multi_provider_service.alpha_vantage.get_rsi = AsyncMock(return_value=mock_rsi)
        multi_provider_service.alpha_vantage.get_macd = AsyncMock(return_value=mock_macd)
        
        # Get multiple indicators
        indicators = ["SMA", "RSI", "MACD"]
        results = []
        
        for indicator in indicators:
            if indicator == "SMA":
                result = await multi_provider_service.alpha_vantage.get_sma("AAPL", 20)
            elif indicator == "RSI":
                result = await multi_provider_service.alpha_vantage.get_rsi("AAPL", 14)
            elif indicator == "MACD":
                result = await multi_provider_service.alpha_vantage.get_macd("AAPL")
            
            if result:
                results.append(result)
        
        assert len(results) == 3
        assert results[0]["indicator"] == "SMA"
        assert results[1]["indicator"] == "RSI"
        assert results[2]["indicator"] == "MACD"
    
    @pytest.mark.asyncio
    async def test_technical_indicator_failover(self, multi_provider_service):
        """Test automatic failover for technical indicators"""
        # Mock Alpha Vantage to fail
        multi_provider_service.alpha_vantage.get_sma = AsyncMock(
            side_effect=Exception("Rate limit exceeded")
        )
        
        # In real implementation, we might fallback to calculating indicators
        # from raw price data from other providers
        result = await multi_provider_service.get_data(
            data_type="technical",
            symbol="AAPL",
            indicator="SMA",
            time_period=20
        )
        
        # For now, expect None as we don't have fallback implementation
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])