#!/bin/bash

echo "Testing Copilot Chat Functionality"
echo "=================================="
echo ""

# Create a new session
SESSION_RESPONSE=$(curl -s -X POST http://localhost/api/v1/copilot/session \
  -H "Content-Type: application/json" \
  -d '{"initial_ticker": "AAPL"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.data.session_id')
echo "Created session: $SESSION_ID"
echo ""

# Add some widget context
echo "Adding widget contexts..."

# Add company profile
curl -s -X POST http://localhost/api/v1/copilot/context/add \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"widget_id\": \"profile-widget\",
    \"widget_type\": \"company_profile\",
    \"ticker\": \"AAPL\",
    \"title\": \"Company Profile - AAPL\",
    \"data\": {
      \"name\": \"Apple Inc.\",
      \"sector\": \"Technology\",
      \"industry\": \"Consumer Electronics\",
      \"marketCap\": 3500000000000,
      \"employees\": 164000
    }
  }" > /dev/null

# Add financial data
curl -s -X POST http://localhost/api/v1/copilot/context/add \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"widget_id\": \"financials-widget\",
    \"widget_type\": \"financial_statements\",
    \"ticker\": \"AAPL\",
    \"title\": \"Financial Statements - AAPL\",
    \"data\": {
      \"revenue\": [391035000000, 383285000000, 394328000000],
      \"netIncome\": [93736000000, 96995000000, 99803000000],
      \"years\": [\"2024\", \"2023\", \"2022\"]
    }
  }" > /dev/null

echo "✅ Added 2 widget contexts"
echo ""

# Test chat
echo "Testing chat functionality..."
echo "----------------------------"

# Send a chat message
CHAT_RESPONSE=$(curl -s -X POST http://localhost/api/v1/copilot/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"message\": \"What is Apple's revenue trend over the last 3 years?\"
  }")

echo "User: What is Apple's revenue trend over the last 3 years?"
echo ""
echo "Assistant response:"
echo "$CHAT_RESPONSE" | jq -r '.response // .detail // "No response"'
echo ""

# Send another message
CHAT_RESPONSE2=$(curl -s -X POST http://localhost/api/v1/copilot/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"session_id\": \"$SESSION_ID\",
    \"message\": \"How many employees does Apple have?\"
  }")

echo "User: How many employees does Apple have?"
echo ""
echo "Assistant response:"
echo "$CHAT_RESPONSE2" | jq -r '.response // .detail // "No response"'