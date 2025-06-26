#!/usr/bin/env python3
"""
Comprehensive MindsDB Integration Test
Tests both backend API and simulated frontend interactions
"""

import requests
import json
import time
from datetime import datetime

API_URL = "http://localhost:8000/api/v1"

class TestResult:
    def __init__(self):
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.results = []
    
    def add_test(self, name, passed, details=""):
        self.total += 1
        if passed:
            self.passed += 1
            status = "✓ PASS"
        else:
            self.failed += 1
            status = "✗ FAIL"
        
        self.results.append({
            "name": name,
            "status": status,
            "details": details
        })
        print(f"{status}: {name}")
        if details:
            print(f"   {details}")
    
    def print_summary(self):
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.total}")
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Success Rate: {(self.passed/self.total)*100:.1f}%")
        
        if self.failed > 0:
            print("\nFailed Tests:")
            for result in self.results:
                if result["status"] == "✗ FAIL":
                    print(f"  - {result['name']}: {result['details']}")

def test_mindsdb_connection():
    """Test MindsDB connection status"""
    try:
        response = requests.get(f"{API_URL}/mindsdb/status")
        data = response.json()
        return data.get("success") and data.get("data", {}).get("connected", False)
    except:
        return False

def test_query_execution(query, expected_success=True):
    """Test SQL query execution"""
    try:
        response = requests.post(f"{API_URL}/mindsdb/query", json={"query": query})
        data = response.json()
        return data.get("success") == expected_success
    except:
        return False

def test_natural_language_processing(query, integration):
    """Test natural language query processing"""
    try:
        response = requests.post(f"{API_URL}/mindsdb/process", 
                               json={"query": query, "integration": integration})
        data = response.json()
        return data.get("success", False) and "data" in data
    except:
        return False

def simulate_chat_interaction():
    """Simulate a chat conversation with MindsDB"""
    conversations = [
        {
            "query": "SHOW DATABASES",
            "integration": "postgresql",
            "description": "List available databases"
        },
        {
            "query": "What tables are available?",
            "integration": "postgresql", 
            "description": "Natural language table query"
        },
        {
            "query": "Analyze the stock market performance today",
            "integration": "financial_analyst",
            "description": "Financial analysis query"
        },
        {
            "query": "SELECT * FROM mindsdb.models",
            "integration": "postgresql",
            "description": "Query MindsDB models"
        }
    ]
    
    results = []
    for conv in conversations:
        try:
            response = requests.post(f"{API_URL}/mindsdb/process",
                                   json={"query": conv["query"], 
                                         "integration": conv["integration"]})
            data = response.json()
            results.append({
                "query": conv["query"],
                "success": data.get("success", False),
                "has_data": "data" in data,
                "description": conv["description"]
            })
        except Exception as e:
            results.append({
                "query": conv["query"],
                "success": False,
                "has_data": False,
                "description": conv["description"],
                "error": str(e)
            })
    
    return results

def main():
    """Run all integration tests"""
    print("MindsDB Integration Tests")
    print("="*60)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"API URL: {API_URL}")
    print("="*60)
    
    results = TestResult()
    
    # Test 1: Basic connectivity
    print("\n1. CONNECTIVITY TESTS")
    print("-"*40)
    results.add_test("MindsDB Service Connection", test_mindsdb_connection())
    
    # Test 2: Database operations
    print("\n2. DATABASE OPERATIONS")
    print("-"*40)
    results.add_test("List Databases", test_query_execution("SHOW DATABASES"))
    results.add_test("Query Information Schema", 
                    test_query_execution("SELECT * FROM information_schema.tables LIMIT 5"))
    results.add_test("Invalid Query Handling", 
                    test_query_execution("INVALID SQL QUERY", expected_success=False))
    
    # Test 3: Natural Language Processing
    print("\n3. NATURAL LANGUAGE PROCESSING")
    print("-"*40)
    
    nl_tests = [
        ("Show all tables", "postgresql"),
        ("List available models", "postgresql"),
        ("Analyze AAPL stock", "financial_analyst"),
        ("What is the current market trend?", "financial_analyst")
    ]
    
    for query, integration in nl_tests:
        results.add_test(f"NL Query: '{query}' ({integration})", 
                        test_natural_language_processing(query, integration))
    
    # Test 4: Chat Simulation
    print("\n4. CHAT INTERACTION SIMULATION")
    print("-"*40)
    
    chat_results = simulate_chat_interaction()
    for result in chat_results:
        test_name = f"Chat: {result['description']}"
        passed = result['success'] and result['has_data']
        details = result.get('error', '') if not passed else ""
        results.add_test(test_name, passed, details)
    
    # Test 5: Data Source Operations
    print("\n5. DATA SOURCE OPERATIONS")
    print("-"*40)
    
    try:
        response = requests.get(f"{API_URL}/mindsdb/data-sources")
        data = response.json()
        has_sources = data.get("success") and isinstance(data.get("data"), dict)
        results.add_test("List Data Sources", has_sources)
    except:
        results.add_test("List Data Sources", False, "Request failed")
    
    # Test 6: Model Operations
    print("\n6. MODEL OPERATIONS")
    print("-"*40)
    
    results.add_test("Query Models Table", 
                    test_query_execution("SELECT * FROM mindsdb.models"))
    results.add_test("Query Handlers Table",
                    test_query_execution("SELECT * FROM mindsdb.handlers LIMIT 5"))
    
    # Test 7: Integration-specific queries
    print("\n7. INTEGRATION-SPECIFIC QUERIES")
    print("-"*40)
    
    integrations = ["postgresql", "mysql", "mongodb", "openai", "financial_analyst"]
    for integration in integrations:
        query = "Test query" if integration != "financial_analyst" else "What is AAPL price?"
        results.add_test(f"Integration Test: {integration}",
                        test_natural_language_processing(query, integration))
    
    # Print summary
    results.print_summary()
    
    # Save results to file
    with open("/tmp/mindsdb-test-results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "total": results.total,
                "passed": results.passed,
                "failed": results.failed,
                "success_rate": f"{(results.passed/results.total)*100:.1f}%"
            },
            "results": results.results
        }, f, indent=2)
    
    print(f"\nResults saved to: /tmp/mindsdb-test-results.json")
    
    return results.failed == 0

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)