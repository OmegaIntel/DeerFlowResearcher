#!/bin/bash

# Comprehensive test suite for OpenBB application
# Tests backend, frontend, and integration

echo "===================================="
echo "   OpenBB Full Test Suite"
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
PASSED=0
FAILED=0
TOTAL=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_status="${3:-200}"
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing $test_name... "
    
    if [[ "$test_command" == curl* ]]; then
        # For curl commands, extract status code
        status=$(eval "$test_command" 2>/dev/null || echo "000")
        if [ "$status" == "$expected_status" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED (HTTP $status)${NC}"
            FAILED=$((FAILED + 1))
            return 1
        fi
    else
        # For other commands
        if eval "$test_command" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ PASSED${NC}"
            PASSED=$((PASSED + 1))
            return 0
        else
            echo -e "${RED}✗ FAILED${NC}"
            FAILED=$((FAILED + 1))
            return 1
        fi
    fi
}

# Function to test API endpoint with data
test_api_endpoint() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local expected="${4:-200}"
    
    if [ "$method" == "GET" ]; then
        run_test "$endpoint" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000$endpoint" "$expected"
    else
        run_test "$endpoint" "curl -s -o /dev/null -w '%{http_code}' -X $method -H 'Content-Type: application/json' -d '$data' http://localhost:8000$endpoint" "$expected"
    fi
}

echo -e "${BLUE}=== 1. Backend Health Checks ===${NC}"
echo ""

# Basic health checks
run_test "Backend health" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health"
run_test "Backend API docs" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/docs"
run_test "Backend OpenAPI schema" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/openapi.json"

echo ""
echo -e "${BLUE}=== 2. API Endpoints Tests ===${NC}"
echo ""

# Status endpoints
test_api_endpoint "/api/v1/status/providers"
test_api_endpoint "/api/v1/status/market"

# Equity endpoints
test_api_endpoint "/api/v1/equity/quote?symbol=AAPL"
test_api_endpoint "/api/v1/equity/historical?symbol=AAPL&start_date=2024-01-01&end_date=2024-01-31"
test_api_endpoint "/api/v1/equity/company-info?symbol=AAPL"
test_api_endpoint "/api/v1/equity/fundamentals?symbol=AAPL"

# News endpoints
test_api_endpoint "/api/v1/news/general"
test_api_endpoint "/api/v1/news/company?symbol=AAPL"

# ETF endpoints
test_api_endpoint "/api/v1/etf/info?symbol=SPY"
test_api_endpoint "/api/v1/etf/holdings?symbol=SPY"
test_api_endpoint "/api/v1/etf/historical?symbol=SPY&start_date=2024-01-01&end_date=2024-01-31"

# Private companies endpoints
test_api_endpoint "/api/v1/private-companies/search?query=openai"
test_api_endpoint "/api/v1/private-companies/company/openai"

# Copilot endpoint
test_api_endpoint "/api/v1/copilot/query" "POST" '{"query":"What is the current stock price of Apple?"}'

echo ""
echo -e "${BLUE}=== 3. Frontend Tests ===${NC}"
echo ""

# Frontend health checks
run_test "Frontend homepage" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
run_test "Frontend assets" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/assets/"

echo ""
echo -e "${BLUE}=== 4. Service Connectivity Tests ===${NC}"
echo ""

# Test Redis
run_test "Redis connection" "redis-cli -h localhost ping | grep -q PONG"

# Test MySQL
run_test "MySQL connection" "mysql -h omega-intelligence.cfggauukayly.us-east-1.rds.amazonaws.com -P 3306 -u admin -p7atwj76e -e 'SELECT 1' omni_ai 2>/dev/null | grep -q 1"

# Test MindsDB
run_test "MindsDB API" "curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{\"query\":\"SELECT 1\"}' http://localhost:47334/api/sql/query | grep -E '200|201'"

# Test OnlyOffice
run_test "OnlyOffice" "curl -s -o /dev/null -w '%{http_code}' http://localhost:9080 | grep -E '200|302'"

echo ""
echo -e "${BLUE}=== 5. Integration Tests ===${NC}"
echo ""

# Test data flow
echo "Testing complete data flow..."

# Create a test query
RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/equity/quote \
    -H "Content-Type: application/json" \
    -d '{"symbol": "AAPL"}' 2>/dev/null || echo "{}")

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "Data flow test: ${RED}✗ FAILED${NC}"
    FAILED=$((FAILED + 1))
else
    echo -e "Data flow test: ${GREEN}✓ PASSED${NC}"
    PASSED=$((PASSED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""
echo -e "${BLUE}=== 6. Performance Tests ===${NC}"
echo ""

# Test response times
echo "Testing API response times..."
START_TIME=$(date +%s%N)
curl -s http://localhost:8000/api/v1/status/providers > /dev/null 2>&1
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( ($END_TIME - $START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    echo -e "API response time: ${GREEN}✓ ${RESPONSE_TIME}ms${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "API response time: ${YELLOW}⚠ ${RESPONSE_TIME}ms (slow)${NC}"
    FAILED=$((FAILED + 1))
fi
TOTAL=$((TOTAL + 1))

echo ""
echo -e "${BLUE}=== 7. Error Handling Tests ===${NC}"
echo ""

# Test error responses
test_api_endpoint "/api/v1/equity/quote?symbol=INVALID_SYMBOL" "GET" "" "404"
test_api_endpoint "/api/v1/nonexistent" "GET" "" "404"
test_api_endpoint "/api/v1/copilot/query" "POST" '{"invalid":"data"}' "422"

echo ""
echo "===================================="
echo "        Test Summary"
echo "===================================="
echo ""
echo -e "Total Tests: ${TOTAL}"
echo -e "Passed: ${GREEN}${PASSED}${NC}"
echo -e "Failed: ${RED}${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "The OpenBB application is fully operational with:"
    echo "  • Backend API running on port 8000"
    echo "  • Frontend running on port 3000"
    echo "  • Database connected to AWS RDS MySQL"
    echo "  • Redis cache operational"
    echo "  • All API endpoints responding correctly"
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Please check:"
    echo "  • Container logs: docker-compose -f docker-compose.aws.yml logs"
    echo "  • API docs: http://localhost:8000/docs"
    echo "  • Frontend: http://localhost:3000"
    exit 1
fi