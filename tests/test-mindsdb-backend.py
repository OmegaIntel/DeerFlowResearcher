#!/usr/bin/env python3
"""Test MindsDB backend endpoints"""

import requests
import json
import time

API_URL = "http://localhost:8000/api/v1"

def test_endpoint(name, method, endpoint, data=None):
    """Test a single endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing: {name}")
    print(f"Method: {method} {endpoint}")
    if data:
        print(f"Data: {json.dumps(data, indent=2)}")
    
    try:
        if method == "GET":
            response = requests.get(f"{API_URL}{endpoint}")
        elif method == "POST":
            response = requests.post(f"{API_URL}{endpoint}", json=data)
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        return response.status_code == 200 and response.json().get("success", False)
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("MindsDB Backend API Tests")
    print("="*60)
    
    tests_passed = 0
    tests_total = 0
    
    # Test 1: Check MindsDB Status
    tests_total += 1
    if test_endpoint("MindsDB Status", "GET", "/mindsdb/status"):
        tests_passed += 1
    
    # Test 2: List Data Sources
    tests_total += 1
    if test_endpoint("List Data Sources", "GET", "/mindsdb/data-sources"):
        tests_passed += 1
    
    # Test 3: Execute Simple Query
    tests_total += 1
    if test_endpoint("Execute Query - SHOW DATABASES", "POST", "/mindsdb/query", 
                    {"query": "SHOW DATABASES"}):
        tests_passed += 1
    
    # Test 4: Process Natural Language Query
    tests_total += 1
    if test_endpoint("Process NL Query - PostgreSQL", "POST", "/mindsdb/process",
                    {"query": "Show all databases", "integration": "postgresql"}):
        tests_passed += 1
    
    # Test 5: Process Financial Analyst Query
    tests_total += 1
    if test_endpoint("Process NL Query - Financial Analyst", "POST", "/mindsdb/process",
                    {"query": "Analyze AAPL stock", "integration": "financial_analyst"}):
        tests_passed += 1
    
    # Test 6: Execute SELECT Query
    tests_total += 1
    if test_endpoint("Execute Query - SELECT", "POST", "/mindsdb/query",
                    {"query": "SELECT * FROM mindsdb.models"}):
        tests_passed += 1
    
    # Test 7: Get Unified Data
    tests_total += 1
    if test_endpoint("Get Unified Financial Data", "GET", "/mindsdb/unified-data/AAPL?data_types=price,fundamentals"):
        tests_passed += 1
    
    # Test 8: Get Financial Insights
    tests_total += 1
    if test_endpoint("Get Financial Insights", "GET", "/mindsdb/financial-insights/AAPL"):
        tests_passed += 1
    
    # Summary
    print(f"\n{'='*60}")
    print(f"SUMMARY: {tests_passed}/{tests_total} tests passed")
    print(f"Success Rate: {(tests_passed/tests_total)*100:.1f}%")
    
    return tests_passed == tests_total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)