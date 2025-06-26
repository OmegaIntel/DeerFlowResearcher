from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
import os

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="OpenBB Backend API - Minimal Working Version"
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

# Simple test endpoints
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

# Add a simple equity endpoint using yfinance
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
                "dayLow": info.get('dayLow', 0)
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}