from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from config import settings
import os
from typing import Optional, List
from datetime import datetime, timedelta

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="OpenBB Backend API - Working Version"
)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
                {"name": "YFinance", "status": "active", "key_configured": True}
            ]
        }
    }

# Equity endpoints
@app.get("/api/v1/equity/quote")
async def get_quote(symbol: str):
    """Get a real stock quote using yfinance"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Get current price from fast_info if available
        try:
            current_price = ticker.fast_info.price
        except:
            current_price = info.get('currentPrice', 0)
        
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
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/historical")
async def get_historical_price(
    symbol: str,
    interval: str = Query(default="1d", description="Valid intervals: 1m,2m,5m,15m,30m,60m,90m,1h,1d,5d,1wk,1mo,3mo"),
    period: str = Query(default="1mo", description="Valid periods: 1d,5d,1mo,3mo,6mo,1y,2y,5y,10y,ytd,max")
):
    """Get historical price data"""
    try:
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period, interval=interval)
        
        data = []
        for index, row in hist.iterrows():
            data.append({
                "date": index.strftime("%Y-%m-%d %H:%M:%S"),
                "open": float(row['Open']),
                "high": float(row['High']),
                "low": float(row['Low']),
                "close": float(row['Close']),
                "volume": int(row['Volume'])
            })
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "interval": interval,
                "period": period,
                "history": data
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/equity/company")
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
                "headquarters": f"{info.get('city', '')}, {info.get('state', '')} {info.get('country', '')}".strip()
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# News endpoints
@app.get("/api/v1/news/general")
async def get_general_news(limit: int = Query(default=10, ge=1, le=100)):
    """Get general market news"""
    try:
        # For now, return mock data since we need to integrate news providers
        return {
            "success": True,
            "data": {
                "articles": [
                    {
                        "title": f"Market Update {i+1}",
                        "summary": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
                        "source": "Financial Times",
                        "publishedAt": (datetime.now() - timedelta(hours=i)).isoformat(),
                        "url": f"https://example.com/news/{i+1}"
                    }
                    for i in range(limit)
                ]
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/news/company")
async def get_company_news(symbol: str, limit: int = Query(default=10, ge=1, le=100)):
    """Get company-specific news using Benzinga if available"""
    try:
        benzinga_key = os.getenv("BENZINGA_API_KEY")
        if benzinga_key:
            # TODO: Implement Benzinga API integration
            pass
        
        # For now, return yfinance news
        import yfinance as yf
        ticker = yf.Ticker(symbol)
        news = ticker.news
        
        articles = []
        for article in news[:limit]:
            articles.append({
                "title": article.get('title', ''),
                "summary": article.get('summary', ''),
                "source": article.get('publisher', ''),
                "publishedAt": datetime.fromtimestamp(article.get('providerPublishTime', 0)).isoformat(),
                "url": article.get('link', '')
            })
        
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "articles": articles
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# ETF endpoints
@app.get("/api/v1/etf/quote")
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
                "price": current_price,
                "previousClose": info.get('previousClose', 0),
                "change": current_price - info.get('previousClose', 0) if current_price and info.get('previousClose') else 0,
                "changePercent": ((current_price - info.get('previousClose', 0)) / info.get('previousClose', 1) * 100) if current_price and info.get('previousClose') else 0,
                "volume": info.get('volume', 0),
                "totalAssets": info.get('totalAssets', 0),
                "yield": info.get('yield', 0),
                "category": info.get('category', ''),
                "expenseRatio": info.get('annualReportExpenseRatio', 0)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.get("/api/v1/etf/holdings")
async def get_etf_holdings(symbol: str):
    """Get ETF holdings - simplified version"""
    try:
        # This would require more sophisticated data provider
        return {
            "success": True,
            "data": {
                "symbol": symbol.upper(),
                "holdings": [],
                "message": "Holdings data requires premium data provider"
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

# Search endpoint
@app.get("/api/v1/search")
async def search_symbols(query: str, limit: int = Query(default=10, ge=1, le=50)):
    """Search for symbols"""
    try:
        # Simple implementation - in production would use proper search
        import yfinance as yf
        
        # Common stock symbols for demo
        common_symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "JPM", "JNJ", "V"]
        results = []
        
        for symbol in common_symbols:
            if query.upper() in symbol:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                results.append({
                    "symbol": symbol,
                    "name": info.get('longName', symbol),
                    "type": "Stock",
                    "exchange": info.get('exchange', 'NASDAQ')
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

# Copilot endpoint (simplified)
@app.post("/api/v1/copilot/query")
async def copilot_query(query: str):
    """Process natural language queries"""
    try:
        openai_key = os.getenv("OPENAI_API_KEY")
        if not openai_key:
            return {
                "success": False,
                "error": "OpenAI API key not configured"
            }
        
        # For now, return a simple response
        return {
            "success": True,
            "data": {
                "query": query,
                "response": f"I understand you're asking about: {query}. This is a placeholder response. Full OpenAI integration pending.",
                "suggestions": [
                    "Get stock quote for AAPL",
                    "Show me tech sector performance",
                    "What's the market trend today?"
                ]
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
        return {"success": True, "message": "Redis connected"}
    except Exception as e:
        return {"success": False, "error": str(e)}