#!/bin/bash

BASE_URL="http://localhost/api/v1"

echo "Testing OpenBB API Endpoints..."
echo "=============================="
echo ""

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    
    response=$(curl -s "$url")
    success=$(echo "$response" | jq -r '.success' 2>/dev/null)
    
    if [ "$success" = "true" ]; then
        data_count=$(echo "$response" | jq -r '.data | if type == "array" then length elif type == "object" then 1 else 0 end' 2>/dev/null)
        echo "✅ $name: SUCCESS (data items: $data_count)"
    elif [ "$success" = "false" ]; then
        error=$(echo "$response" | jq -r '.error' 2>/dev/null)
        echo "❌ $name: FAILED - $error"
    else
        echo "❌ $name: FAILED - Invalid response"
    fi
}

# Test endpoints
echo "📊 Equity Endpoints:"
test_endpoint "Price Historical" "$BASE_URL/equity/price/historical?symbol=AAPL"
test_endpoint "Company Overview" "$BASE_URL/equity/fundamental/overview?symbol=AAPL"
test_endpoint "Key Metrics" "$BASE_URL/equity/fundamental/metrics?symbol=AAPL&period=annual&limit=1"
test_endpoint "Share Statistics" "$BASE_URL/equity/ownership/share-statistics?symbol=AAPL"
test_endpoint "Management Team" "$BASE_URL/equity/fundamental/management?symbol=AAPL"
test_endpoint "Income Statement" "$BASE_URL/equity/fundamental/income-statement?symbol=AAPL&period=annual&limit=3"
test_endpoint "Balance Sheet" "$BASE_URL/equity/fundamental/balance-sheet?symbol=AAPL&period=annual&limit=3"
test_endpoint "Cash Flow" "$BASE_URL/equity/fundamental/cash-flow?symbol=AAPL&period=annual&limit=3"
test_endpoint "Revenue Geography" "$BASE_URL/equity/fundamental/revenue-geography?symbol=AAPL"
test_endpoint "Revenue Segments" "$BASE_URL/equity/fundamental/revenue-segment?symbol=AAPL"

echo ""
echo "📰 News Endpoints:"
test_endpoint "Company News" "$BASE_URL/news/company?symbol=AAPL&limit=5"

echo ""
echo "📈 ETF Endpoints:"
test_endpoint "ETF Info" "$BASE_URL/etf/info?symbol=SPY"

echo ""
echo "🤖 Copilot Endpoints:"
# Test POST endpoint
response=$(curl -s -X POST "$BASE_URL/copilot/session" -H "Content-Type: application/json" -d '{"initial_ticker": "AAPL"}')
success=$(echo "$response" | jq -r '.success' 2>/dev/null)
if [ "$success" = "true" ]; then
    session_id=$(echo "$response" | jq -r '.data.session_id' 2>/dev/null)
    echo "✅ Create Copilot Session: SUCCESS (session_id: ${session_id:0:8}...)"
else
    echo "❌ Create Copilot Session: FAILED"
fi

echo ""
echo "=============================="
echo "Test completed!"