import os
from typing import List, Union
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "OpenBB Backend API"
    API_V1_STR: str = "/api/v1"
    
    # CORS settings
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode='before')
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # Database settings
    AWS_RDS_HOST: str = os.getenv("AWS_RDS_HOST", "localhost")
    AWS_RDS_PORT: int = int(os.getenv("AWS_RDS_PORT", "3306"))
    AWS_RDS_DATABASE: str = os.getenv("AWS_RDS_DATABASE", "omni_ai")
    AWS_RDS_USERNAME: str = os.getenv("AWS_RDS_USERNAME", "admin")
    AWS_RDS_PASSWORD: str = os.getenv("AWS_RDS_PASSWORD", "")
    
    # Redis settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # API Keys
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    POLYGON_API_KEY: str = os.getenv("POLYGON_API_KEY", "")
    FMP_API_KEY: str = os.getenv("FMP_API_KEY", "")
    BENZINGA_API_KEY: str = os.getenv("BENZINGA_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    API_NINJAS_KEY: str = os.getenv("API_NINJAS_KEY", "")
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings(
    BACKEND_CORS_ORIGINS=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://127.0.0.1"
    ]
)