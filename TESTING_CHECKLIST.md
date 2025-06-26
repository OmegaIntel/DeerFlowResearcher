# OpenBB Terminal Testing Checklist

## Access Points

### Production Access (Recommended)
- **Frontend Direct**: http://ec2-100-26-54-124.compute-1.amazonaws.com:3000
- **Backend API**: http://ec2-100-26-54-124.compute-1.amazonaws.com:8000
- **Through Nginx**: http://ec2-100-26-54-124.compute-1.amazonaws.com:80

### Local Port Forwarding (Development)
- **Frontend**: http://localhost:3000 (SSH tunnel: `ssh -L 3000:localhost:3000 user@ec2-instance`)
- **Backend**: http://localhost:8000 (SSH tunnel: `ssh -L 8000:localhost:8000 user@ec2-instance`)

## Testing Checklist

### 1. Infrastructure Tests
- [ ] All Docker containers running
  ```bash
  docker ps
  # Should show: frontend, backend, mindsdb, redis, nginx
  ```
- [ ] Network connectivity between containers
  ```bash
  docker exec openbb-frontend-1 ping -c 1 backend
  docker exec openbb-backend-1 ping -c 1 redis
  ```

### 2. Backend API Tests
Test directly on EC2 instance or through proper URL:

- [ ] Health Check
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/health
  ```

- [ ] Company Profile
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/equity/fundamental/overview?symbol=AAPL
  ```

- [ ] Price Quote
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/equity/price/quote?symbol=AAPL
  ```

- [ ] Key Metrics
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/equity/fundamental/metrics?symbol=AAPL&period=annual&limit=1&with_ttm=true
  ```

- [ ] Share Statistics
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/equity/ownership/share-statistics?symbol=AAPL
  ```

- [ ] Management Team
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/equity/fundamental/management?symbol=AAPL
  ```

- [ ] Company News
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/news/company?symbol=AAPL&limit=10
  ```

- [ ] Private Companies
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/private-companies/list?limit=5
  ```

- [ ] MindsDB Status
  ```bash
  curl http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1/mindsdb/status
  ```

### 3. Frontend Feature Tests
Access via: http://ec2-100-26-54-124.compute-1.amazonaws.com:3000

#### Overview Tab
- [ ] Ticker Info widget displays current price
- [ ] Company Profile shows company details
- [ ] Price Performance chart loads
- [ ] Company News shows recent articles
- [ ] Key Metrics displays financial ratios
- [ ] Share Statistics shows market data
- [ ] Management Team lists executives
- [ ] Valuation Multiples shows P/E, P/B, etc.
- [ ] Price Target shows analyst estimates
- [ ] Company Filings lists SEC documents

#### Financials Tab
- [ ] Financial Statements widget loads
- [ ] Income Statement tab shows revenue/expenses
- [ ] Balance Sheet tab shows assets/liabilities
- [ ] Cash Flow Statement tab shows cash movements
- [ ] Can switch between Annual/Quarterly views
- [ ] Data exports to CSV correctly

#### Ownership Tab
- [ ] Institutional Ownership chart displays
- [ ] Insider Trading table shows transactions
- [ ] Ownership percentages calculated correctly

#### Comparison Tab
- [ ] Can add multiple tickers for comparison
- [ ] Comparison metrics display side-by-side
- [ ] Charts update with selected tickers

#### Private Companies Tab
- [ ] Company list loads with pagination
- [ ] Search functionality works
- [ ] Filters dropdown opens and filters apply:
  - [ ] Industry filter
  - [ ] State filter
  - [ ] Status filter
  - [ ] Data Source filter (includes "Non-PPP Companies")
  - [ ] Founded Year range
  - [ ] Employee Count range
- [ ] Company details modal opens on click
- [ ] Export to CSV works
- [ ] PPP Loan column shows loan amounts

#### MindsDB Tab
- [ ] Connection status shows "Connected"
- [ ] Can execute SQL queries
- [ ] Integration dropdown shows available options
- [ ] Query results display in table format

