#!/usr/bin/env python3
"""
Debug FMP API integration
"""
import asyncio
import os
import requests
from services.fmp_service import FMPService

async def debug_fmp():
    """Debug FMP service"""
    print("=== Debugging FMP Service ===")
    
    # Check API key
    api_key = os.getenv('FMP_API_KEY')
    print(f"FMP_API_KEY exists: {bool(api_key)}")
    if api_key:
        print(f"FMP_API_KEY length: {len(api_key)}")
        print(f"FMP_API_KEY first 4 chars: {api_key[:4]}...")
    
    # Initialize service
    fmp = FMPService()
    print(f"FMP base_url: {fmp.base_url}")
    print(f"FMP api_key set: {bool(fmp.api_key)}")
    
    # Test direct API call
    symbol = "AAPL"
    url = f"{fmp.base_url}/key-executives/{symbol}"
    params = {'apikey': fmp.api_key}
    
    print(f"\nTesting URL: {url}")
    print(f"API Key in request: {bool(params.get('apikey'))}")
    
    try:
        response = requests.get(url, params=params)
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        # Print raw response
        print(f"\nRaw response text (first 500 chars):")
        print(response.text[:500])
        
        # Try to parse JSON
        try:
            data = response.json()
            print(f"\nParsed JSON type: {type(data)}")
            if isinstance(data, list):
                print(f"List length: {len(data)}")
                if data:
                    print(f"First item: {data[0]}")
            elif isinstance(data, dict):
                print(f"Dict keys: {list(data.keys())}")
                print(f"Response: {data}")
        except Exception as e:
            print(f"JSON parse error: {e}")
            
    except Exception as e:
        print(f"Request error: {e}")
    
    # Test through service method
    print("\n=== Testing through service method ===")
    result = await fmp.get_key_executives(symbol)
    print(f"Service method result type: {type(result)}")
    print(f"Service method result length: {len(result)}")
    if result:
        print(f"First executive: {result[0]}")

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    asyncio.run(debug_fmp())