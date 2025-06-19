from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "OpenBB Backend"
    DEBUG: bool = True
    
    # CORS Configuration
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://ec2-100-26-54-124.compute-1.amazonaws.com:3000",
        "http://172.31.20.79:3000",
        "http://0.0.0.0:3000",
        "*"  # Allow all origins for testing
    ]
    
    # Redis Configuration (for caching)
    REDIS_URL: str = "redis://localhost:6379"
    CACHE_TTL: int = 300  # 5 minutes default cache
    
    # OpenBB Configuration
    OPENBB_PAT: Optional[str] = None  # Personal Access Token
    
    # Data Provider API Keys
    ALPHA_VANTAGE_API_KEY: Optional[str] = None
    POLYGON_API_KEY: Optional[str] = None
    FMP_API_KEY: Optional[str] = None
    TIINGO_TOKEN: Optional[str] = None
    FRED_API_KEY: Optional[str] = None
    BENZINGA_API_KEY: Optional[str] = None
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()