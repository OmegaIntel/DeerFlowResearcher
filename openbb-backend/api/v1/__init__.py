from fastapi import APIRouter
# Import only working endpoints
from .endpoints import equity, news, etf, status, copilot, mindsdb, private_companies, dealroom, data_cleaning, cleaning_resumable
# Commented out endpoints with dependency issues
# from .endpoints import excel, onlyoffice_excel, alerts, reports
from . import openbb_routes

api_router = APIRouter()

# Include only working routers
api_router.include_router(equity.router, prefix="/equity", tags=["equity"])
api_router.include_router(news.router, prefix="/news", tags=["news"])
api_router.include_router(etf.router, prefix="/etf", tags=["etf"])
api_router.include_router(status.router, prefix="/status", tags=["status"])
api_router.include_router(copilot.router, prefix="/copilot", tags=["copilot"])
api_router.include_router(mindsdb.router, prefix="/mindsdb", tags=["mindsdb"])
api_router.include_router(private_companies.router, prefix="/private-companies", tags=["private-companies"])
api_router.include_router(dealroom.router, prefix="/dealroom", tags=["dealroom"])
api_router.include_router(data_cleaning.router, prefix="/data-cleaning", tags=["data-cleaning"])
api_router.include_router(cleaning_resumable.router, prefix="/cleaning", tags=["cleaning"])

# Commented out routers with dependency issues
# api_router.include_router(excel.router, prefix="/excel", tags=["excel"])
# api_router.include_router(onlyoffice_excel.router, prefix="/excel/onlyoffice", tags=["onlyoffice"])
# api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
# api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

# Include OpenBB routes
api_router.include_router(openbb_routes.router, tags=["OpenBB Platform"])