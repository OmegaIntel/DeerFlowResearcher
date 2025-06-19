"""
API Ninjas integration for earnings transcripts
"""
import os
import requests
from typing import Optional, Dict, Any, List
from datetime import date, datetime

class APINinjasService:
    def __init__(self):
        self.api_key = os.getenv('API_NINJAS_KEY', 'iYRHbEOeV8cc0T40ssPtAg==CcrRA2Z4aeTlndpj')
        self.base_url = 'https://api.api-ninjas.com/v1'
        
    async def get_earnings_transcript(self, symbol: str, year: int, quarter: int) -> Dict[str, Any]:
        """Get earnings call transcript for a specific quarter and year"""
        try:
            url = f"{self.base_url}/earningstranscript"
            headers = {
                'X-Api-Key': self.api_key
            }
            params = {
                "ticker": symbol.upper(),
                "year": year,
                "quarter": quarter
            }
            
            # Use requests.Session for better connection handling
            with requests.Session() as session:
                session.headers.update(headers)
                response = session.get(url, params=params, timeout=30)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data and isinstance(data, dict) and "transcript" in data:
                        return {
                            "symbol": symbol.upper(),
                            "quarter": quarter,
                            "year": year,
                            "date": data.get("date", ""),
                            "content": data.get("transcript", ""),
                            "provider": "api_ninjas"
                        }
                    else:
                        return {"error": "No transcript data found in response"}
                elif response.status_code == 404:
                    return {"error": f"No transcript found for {symbol} Q{quarter} {year}"}
                elif response.status_code == 401:
                    return {"error": "API key authentication failed"}
                else:
                    print(f"API Ninjas response ({response.status_code}): {response.text[:200]}")
                    return {"error": f"API request failed with status {response.status_code}"}
                
        except requests.exceptions.Timeout:
            print(f"API Ninjas timeout for {symbol} Q{quarter} {year}")
            return {"error": "Request timeout"}
        except requests.exceptions.RequestException as e:
            print(f"API Ninjas request error: {e}")
            return {"error": f"Request failed: {str(e)}"}
        except Exception as e:
            print(f"API Ninjas unexpected error: {e}")
            return {"error": f"Unexpected error: {str(e)}"}
    
    async def get_earnings_transcript_dates(self, symbol: str) -> List[Dict[str, Any]]:
        """Get available earnings transcript dates for a symbol"""
        try:
            # API Ninjas has a list endpoint for available transcripts
            url = f"{self.base_url}/earningscalltranscriptslist"
            headers = {
                'X-Api-Key': self.api_key
            }
            
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            # Filter for specific symbol and transform to our expected format
            if isinstance(data, list):
                symbol_transcripts = []
                for item in data:
                    if item.get("ticker", "").upper() == symbol.upper():
                        symbol_transcripts.append({
                            "symbol": symbol.upper(),
                            "year": item.get("year"),
                            "quarter": item.get("quarter"),
                            "date": item.get("date", "")
                        })
                
                # Sort by year and quarter descending (most recent first)
                symbol_transcripts.sort(key=lambda x: (x["year"], x["quarter"]), reverse=True)
                return symbol_transcripts
            
            return []
            
        except requests.exceptions.RequestException as e:
            print(f"API Ninjas transcript dates error: {e}")
            return []
        except Exception as e:
            print(f"API Ninjas transcript dates error: {e}")
            return []

    async def test_connection(self) -> bool:
        """Test if API connection is working"""
        try:
            url = f"{self.base_url}/earningstranscript"
            headers = {
                'X-Api-Key': self.api_key
            }
            params = {
                "ticker": "AAPL",
                "year": 2024,
                "quarter": 1
            }
            
            response = requests.get(url, headers=headers, params=params)
            return response.status_code in [200, 400, 404]  # 400/404 might mean no data, but API is working
            
        except Exception:
            return False