#### Templates Tab
- [ ] Template list displays
- [ ] Can preview templates
- [ ] Excel/spreadsheet viewer works

### 4. Copilot Tests
- [ ] Floating copilot button visible
- [ ] Copilot chat opens when clicked
- [ ] Can send messages and receive responses
- [ ] Context awareness works (knows current ticker/widget)
- [ ] Chat history persists

### 5. Cross-Feature Tests
- [ ] Ticker selector updates all widgets
- [ ] Dashboard switching maintains state
- [ ] Can create new dashboards
- [ ] Can add/remove widgets
- [ ] Widget settings/customization works
- [ ] Dark/Light theme toggle works
- [ ] Data caching works (subsequent loads are faster)

### 6. Performance Tests
- [ ] Initial page load < 3 seconds
- [ ] API responses < 1 second
- [ ] Widget updates < 500ms
- [ ] No memory leaks after extended use
- [ ] Cache properly stores data for 1 week

### 7. Integration Tests
- [ ] Frontend → Backend API calls succeed
- [ ] Backend → Redis caching works
- [ ] Backend → MindsDB connection stable
- [ ] Real-time data updates work
- [ ] Multi-provider fallback works

### 8. Error Handling Tests
- [ ] Invalid ticker shows appropriate error
- [ ] Network failure shows retry option
- [ ] API errors display user-friendly messages
- [ ] No white screen of death on errors

## Known Issues & Solutions

### CORS Issues with Port Forwarding
- **Problem**: API calls fail when accessing through localhost:55711
- **Solution**: Use EC2 public URL or configure proper CORS headers

### Empty Overview Tab
- **Problem**: Widgets show "Error loading..." messages
- **Solution**: 
  1. Clear browser cache and localStorage
  2. Ensure accessing via correct URL
  3. Check browser console for specific errors

### MindsDB Disconnected
- **Problem**: MindsDB shows disconnected status
- **Solution**: Check MindsDB container is running and accessible on ports 47334-47335

## Test Execution Commands

### Quick Backend Test Suite
```bash
#!/bin/bash
BASE_URL="http://ec2-100-26-54-124.compute-1.amazonaws.com:8000/api/v1"
echo "Testing Backend APIs..."

# Test each endpoint
endpoints=(
  "health"
  "equity/fundamental/overview?symbol=AAPL"
  "equity/price/quote?symbol=AAPL"
  "equity/fundamental/metrics?symbol=AAPL&period=annual&limit=1"
  "private-companies/list?limit=1"
  "mindsdb/status"
)

for endpoint in "${endpoints[@]}"; do
  echo -n "Testing $endpoint: "
  if curl -s "$BASE_URL/$endpoint" | grep -q '"success":true'; then
    echo "✓ PASS"
  else
    echo "✗ FAIL"
  fi
done
```

### Browser Console Tests
```javascript
// Paste in browser console at http://ec2-100-26-54-124.compute-1.amazonaws.com:3000

// Test API connectivity
fetch('/api/v1/equity/price/quote?symbol=AAPL')
  .then(r => r.json())
  .then(d => console.log('API Test:', d.success ? '✓ PASS' : '✗ FAIL', d));

// Check localStorage cache
console.log('Cache entries:', Object.keys(localStorage).filter(k => k.includes('openbb')));

// Check React components
console.log('React loaded:', typeof React !== 'undefined' ? '✓ PASS' : '✗ FAIL');
```

## Recommended Testing Order

1. **Infrastructure First**: Verify all containers are running
2. **Backend APIs**: Test each endpoint directly
3. **Frontend Access**: Use EC2 public URL, not localhost
4. **Feature by Feature**: Test each tab systematically
5. **Integration**: Test cross-feature functionality
6. **Performance**: Check caching and load times

## Notes
- Always test using the EC2 public URL when possible
- Clear cache between major tests
- Document any new issues found
- Update this checklist as features are added