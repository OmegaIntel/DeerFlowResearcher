#!/usr/bin/env python3
"""
Check alternative FMP endpoints for management/executive information
"""
import asyncio
import os
import requests
from services.fmp_service import FMPService

async def check_fmp_endpoints():
    """Check various FMP endpoints"""
    from dotenv import load_dotenv
    load_dotenv()
    
    fmp = FMPService()
    symbol = "AAPL"
    
    endpoints_to_test = [
        # Company profile might include CEO info
        f"/profile/{symbol}",
        # SEC filings might have executive compensation
        f"/sec_filings/{symbol}?type=DEF%2014A&limit=1",
        # Company key stats
        f"/key-metrics-ttm/{symbol}",
        # Financial statements might have some info
        f"/income-statement/{symbol}?limit=1",
    ]
    
    for endpoint in endpoints_to_test:
        url = f"{fmp.base_url}{endpoint}"
        params = {'apikey': fmp.api_key}
        
        print(f"\n=== Testing: {endpoint} ===")
        
        try:
            response = requests.get(url, params=params)
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and data:
                    # For company profile, check for CEO
                    if 'profile' in endpoint:
                        profile = data[0]
                        if 'ceo' in profile:
                            print(f"✓ Found CEO: {profile.get('ceo')}")
                        print(f"Available fields: {list(profile.keys())[:10]}...")
                    else:
                        print(f"✓ Data available (type: {type(data)}, length: {len(data)})")
                elif isinstance(data, dict):
                    print(f"✓ Data available: {list(data.keys())[:5]}...")
                else:
                    print("✗ Empty or unexpected response")
            else:
                print(f"✗ Error: {response.text[:200]}")
                
        except Exception as e:
            print(f"✗ Request error: {e}")

if __name__ == "__main__":
    asyncio.run(check_fmp_endpoints())