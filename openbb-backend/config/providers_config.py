"""
Configuration for individual data providers
Each provider has different capabilities and requirements
"""

PROVIDER_INFO = {
    # FREE - No API Key Required
    "yfinance": {
        "name": "Yahoo Finance",
        "requires_key": False,
        "capabilities": [
            "equity.price.historical",
            "equity.fundamental.overview",
            "equity.fundamental.metrics",
            "equity.fundamental.income",
            "equity.fundamental.balance",
            "equity.fundamental.cash",
            "news.company"
        ],
        "limits": "No official limits, but be respectful",
        "signup_url": None
    },
    
    "cboe": {
        "name": "Chicago Board Options Exchange",
        "requires_key": False,
        "capabilities": [
            "equity.price.historical",
            "derivatives.options.chains"
        ],
        "limits": "No official limits",
        "signup_url": None
    },
    
    # FREE TIER AVAILABLE - API Key Required
    "alpha_vantage": {
        "name": "Alpha Vantage",
        "requires_key": True,
        "capabilities": [
            "equity.price.historical",
            "equity.fundamental.overview",
            "equity.fundamental.income",
            "equity.fundamental.balance",
            "equity.fundamental.cash",
            "equity.fundamental.earnings"
        ],
        "limits": "5 API calls/minute, 500 calls/day (free tier)",
        "signup_url": "https://www.alphavantage.co/support/#api-key",
        "env_var": "ALPHA_VANTAGE_API_KEY"
    },
    
    "polygon": {
        "name": "Polygon.io",
        "requires_key": True,
        "capabilities": [
            "equity.price.historical",
            "equity.fundamental.income",
            "equity.fundamental.balance",
            "equity.fundamental.cash",
            "equity.ownership.institutional",
            "news.company"
        ],
        "limits": "5 API calls/minute (free tier)",
        "signup_url": "https://polygon.io/dashboard/signup",
        "env_var": "POLYGON_API_KEY"
    },
    
    "fmp": {
        "name": "Financial Modeling Prep",
        "requires_key": True,
        "capabilities": [
            "equity.price.historical",
            "equity.fundamental.overview",
            "equity.fundamental.metrics",
            "equity.fundamental.income",
            "equity.fundamental.balance",
            "equity.fundamental.cash",
            "equity.fundamental.management",
            "equity.fundamental.filings",
            "equity.estimates.price_target"
        ],
        "limits": "250 API calls/day (free tier)",
        "signup_url": "https://site.financialmodelingprep.com/register",
        "env_var": "FMP_API_KEY"
    },
    
    "intrinio": {
        "name": "Intrinio",
        "requires_key": True,
        "capabilities": [
            "equity.price.historical",
            "equity.fundamental.metrics",
            "equity.fundamental.income",
            "equity.fundamental.balance",
            "equity.fundamental.cash",
            "equity.ownership.institutional"
        ],
        "limits": "100 API calls/day (sandbox/free tier)",
        "signup_url": "https://intrinio.com/signup",
        "env_var": "INTRINIO_API_KEY"
    },
    
    "tiingo": {
        "name": "Tiingo",
        "requires_key": True,
        "capabilities": [
            "equity.price.historical",
            "equity.fundamental.overview",
            "news.company"
        ],
        "limits": "1000 API calls/hour, 50,000/month (free tier)",
        "signup_url": "https://api.tiingo.com/documentation",
        "env_var": "TIINGO_TOKEN"
    },
    
    # GOVERNMENT/PUBLIC DATA - Free
    "fred": {
        "name": "Federal Reserve Economic Data",
        "requires_key": True,  # Key is free but required
        "capabilities": [
            "economy.gdp",
            "economy.inflation",
            "economy.unemployment",
            "fixedincome.government.treasury_rates"
        ],
        "limits": "120 requests/minute (with key)",
        "signup_url": "https://fred.stlouisfed.org/docs/api/api_key.html",
        "env_var": "FRED_API_KEY"
    },
    
    "sec": {
        "name": "Securities and Exchange Commission",
        "requires_key": False,
        "capabilities": [
            "equity.fundamental.filings",
            "equity.fundamental.income",
            "equity.fundamental.balance"
        ],
        "limits": "10 requests/second",
        "signup_url": None
    }
}

# Mapping of OpenBB functions to best free/cheap providers
FUNCTION_TO_PROVIDERS = {
    # Price Data
    "equity.price.historical": ["yfinance", "alpha_vantage", "polygon", "fmp"],
    
    # Fundamental Overview
    "equity.fundamental.overview": ["yfinance", "alpha_vantage", "fmp"],
    
    # Financial Statements
    "equity.fundamental.income": ["yfinance", "polygon", "fmp", "sec"],
    "equity.fundamental.balance": ["yfinance", "polygon", "fmp", "sec"],
    "equity.fundamental.cash": ["yfinance", "polygon", "fmp"],
    
    # Metrics & Ratios
    "equity.fundamental.metrics": ["yfinance", "fmp", "finviz"],
    
    # Company Info
    "equity.fundamental.management": ["fmp"],
    "equity.fundamental.filings": ["sec", "fmp"],
    
    # Ownership
    "equity.ownership.institutional": ["finviz", "polygon"],
    "equity.ownership.share_statistics": ["yfinance"],
    
    # Estimates
    "equity.estimates.price_target": ["benzinga", "fmp"],
    
    # News
    "news.company": ["yfinance", "polygon", "tiingo", "benzinga"],
    
    # Revenue Breakdown (custom implementation needed)
    "equity.fundamental.revenue_per_geography": ["fmp"],  # May need custom parsing
    "equity.fundamental.revenue_per_segment": ["fmp"]     # May need custom parsing
}