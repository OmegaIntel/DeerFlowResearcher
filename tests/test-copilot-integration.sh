#!/bin/bash

echo "Testing Copilot Integration Across All Widgets"
echo "=============================================="
echo ""

# Create a new copilot session
SESSION_ID=$(curl -s -X POST http://localhost/api/v1/copilot/session \
  -H "Content-Type: application/json" \
  -d '{"initial_ticker": "AAPL"}' | jq -r '.data.session_id')

echo "Created session: $SESSION_ID"
echo ""

# Test widget types
WIDGET_TYPES=(
  "company_profile"
  "financial_statements"
  "income_statement"
  "balance_sheet"
  "cash_flow"
  "key_metrics"
  "valuation_multiples"
  "price_chart"
  "revenue_analysis"
  "options_flow"
  "insider_trading"
  "institutional_ownership"
  "news"
  "company_news"
  "management_team"
  "price_performance"
  "revenue_charts"
  "revenue_geography"
  "revenue_segment"
  "share_statistics"
  "ticker_info"
  "company_filings"
  "earnings_transcripts"
  "market_overview"
  "price_target"
)

echo "Testing ${#WIDGET_TYPES[@]} widget types..."
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for WIDGET_TYPE in "${WIDGET_TYPES[@]}"; do
  RESPONSE=$(curl -s -X POST http://localhost/api/v1/copilot/context/add \
    -H "Content-Type: application/json" \
    -d "{
      \"session_id\": \"$SESSION_ID\",
      \"widget_id\": \"test-${WIDGET_TYPE}\",
      \"widget_type\": \"${WIDGET_TYPE}\",
      \"ticker\": \"AAPL\",
      \"title\": \"Test ${WIDGET_TYPE}\",
      \"data\": {\"test\": \"data\"}
    }")
  
  SUCCESS=$(echo "$RESPONSE" | jq -r '.success' 2>/dev/null)
  
  if [ "$SUCCESS" = "true" ]; then
    echo "✅ ${WIDGET_TYPE}: SUCCESS"
    ((SUCCESS_COUNT++))
  else
    ERROR=$(echo "$RESPONSE" | jq -r '.detail[0].msg // .error // "Unknown error"' 2>/dev/null)
    echo "❌ ${WIDGET_TYPE}: FAILED - $ERROR"
    ((FAIL_COUNT++))
  fi
done

echo ""
echo "==============================="
echo "Total widgets tested: ${#WIDGET_TYPES[@]}"
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $FAIL_COUNT"
echo ""

# Get all contexts for the session
echo "Fetching session contexts..."
CONTEXTS=$(curl -s http://localhost/api/v1/copilot/contexts/$SESSION_ID)
CONTEXT_COUNT=$(echo "$CONTEXTS" | jq -r '.total // 0')
echo "Total contexts in session: $CONTEXT_COUNT"