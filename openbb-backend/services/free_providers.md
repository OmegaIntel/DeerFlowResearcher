# Free Data Providers for OpenBB

## No API Key Required:
1. **Yahoo Finance** - Historical prices, basic fundamentals
   ```python
   obb.equity.price.historical(symbol="AAPL", provider="yahoo")
   ```

2. **CBOE** - Options data
   ```python
   obb.derivatives.options.chains(symbol="AAPL", provider="cboe")
   ```

## Free API Keys Available:
1. **Alpha Vantage** (500 requests/day free)
   - https://www.alphavantage.co/support/#api-key
   
2. **Polygon.io** (5 requests/min free)
   - https://polygon.io/dashboard/api-keys
   
3. **Financial Modeling Prep** (250 requests/day free)
   - https://site.financialmodelingprep.com/developer/docs

4. **Fred (Federal Reserve)** (Unlimited, but need key)
   - https://fred.stlouisfed.org/docs/api/api_key.html

5. **Nasdaq Data Link** (Limited free tier)
   - https://data.nasdaq.com/sign-up

## Environment Variables Setup:
```bash
# Add to .env file
ALPHA_VANTAGE_API_KEY=your_key_here
POLYGON_API_KEY=your_key_here
FMP_API_KEY=your_key_here
FRED_API_KEY=your_key_here
```