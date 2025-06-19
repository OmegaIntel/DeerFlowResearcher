from fastapi import APIRouter
from .endpoints import equity, news, etf, status
from . import openbb_routes

api_router = APIRouter()

api_router.include_router(equity.router, prefix="/equity", tags=["equity"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(etf.router, prefix="/etf", tags=["etf"])
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(openbb_routes.router, tags=["OpenBB Platform"])