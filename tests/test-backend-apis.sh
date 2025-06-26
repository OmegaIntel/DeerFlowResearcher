#!/bin/bash

# Backend API Test Script
# Run this on the EC2 instance to test all backend endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL - use localhost when running on EC2
BASE_URL="http://localhost:8000/api/v1"

echo -e "${YELLOW}OpenBB Backend API Test Suite${NC}"
echo "================================"
echo "Testing from: $BASE_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local endpoint=$2
    local expected=$3
    
    echo -n "Testing $name: "
    
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL/$endpoint" 2>/dev/null)
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "200" ]; then
        if echo "$body" | grep -q "$expected" 2>/dev/null; then
            echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
            return 0
        else
            echo -e "${RED}✗ FAIL${NC} (HTTP $http_code - Expected '$expected' not found)"
            echo "  Response: $(echo "$body" | head -c 100)..."
            return 1
        fi
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        return 1
    fi
}

# Test counters
total=0
passed=0

# Run tests
echo -e "${YELLOW}1. Infrastructure Endpoints${NC}"
test_endpoint "Health Check" "health" '"status":"healthy"' && ((passed++)); ((total++))

echo -e "\n${YELLOW}2. Equity Data Endpoints${NC}"
test_endpoint "Company Profile" "equity/fundamental/overview?symbol=AAPL" '"success":true' && ((passed++)); ((total++))
test_endpoint "Price Quote" "equity/price/quote?symbol=AAPL" '"success":true' && ((passed++)); ((total++))
test_endpoint "Key Metrics" "equity/fundamental/metrics?symbol=AAPL&period=annual&limit=1&with_ttm=true" '"success":true' && ((passed++)); ((total++))
test_endpoint "Share Statistics" "equity/ownership/share-statistics?symbol=AAPL" '"success":true' && ((passed++)); ((total++))
test_endpoint "Management Team" "equity/fundamental/management?symbol=AAPL" '"success":true' && ((passed++)); ((total++))
test_endpoint "Company News" "news/company?symbol=AAPL&limit=5" '"success":true' && ((passed++)); ((total++))
test_endpoint "Price Target" "equity/estimates/price-target?symbol=AAPL" '"success":true' && ((passed++)); ((total++))

echo -e "\n${YELLOW}3. Financial Statements${NC}"
test_endpoint "Income Statement" "equity/fundamental/income?symbol=AAPL&period=annual&limit=1" '"success":true' && ((passed++)); ((total++))
test_endpoint "Balance Sheet" "equity/fundamental/balance?symbol=AAPL&period=annual&limit=1" '"success":true' && ((passed++)); ((total++))
test_endpoint "Cash Flow" "equity/fundamental/cash?symbol=AAPL&period=annual&limit=1" '"success":true' && ((passed++)); ((total++))

echo -e "\n${YELLOW}4. Private Companies${NC}"
test_endpoint "Company List" "private-companies/list?limit=5" '"success":true' && ((passed++)); ((total++))
test_endpoint "Filter Options" "private-companies/filters" '"success":true' && ((passed++)); ((total++))
test_endpoint "Statistics" "private-companies/statistics" '"success":true' && ((passed++)); ((total++))

echo -e "\n${YELLOW}5. MindsDB Integration${NC}"
test_endpoint "MindsDB Status" "mindsdb/status" '"connected":true' && ((passed++)); ((total++))

echo -e "\n${YELLOW}6. Market Data${NC}"
test_endpoint "Market Overview" "equity/market/overview" '"success":true' && ((passed++)); ((total++))

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"
echo -e "Total Tests: $total"
echo -e "Passed: ${GREEN}$passed${NC}"
echo -e "Failed: ${RED}$((total - passed))${NC}"

if [ $passed -eq $total ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi