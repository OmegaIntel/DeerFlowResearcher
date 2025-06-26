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
    
    # AWS Configuration
    AWS_RDS_HOST: Optional[str] = None
    AWS_RDS_PORT: int = 5432
    AWS_RDS_DATABASE: str = "openbb_db"
    AWS_RDS_USERNAME: Optional[str] = None
    AWS_RDS_PASSWORD: Optional[str] = None
    AWS_REDIS_HOST: Optional[str] = None
    AWS_REDIS_PORT: int = 6379
    DATABASE_URL: Optional[str] = None
    
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
    
    # OnlyOffice Settings
    ONLYOFFICE_SERVER_URL: str = "http://localhost:9080"
    ONLYOFFICE_JWT_SECRET: str = "your-jwt-secret-here"
    API_BASE_URL: str = "http://localhost:8000"
    
    # Copilot Settings
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    COPILOT_TEMPERATURE: float = 0.7
    COPILOT_MAX_TOKENS: int = 2000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        
        # Load multiple env files
        @classmethod
        def customise_sources(
            cls,
            init_settings,
            env_settings,
            file_secret_settings,
        ):
            return (
                init_settings,
                env_settings,
                file_secret_settings,
            )

settings = Settings()