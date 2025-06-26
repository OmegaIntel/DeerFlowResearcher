from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from config import settings
import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
import json

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="OpenBB Backend API - Complete Version"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request bodies
class CopilotQuery(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

class MindsDBQuery(BaseModel):
    query: str
    database: Optional[str] = "mindsdb"

@app.get("/")
def root():
    return {
        "message": "OpenBB Backend API is running",
        "version": "1.0.0",
        "status": "operational"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "backend",
        "database": "AWS RDS MySQL",
        "cache": "Redis"
    }

@app.get("/api/v1/status/providers")
def get_providers():
    """Get list of available data providers"""
    return {
        "success": True,
        "data": {
            "providers": [
                {"name": "Alpha Vantage", "status": "active", "key_configured": bool(os.getenv("ALPHA_VANTAGE_API_KEY"))},
                {"name": "Polygon", "status": "active", "key_configured": bool(os.getenv("POLYGON_API_KEY"))},
                {"name": "FMP", "status": "active", "key_configured": bool(os.getenv("FMP_API_KEY"))},
                {"name": "Benzinga", "status": "active", "key_configured": bool(os.getenv("BENZINGA_API_KEY"))},
                {"name": "YFinance", "status": "active", "key_configured": True},
                {"name": "API Ninjas", "status": "active", "key_configured": bool(os.getenv("API_NINJAS_KEY"))},
                {"name": "OpenAI", "status": "active", "key_configured": bool(os.getenv("OPENAI_API_KEY"))}
            ]
        }
    }

@app.get("/api/v1/status/market")
def get_market_status():
    """Get current market status"""
    import yfinance as yf
    from datetime import datetime
    import pytz
    
    # Get current time in EST/EDT
    est = pytz.timezone('US/Eastern')
    now = datetime.now(est)
    hour = now.hour
    weekday = now.weekday()
    
    # Determine market status
    is_weekend = weekday >= 5
    is_holiday = False  # Would need a holiday calendar
    
    if is_weekend or is_holiday:
        market_status = "closed"
        next_open = "Monday 9:30 AM EST"
    elif hour < 9 or (hour == 9 and now.minute < 30):
        market_status = "pre-market"
        next_open = "Today 9:30 AM EST"
    elif hour >= 16:
        market_status = "after-hours"
        next_open = "Tomorrow 9:30 AM EST"
    else:
        market_status = "open"
        next_open = None
    
    # Get major indices
    indices = {}
    for symbol, name in [("^GSPC", "S&P 500"), ("^DJI", "Dow Jones"), ("^IXIC", "NASDAQ")]:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            indices[name] = {
                "value": info.get('regularMarketPrice', 0),
                "change": info.get('regularMarketChange', 0),
                "changePercent": info.get('regularMarketChangePercent', 0)
            }
        except:
            indices[name] = {"value": 0, "change": 0, "changePercent": 0}
    
    return {
        "success": True,
        "data": {
            "status": market_status,
            "timestamp": now.isoformat(),
            "next_open": next_open,
            "indices": indices
        }
    }

# Equity endpoints
@app.get("/api/v1/equity/quote")
@app.get("/api/v1/openbb/quote/{symbol}")
async def get_quote(symbol: str):
    """Get a real stock quote using yfinance"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Check if this is a valid symbol
        if not info or 'symbol' not in info:
            raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
        
        # Get current price from fast_info if available
        try:
            current_price = ticker.fast_info.price
        except:
            current_price = info.get('currentPrice', 0)
        
        # If price is 0 or None, use previousClose (market closed)
        if not current_price:
            current_price = info.get('previousClose', 0)
        
        # If no price data available, it's likely an invalid symbol
        if not current_price and not info.get('previousClose'):
            raise HTTPException(status_code=404, detail=f"No data available for symbol {symbol}")
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "price": current_price,
                "previousClose": info.get('previousClose', 0),
                "change": current_price - info.get('previousClose', 0) if current_price and info.get('previousClose') else 0,
                "changePercent": ((current_price - info.get('previousClose', 0)) / info.get('previousClose', 1) * 100) if current_price and info.get('previousClose') else 0,
                "volume": info.get('volume', 0),
                "marketCap": info.get('marketCap', 0),
                "dayHigh": info.get('dayHigh', 0),
                "dayLow": info.get('dayLow', 0),
                "52WeekHigh": info.get('fiftyTwoWeekHigh', 0),
                "52WeekLow": info.get('fiftyTwoWeekLow', 0),
                "dividendYield": info.get('dividendYield', 0),
                "trailingPE": info.get('trailingPE', 0),
                "forwardPE": info.get('forwardPE', 0),
                "beta": info.get('beta', 0)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/historical")
@app.get("/api/v1/equity/price/historical")
@app.get("/api/v1/openbb/historical/{symbol}")
async def get_historical_price(
    symbol: str,
    interval: str = Query(default="1d", description="Valid intervals: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo"),
    period: str = Query(default="1mo", description="Valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get historical price data"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        if start_date and end_date:
            hist = ticker.history(start=start_date, end=end_date, interval=interval)
        else:
            hist = ticker.history(period=period, interval=interval)
        
        data = []
        for index, row in hist.iterrows():
            data.append({
                "date": index.strftime("%Y-%m-%d"),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        return {
            "success": True,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/company")
@app.get("/api/v1/equity/company-info")
@app.get("/api/v1/equity/fundamental/overview")
@app.get("/api/v1/openbb/profile/{symbol}")
async def get_company_info(symbol: str):
    """Get company information"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "companyName": info.get('longName', ''),
                "industry": info.get('industry', ''),
                "sector": info.get('sector', ''),
                "description": info.get('longBusinessSummary', ''),
                "website": info.get('website', ''),
                "country": info.get('country', ''),
                "employees": info.get('fullTimeEmployees', 0),
                "headquarters": f"{info.get('city', '')}, {info.get('state', '')} {info.get('country', '')}".strip(),
                "phone": info.get('phone', ''),
                "address": info.get('address1', ''),
                "zip": info.get('zip', '')
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamentals")
async def get_fundamentals(symbol: str):
    """Get company fundamentals"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "marketCap": info.get('marketCap', 0),
                "enterpriseValue": info.get('enterpriseValue', 0),
                "trailingPE": info.get('trailingPE', 0),
                "forwardPE": info.get('forwardPE', 0),
                "pegRatio": info.get('pegRatio', 0),
                "priceToSalesTrailing12Months": info.get('priceToSalesTrailing12Months', 0),
                "priceToBook": info.get('priceToBook', 0),
                "enterpriseToRevenue": info.get('enterpriseToRevenue', 0),
                "enterpriseToEbitda": info.get('enterpriseToEbitda', 0),
                "beta": info.get('beta', 0),
                "52WeekChange": info.get('52WeekChange', 0),
                "sharesOutstanding": info.get('sharesOutstanding', 0),
                "floatShares": info.get('floatShares', 0),
                "sharesShort": info.get('sharesShort', 0),
                "shortRatio": info.get('shortRatio', 0),
                "shortPercentOfFloat": info.get('shortPercentOfFloat', 0),
                "impliedSharesOutstanding": info.get('impliedSharesOutstanding', 0),
                "bookValue": info.get('bookValue', 0),
                "lastFiscalYearEnd": info.get('lastFiscalYearEnd', 0),
                "nextFiscalYearEnd": info.get('nextFiscalYearEnd', 0),
                "mostRecentQuarter": info.get('mostRecentQuarter', 0),
                "netIncomeToCommon": info.get('netIncomeToCommon', 0),
                "trailingEps": info.get('trailingEps', 0),
                "forwardEps": info.get('forwardEps', 0),
                "lastDividendValue": info.get('lastDividendValue', 0),
                "lastDividendDate": info.get('lastDividendDate', 0)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# News endpoints
@app.get("/api/v1/news/general")
async def get_general_news(limit: int = Query(default=10, ge=1, le=100)):
    """Get general market news using multiple sources"""
    try:
        articles = []
        
        # Try Benzinga if available
        benzinga_key = os.getenv("BENZINGA_API_KEY")
        if benzinga_key:
            import requests
            url = f"https://api.benzinga.com/api/v2/news?token={benzinga_key}&pageSize={limit}"
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get('data', [])[:limit]:
                        articles.append({
                            "title": item.get('title', ''),
                            "summary": item.get('teaser', ''),
                            "source": "Benzinga",
                            "publishedAt": item.get('created', ''),
                            "url": item.get('url', '')
                        })
            except:
                pass
        
        # If no articles yet, use mock data
        if not articles:
            for i in range(limit):
                articles.append({
                    "title": f"Market Update {i+1}: S&P 500 Reaches New Heights",
                    "summary": "The S&P 500 index continues its upward trajectory as tech stocks lead the rally.",
                    "source": "Financial Times",
                    "publishedAt": (datetime.now() - timedelta(hours=i)).isoformat(),
                    "url": f"https://example.com/news/{i+1}"
                })
        
        return {
            "success": True,
            "data": {
                "articles": articles
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/news/company")
@app.get("/api/v1/openbb/news/{symbol}")
async def get_company_news(symbol: str, limit: int = Query(default=10, ge=1, le=100)):
    """Get company-specific news using multiple sources"""
    try:
        articles = []
        
        # Try Benzinga first
        benzinga_key = os.getenv("BENZINGA_API_KEY")
        if benzinga_key:
            import requests
            url = f"https://api.benzinga.com/api/v2/news?token={benzinga_key}&tickers={symbol}&pageSize={limit}"
            try:
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    for item in data.get('data', [])[:limit]:
                        articles.append({
                            "title": item.get('title', ''),
                            "summary": item.get('teaser', ''),
                            "source": "Benzinga",
                            "publishedAt": item.get('created', ''),
                            "url": item.get('url', ''),
                            "tickers": [symbol.upper()]
                        })
            except:
                pass
        
        # Also get yfinance news
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        news = ticker.news
        
        for article in news[:limit]:
            # Handle the timestamp properly
            timestamp = article.get('providerPublishTime', None)
            if timestamp and timestamp > 0:
                published_date = datetime.fromtimestamp(timestamp).isoformat()
            else:
                published_date = datetime.now().isoformat()  # Default to current time
                
            articles.append({
                "title": article.get('title', ''),
                "summary": article.get('summary', ''),
                "source": article.get('publisher', ''),
                "publishedAt": published_date,
                "url": article.get('link', ''),
                "tickers": [symbol.upper()] + article.get('relatedTickers', [])
            })
        
        # Remove duplicates and limit
        seen = set()
        unique_articles = []
        for article in articles:
            # Only add articles with valid titles
            if article['title'] and article['title'] not in seen:
                seen.add(article['title'])
                unique_articles.append(article)
        
        # If no real articles, provide mock data
        if not unique_articles:
            # Mock news data with proper format
            mock_articles = [
                {
                    "title": f"{symbol.upper()} Reports Strong Q4 Earnings Beat",
                    "summary": f"{symbol.upper()} exceeded analyst expectations with strong revenue growth driven by increased demand.",
                    "source": "Financial Times",
                    "publishedAt": datetime.now().isoformat(),
                    "url": f"https://example.com/news/{symbol.lower()}-q4-earnings",
                    "tickers": [symbol.upper()]
                },
                {
                    "title": f"Analysts Upgrade {symbol.upper()} Price Target Following Product Launch",
                    "summary": f"Multiple Wall Street firms raised their price targets for {symbol.upper()} after successful new product rollout.",
                    "source": "Reuters",
                    "publishedAt": (datetime.now() - timedelta(hours=3)).isoformat(),
                    "url": f"https://example.com/news/{symbol.lower()}-upgrade",
                    "tickers": [symbol.upper()]
                },
                {
                    "title": f"{symbol.upper()} Announces Strategic Partnership",
                    "summary": f"{symbol.upper()} enters strategic partnership to expand market reach and accelerate growth initiatives.",
                    "source": "Bloomberg",
                    "publishedAt": (datetime.now() - timedelta(days=1)).isoformat(),
                    "url": f"https://example.com/news/{symbol.lower()}-partnership",
                    "tickers": [symbol.upper()]
                },
                {
                    "title": f"Market Analysis: {symbol.upper()} Positioned for Growth",
                    "summary": f"Industry analysts highlight {symbol.upper()}'s competitive advantages and growth potential in expanding markets.",
                    "source": "CNBC",
                    "publishedAt": (datetime.now() - timedelta(days=2)).isoformat(),
                    "url": f"https://example.com/news/{symbol.lower()}-analysis",
                    "tickers": [symbol.upper()]
                },
                {
                    "title": f"{symbol.upper()} CEO Discusses Future Strategy",
                    "summary": f"In recent interview, {symbol.upper()} CEO outlines company's strategic vision and investment priorities.",
                    "source": "Wall Street Journal",
                    "publishedAt": (datetime.now() - timedelta(days=3)).isoformat(),
                    "url": f"https://example.com/news/{symbol.lower()}-ceo-interview",
                    "tickers": [symbol.upper()]
                }
            ]
            unique_articles = mock_articles[:limit]
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "articles": unique_articles[:limit]
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ETF endpoints
@app.get("/api/v1/etf/quote")
@app.get("/api/v1/etf/info")
async def get_etf_quote(symbol: str):
    """Get ETF quote data"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # ETFs have similar data to stocks
        try:
            current_price = ticker.fast_info.price
        except:
            current_price = info.get('navPrice', info.get('currentPrice', 0))
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "name": info.get('longName', ''),
                "price": current_price,
                "previousClose": info.get('previousClose', 0),
                "change": current_price - info.get('previousClose', 0) if current_price and info.get('previousClose') else 0,
                "changePercent": ((current_price - info.get('previousClose', 0)) / info.get('previousClose', 1) * 100) if current_price and info.get('previousClose') else 0,
                "volume": info.get('volume', 0),
                "totalAssets": info.get('totalAssets', 0),
                "yield": info.get('yield', 0),
                "ytdReturn": info.get('ytdReturn', 0),
                "threeYearAverageReturn": info.get('threeYearAverageReturn', 0),
                "fiveYearAverageReturn": info.get('fiveYearAverageReturn', 0),
                "category": info.get('category', ''),
                "fundFamily": info.get('fundFamily', ''),
                "fundInceptionDate": info.get('fundInceptionDate', ''),
                "expenseRatio": info.get('annualReportExpenseRatio', 0)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/etf/holdings")
async def get_etf_holdings(symbol: str):
    """Get ETF holdings"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get top holdings if available
        holdings = []
        for i in range(10):  # Top 10 holdings
            holding_name = info.get(f'holdings_{i}_name')
            holding_percent = info.get(f'holdings_{i}_percent')
            if holding_name:
                holdings.append({
                    "name": holding_name,
                    "percent": holding_percent
                })
        
        # If no holdings found, provide sample data for major ETFs
        if not holdings and symbol.upper() in ['SPY', 'QQQ', 'IWM']:
            if symbol.upper() == 'SPY':
                holdings = [
                    {"name": "Apple Inc", "symbol": "AAPL", "percent": 7.2},
                    {"name": "Microsoft Corp", "symbol": "MSFT", "percent": 6.8},
                    {"name": "Amazon.com Inc", "symbol": "AMZN", "percent": 3.5},
                    {"name": "NVIDIA Corp", "symbol": "NVDA", "percent": 3.2},
                    {"name": "Alphabet Inc Class A", "symbol": "GOOGL", "percent": 2.1}
                ]
            elif symbol.upper() == 'QQQ':
                holdings = [
                    {"name": "Apple Inc", "symbol": "AAPL", "percent": 12.5},
                    {"name": "Microsoft Corp", "symbol": "MSFT", "percent": 11.8},
                    {"name": "Amazon.com Inc", "symbol": "AMZN", "percent": 6.2},
                    {"name": "NVIDIA Corp", "symbol": "NVDA", "percent": 5.8},
                    {"name": "Meta Platforms Inc", "symbol": "META", "percent": 4.3}
                ]
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "holdings": holdings,
                "totalHoldings": len(holdings),
                "lastUpdated": datetime.now().isoformat()
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/etf/historical")
async def get_etf_historical(
    symbol: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    interval: str = Query(default="1d")
):
    """Get ETF historical data"""
    # Reuse equity historical endpoint
    return await get_historical_price(symbol, interval, "1mo", start_date, end_date)

# Private companies endpoints
@app.get("/api/v1/private-companies/search")
async def search_private_companies(query: str, limit: int = Query(default=10)):
    """Search for private companies"""
    # Mock data for private companies
    companies = {
        "openai": {"name": "OpenAI", "industry": "Artificial Intelligence", "valuation": "$86B", "founded": "2015"},
        "stripe": {"name": "Stripe", "industry": "Financial Technology", "valuation": "$95B", "founded": "2010"},
        "spacex": {"name": "SpaceX", "industry": "Aerospace", "valuation": "$150B", "founded": "2002"},
        "databricks": {"name": "Databricks", "industry": "Data Analytics", "valuation": "$43B", "founded": "2013"},
        "canva": {"name": "Canva", "industry": "Design Software", "valuation": "$40B", "founded": "2012"}
    }
    
    results = []
    for key, company in companies.items():
        if query.lower() in key or query.lower() in company['name'].lower():
            results.append({
                "id": key,
                "name": company['name'],
                "industry": company['industry'],
                "valuation": company['valuation'],
                "founded": company['founded']
            })
    
    return {
        "success": True,
        "data": {
            "query": query,
            "results": results[:limit]
        }
    }

@app.get("/api/v1/private-companies/company/{company_id}")
async def get_private_company(company_id: str):
    """Get private company details"""
    companies = {
        "openai": {
            "name": "OpenAI",
            "industry": "Artificial Intelligence",
            "valuation": "$86B",
            "founded": "2015",
            "headquarters": "San Francisco, CA",
            "description": "OpenAI is an AI research and deployment company with the mission to ensure that artificial general intelligence benefits all of humanity.",
            "investors": ["Microsoft", "Khosla Ventures", "Reid Hoffman", "Infosys"],
            "funding_rounds": [
                {"date": "2023-01", "amount": "$10B", "investors": ["Microsoft"]},
                {"date": "2021-01", "amount": "$1B", "investors": ["Microsoft"]}
            ]
        }
    }
    
    company = companies.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return {
        "success": True,
        "data": company
    }

# Search endpoint
@app.get("/api/v1/search")
async def search_symbols(query: str, limit: int = Query(default=10, ge=1, le=50)):
    """Search for symbols across stocks and ETFs"""
    try:
        import yfinance as yf
        results = []
        
        # Search popular symbols
        popular_symbols = {
            "AAPL": "Apple Inc.",
            "MSFT": "Microsoft Corporation",
            "GOOGL": "Alphabet Inc.",
            "AMZN": "Amazon.com Inc.",
            "TSLA": "Tesla Inc.",
            "META": "Meta Platforms Inc.",
            "NVDA": "NVIDIA Corporation",
            "JPM": "JPMorgan Chase & Co.",
            "JNJ": "Johnson & Johnson",
            "V": "Visa Inc.",
            "SPY": "SPDR S&P 500 ETF Trust",
            "QQQ": "Invesco QQQ Trust",
            "IWM": "iShares Russell 2000 ETF",
            "GLD": "SPDR Gold Shares",
            "VTI": "Vanguard Total Stock Market ETF"
        }
        
        for symbol, name in popular_symbols.items():
            if query.upper() in symbol or query.lower() in name.lower():
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    results.append({
                        "symbol": symbol,
                        "name": name,
                        "type": "ETF" if symbol in ["SPY", "QQQ", "IWM", "GLD", "VTI"] else "Stock",
                        "exchange": info.get('exchange', 'NASDAQ'),
                        "sector": info.get('sector', ''),
                        "industry": info.get('industry', '')
                    })
                except:
                    results.append({
                        "symbol": symbol,
                        "name": name,
                        "type": "ETF" if symbol in ["SPY", "QQQ", "IWM", "GLD", "VTI"] else "Stock",
                        "exchange": "NASDAQ",
                        "sector": "",
                        "industry": ""
                    })
        
        return {
            "success": True,
            "data": {
                "query": query,
                "results": results[:limit]
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Add crypto and forex endpoints for frontend
@app.get("/api/v1/openbb/crypto/{symbol}")
async def get_crypto_quote(symbol: str):
    """Get cryptocurrency quote"""
    try:
        # For now, return mock data
        return {
            "symbol": symbol,
            "price": 45000.00 if "BTC" in symbol else 3000.00,
            "change": 500.00 if "BTC" in symbol else 50.00,
            "changePercent": 1.12
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/openbb/forex/{pair}")
async def get_forex_quote(pair: str):
    """Get forex quote"""
    try:
        # For now, return mock data
        rates = {
            "EURUSD": 1.0850,
            "GBPUSD": 1.2650,
            "USDJPY": 155.50
        }
        return {
            "pair": pair,
            "price": rates.get(pair, 1.0000),
            "change": 0.0025,
            "changePercent": 0.23
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Copilot endpoint with OpenAI integration
@app.post("/api/v1/copilot/query")
async def copilot_query(body: CopilotQuery):
    """Process natural language queries using OpenAI"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured"
            }
        
        import openai
        openai.api_key = openai_key
        
        # Create a context-aware prompt
        system_prompt = """You are a financial assistant AI. Help users with stock market queries, 
        company information, and financial analysis. Provide concise, accurate responses.
        If asked about specific stocks, suggest using the appropriate API endpoints."""
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": body.query}
                ],
                max_tokens=500,
                temperature=0.7
            )
            
            ai_response = response.choices[0].message.content
            
            # Generate relevant suggestions based on the query
            suggestions = []
            query_lower = body.query.lower()
            if any(word in query_lower for word in ['stock', 'price', 'quote']):
                suggestions.append("Get stock quote for AAPL")
                suggestions.append("View historical prices")
            if any(word in query_lower for word in ['news', 'latest', 'update']):
                suggestions.append("Get latest market news")
                suggestions.append("View company news")
            if any(word in query_lower for word in ['fundamental', 'pe', 'ratio']):
                suggestions.append("View company fundamentals")
            
            return {
                "success": True,
                "data": {
                    "query": body.query,
                    "response": ai_response,
                    "suggestions": suggestions[:3] if suggestions else [
                        "Get stock quote",
                        "View market status",
                        "Search for companies"
                    ]
                }
            }
        except Exception as e:
            # Fallback response if OpenAI fails
            return {
                "success": True,
                "data": {
                    "query": body.query,
                    "response": f"I understand you're asking about: {body.query}. While I'm having trouble connecting to the AI service, you can use our specific endpoints for stock quotes, news, and market data.",
                    "suggestions": [
                        "Get stock quote for AAPL",
                        "View market status",
                        "Get latest news"
                    ]
                }
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

# MindsDB integration endpoints
@app.post("/api/v1/mindsdb/query")
async def mindsdb_query(body: MindsDBQuery):
    """Execute queries through MindsDB"""
    try:
        import requests
        mindsdb_url = os.getenv("MINDSDB_URL", "http://mindsdb:47334")
        
        # Execute query through MindsDB SQL API
        response = requests.post(
            f"{mindsdb_url}/api/sql/query",
            json={"query": body.query},
            timeout=10
        )
        
        if response.status_code == 200:
            return {
                "success": True,
                "data": response.json()
            }
        else:
            return {
                "success": False,
                "error": f"MindsDB returned status code: {response.status_code}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/mindsdb/models")
async def get_mindsdb_models():
    """Get list of available MindsDB models"""
    try:
        import requests
        mindsdb_url = os.getenv("MINDSDB_URL", "http://mindsdb:47334")
        
        response = requests.get(f"{mindsdb_url}/api/models", timeout=5)
        
        if response.status_code == 200:
            return {
                "success": True,
                "data": {
                    "models": response.json()
                }
            }
        else:
            return {
                "success": True,
                "data": {
                    "models": [],
                    "message": "No models currently deployed"
                }
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Test endpoints
@app.get("/api/v1/test/database")
async def test_database():
    """Test database connection"""
    try:
        import pymysql
        connection = pymysql.connect(
            host=os.getenv('AWS_RDS_HOST'),
            user=os.getenv('AWS_RDS_USERNAME'),
            password=os.getenv('AWS_RDS_PASSWORD'),
            database=os.getenv('AWS_RDS_DATABASE'),
            port=int(os.getenv('AWS_RDS_PORT', 3306))
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
        connection.close()
        return {"success": True, "message": "Database connected", "result": result}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/test/redis")
async def test_redis():
    """Test Redis connection"""
    try:
        import redis
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379'))
        r.ping()
        
        # Test set and get
        r.set('test_key', 'test_value', ex=60)
        value = r.get('test_key')
        
        return {
            "success": True,
            "message": "Redis connected and operational",
            "test_result": value.decode() if value else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/test/mindsdb")
async def test_mindsdb():
    """Test MindsDB connection"""
    try:
        import requests
        mindsdb_url = os.getenv("MINDSDB_URL", "http://mindsdb:47334")
        
        response = requests.get(f"{mindsdb_url}/api/status", timeout=5)
        
        if response.status_code == 200:
            return {
                "success": True,
                "message": "MindsDB connected",
                "data": response.json()
            }
        else:
            return {
                "success": False,
                "error": f"MindsDB returned status code: {response.status_code}"
            }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Cache management endpoints
@app.post("/api/v1/cache/clear")
async def clear_cache(pattern: str = "*"):
    """Clear cache entries matching pattern"""
    try:
        import redis
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379'))
        
        if pattern == "*":
            r.flushdb()
            message = "All cache cleared"
        else:
            keys = r.keys(pattern)
            if keys:
                r.delete(*keys)
                message = f"Cleared {len(keys)} keys matching pattern: {pattern}"
            else:
                message = f"No keys found matching pattern: {pattern}"
        
        return {
            "success": True,
            "message": message
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Add missing endpoints that frontend expects
@app.get("/api/v1/equity/ownership/share-statistics")
async def get_share_statistics(symbol: str):
    """Get share statistics"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "sharesOutstanding": info.get('sharesOutstanding', 0),
                "floatShares": info.get('floatShares', 0),
                "sharesShort": info.get('sharesShort', 0),
                "shortRatio": info.get('shortRatio', 0),
                "shortPercentOfFloat": info.get('shortPercentOfFloat', 0),
                "percentInsiders": info.get('heldPercentInsiders', 0),
                "percentInstitutions": info.get('heldPercentInstitutions', 0)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/management")
async def get_management(symbol: str):
    """Get management team info"""
    try:
        # Mock data - return as array directly for frontend compatibility
        if symbol.upper() == "AAPL":
            mock_data = [
                {
                    "name": "Tim Cook",
                    "title": "Chief Executive Officer",
                    "compensation": 98734394,
                    "currency": "USD",
                    "yearBorn": 1960,
                    "titleSince": 2011
                },
                {
                    "name": "Luca Maestri",
                    "title": "Chief Financial Officer",
                    "compensation": 27565721,
                    "currency": "USD",
                    "yearBorn": 1963,
                    "titleSince": 2014
                },
                {
                    "name": "Jeff Williams",
                    "title": "Chief Operating Officer",
                    "compensation": 27533696,
                    "currency": "USD",
                    "yearBorn": 1964,
                    "titleSince": 2015
                },
                {
                    "name": "Katherine Adams",
                    "title": "Senior Vice President and General Counsel",
                    "compensation": 26964169,
                    "currency": "USD",
                    "yearBorn": 1964,
                    "titleSince": 2017
                },
                {
                    "name": "Deirdre O'Brien",
                    "title": "Senior Vice President of Retail",
                    "compensation": 26964169,
                    "currency": "USD",
                    "yearBorn": 1966,
                    "titleSince": 2019
                }
            ]
        else:
            # Generic mock data for other companies
            mock_data = [
                {
                    "name": "John Smith",
                    "title": "Chief Executive Officer",
                    "compensation": 15000000,
                    "currency": "USD"
                },
                {
                    "name": "Jane Doe", 
                    "title": "Chief Financial Officer",
                    "compensation": 5000000,
                    "currency": "USD"
                },
                {
                    "name": "Robert Johnson",
                    "title": "Chief Operating Officer", 
                    "compensation": 4500000,
                    "currency": "USD"
                }
            ]
            
        return {"success": True, "data": mock_data}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/price/performance")
async def get_price_performance(symbol: str):
    """Get price performance metrics"""
    try:
        import yfinance as yf
        from datetime import datetime, timedelta
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get current price
        try:
            current_price = ticker.fast_info.price
        except:
            current_price = info.get('currentPrice', info.get('previousClose', 0))
        
        # Calculate performance for different periods
        performance = {}
        
        # Get historical data for various periods
        end_date = datetime.now()
        periods = {
            '1D': 1,
            '5D': 5,
            '1W': 7,
            '1M': 30,
            '3M': 90,
            '6M': 180,
            '1Y': 365,
            '3Y': 365 * 3,
            '5Y': 365 * 5
        }
        
        for period_name, days in periods.items():
            try:
                start_date = end_date - timedelta(days=days)
                hist = ticker.history(start=start_date, end=end_date)
                if not hist.empty and len(hist) > 0:
                    start_price = hist['Close'].iloc[0]
                    if start_price > 0 and current_price:
                        performance[period_name] = ((current_price - start_price) / start_price) * 100
                    else:
                        performance[period_name] = None
                else:
                    performance[period_name] = None
            except:
                performance[period_name] = None
        
        # Calculate YTD
        try:
            year_start = datetime(end_date.year, 1, 1)
            hist_ytd = ticker.history(start=year_start, end=end_date)
            if not hist_ytd.empty and len(hist_ytd) > 0:
                ytd_start_price = hist_ytd['Close'].iloc[0]
                if ytd_start_price > 0 and current_price:
                    performance['YTD'] = ((current_price - ytd_start_price) / ytd_start_price) * 100
                else:
                    performance['YTD'] = None
            else:
                performance['YTD'] = None
        except:
            performance['YTD'] = None
        
        return {
            "success": True,
            "data": {
                "currentPrice": current_price,
                "currency": info.get('currency', 'USD'),
                "volume": info.get('volume', 0),
                "performance": performance,
                "yearHigh": info.get('fiftyTwoWeekHigh', 0),
                "yearLow": info.get('fiftyTwoWeekLow', 0),
                "peRatio": info.get('trailingPE'),
                "marketCap": info.get('marketCap', 0),
                "averageVolume": info.get('averageVolume', info.get('averageDailyVolume10Day', 0)),
                "provider": "yfinance"
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/metrics")
async def get_fundamental_metrics(symbol: str, period: str = "annual", limit: int = 10, with_ttm: bool = True):
    """Get fundamental metrics"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # For now, return current metrics
        return {
            "success": True,
            "data": [{
                "symbol": symbol.upper(),
                "period": "TTM" if with_ttm else period,
                "marketCap": info.get('marketCap', 0),
                "enterpriseValue": info.get('enterpriseValue', 0),
                "peRatio": info.get('trailingPE', 0),
                "pegRatio": info.get('pegRatio', 0),
                "priceToSales": info.get('priceToSalesTrailing12Months', 0),
                "priceToBook": info.get('priceToBook', 0),
                "evToRevenue": info.get('enterpriseToRevenue', 0),
                "evToEbitda": info.get('enterpriseToEbitda', 0),
                "profitMargin": info.get('profitMargins', 0),
                "operatingMargin": info.get('operatingMargins', 0),
                "returnOnAssets": info.get('returnOnAssets', 0),
                "returnOnEquity": info.get('returnOnEquity', 0),
                "revenue": info.get('totalRevenue', 0),
                "revenueGrowth": info.get('revenueGrowth', 0),
                "grossProfit": info.get('grossProfits', 0),
                "ebitda": info.get('ebitda', 0),
                "netIncome": info.get('netIncomeToCommon', 0),
                "eps": info.get('trailingEps', 0),
                "debtToEquity": info.get('debtToEquity', 0),
                "currentRatio": info.get('currentRatio', 0),
                "quickRatio": info.get('quickRatio', 0)
            }]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/income-statement")
async def get_income_statement(symbol: str, period: str = "annual", limit: int = 10):
    """Get income statement data"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        if period == "annual":
            data = ticker.income_stmt
        else:
            data = ticker.quarterly_income_stmt
        
        # Convert to expected format
        statements = []
        for date in data.columns[:limit]:
            statement = {
                "date": date.strftime("%Y-%m-%d"),
                "revenue": float(data.loc['Total Revenue'][date]) if 'Total Revenue' in data.index else 0,
                "costOfRevenue": float(data.loc['Cost Of Revenue'][date]) if 'Cost Of Revenue' in data.index else 0,
                "grossProfit": float(data.loc['Gross Profit'][date]) if 'Gross Profit' in data.index else 0,
                "operatingIncome": float(data.loc['Operating Income'][date]) if 'Operating Income' in data.index else 0,
                "netIncome": float(data.loc['Net Income'][date]) if 'Net Income' in data.index else 0,
            }
            statements.append(statement)
        
        return {
            "success": True,
            "data": statements
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/estimates/price-target")
async def get_price_target(symbol: str):
    """Get analyst price targets"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "currentPrice": info.get('currentPrice', info.get('previousClose', 0)),
                "targetHigh": info.get('targetHighPrice', 0),
                "targetLow": info.get('targetLowPrice', 0),
                "targetMean": info.get('targetMeanPrice', 0),
                "targetMedian": info.get('targetMedianPrice', 0),
                "numberOfAnalysts": info.get('numberOfAnalystOpinions', 0),
                "recommendation": info.get('recommendationKey', 'none')
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/key-metrics")
async def get_key_metrics(symbols: str):
    """Get key metrics for multiple symbols"""
    try:
        import yfinance as yf
        symbol_list = symbols.split(',')
        
        results = []
        for symbol in symbol_list:
            ticker = yf.Ticker(symbol.strip())
            info = ticker.info
            
            results.append({
                "symbol": symbol.strip().upper(),
                "price": info.get('currentPrice', info.get('previousClose', 0)),
                "marketCap": info.get('marketCap', 0),
                "peRatio": info.get('trailingPE', 0),
                "dividendYield": info.get('dividendYield', 0),
                "52WeekHigh": info.get('fiftyTwoWeekHigh', 0),
                "52WeekLow": info.get('fiftyTwoWeekLow', 0)
            })
        
        return {
            "success": True,
            "data": results
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/sec-filings")
async def get_sec_filings(symbol: str, limit: int = Query(default=10)):
    """Get SEC filings"""
    try:
        # Mock data for SEC filings - match CompanyFilings widget expected format
        filings = []
        filing_types = ["10-K", "10-Q", "8-K", "DEF 14A", "20-F"]
        
        # Get a mock CIK for the company
        cik_mapping = {
            "AAPL": "0000320193",
            "MSFT": "0000789019",
            "GOOGL": "0001652044",
            "AMZN": "0001018724",
            "TSLA": "0001318605"
        }
        cik = cik_mapping.get(symbol.upper(), "0001234567")
        
        from datetime import datetime, timedelta
        for i in range(min(limit, 10)):
            filing_date = datetime.now() - timedelta(days=i*30)
            filings.append({
                "date": filing_date.strftime("%Y-%m-%d"),  # Changed from filingDate
                "filingDate": filing_date.strftime("%Y-%m-%d"),
                "acceptedDate": filing_date.strftime("%Y-%m-%d %H:%M:%S"),
                "type": filing_types[i % len(filing_types)],
                "cik": cik,
                "url": f"https://www.sec.gov/Archives/edgar/data/{cik}/{filing_date.strftime('%Y%m%d')}/filing{i}.htm",  # Changed from link
                "link": f"https://www.sec.gov/Archives/edgar/data/{cik}/{filing_date.strftime('%Y%m%d')}/filing{i}.htm",
                "finalLink": f"https://www.sec.gov/Archives/edgar/data/{cik}/{filing_date.strftime('%Y%m%d')}/filing{i}.htm"
            })
        
        return {
            "success": True,
            "data": filings
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/balance-sheet")
async def get_balance_sheet(symbol: str, period: str = "annual", limit: int = 10):
    """Get balance sheet data"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        if period == "annual":
            data = ticker.balance_sheet
        else:
            data = ticker.quarterly_balance_sheet
        
        # Convert to expected format
        statements = []
        for date in data.columns[:limit]:
            statement = {
                "date": date.strftime("%Y-%m-%d"),
                "totalAssets": float(data.loc['Total Assets'][date]) if 'Total Assets' in data.index else 0,
                "totalLiabilities": float(data.loc['Total Liabilities Net Minority Interest'][date]) if 'Total Liabilities Net Minority Interest' in data.index else 0,
                "totalEquity": float(data.loc['Total Equity Gross Minority Interest'][date]) if 'Total Equity Gross Minority Interest' in data.index else 0,
                "cash": float(data.loc['Cash And Cash Equivalents'][date]) if 'Cash And Cash Equivalents' in data.index else 0,
                "currentAssets": float(data.loc['Current Assets'][date]) if 'Current Assets' in data.index else 0,
                "currentLiabilities": float(data.loc['Current Liabilities'][date]) if 'Current Liabilities' in data.index else 0,
            }
            statements.append(statement)
        
        return {
            "success": True,
            "data": statements
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/fundamental/cash-flow")
async def get_cash_flow(symbol: str, period: str = "annual", limit: int = 10):
    """Get cash flow statement data"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        
        if period == "annual":
            data = ticker.cash_flow
        else:
            data = ticker.quarterly_cash_flow
        
        # Convert to expected format
        statements = []
        for date in data.columns[:limit]:
            statement = {
                "date": date.strftime("%Y-%m-%d"),
                "operatingCashFlow": float(data.loc['Operating Cash Flow'][date]) if 'Operating Cash Flow' in data.index else 0,
                "investingCashFlow": float(data.loc['Investing Cash Flow'][date]) if 'Investing Cash Flow' in data.index else 0,
                "financingCashFlow": float(data.loc['Financing Cash Flow'][date]) if 'Financing Cash Flow' in data.index else 0,
                "freeCashFlow": float(data.loc['Free Cash Flow'][date]) if 'Free Cash Flow' in data.index else 0,
                "capitalExpenditures": float(data.loc['Capital Expenditure'][date]) if 'Capital Expenditure' in data.index else 0,
            }
            statements.append(statement)
        
        return {
            "success": True,
            "data": statements
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# MindsDB specific endpoints (not a catch-all proxy)
@app.get("/api/mindsdb/status")
async def mindsdb_status():
    """Get MindsDB status"""
    try:
        import requests
        mindsdb_url = os.getenv("MINDSDB_URL", "http://mindsdb:47334")
        
        response = requests.get(f"{mindsdb_url}/api/status", timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=response.status_code, detail=response.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/cache/stats")
async def get_cache_stats():
    """Get cache statistics"""
    try:
        import redis
        r = redis.from_url(os.getenv('REDIS_URL', 'redis://redis:6379'))
        
        info = r.info()
        
        return {
            "success": True,
            "data": {
                "used_memory": info.get('used_memory_human', 'N/A'),
                "connected_clients": info.get('connected_clients', 0),
                "total_commands_processed": info.get('total_commands_processed', 0),
                "keyspace": r.dbsize(),
                "uptime_days": info.get('uptime_in_days', 0)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}