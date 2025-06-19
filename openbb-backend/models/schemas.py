from pydantic import BaseModel, Field
from typing import Optional, Any, List, Dict
from datetime import datetime, date

class BaseResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class TickerRequest(BaseModel):
    symbol: str
    
class HistoricalPriceRequest(BaseModel):
    symbol: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    interval: Optional[str] = "1d"

class CompanyNewsRequest(BaseModel):
    symbol: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    limit: Optional[int] = 50
    channels: Optional[str] = "all"

class FundamentalMetricsRequest(BaseModel):
    symbol: str
    period: Optional[str] = "annual"
    limit: Optional[int] = 100
    with_ttm: Optional[bool] = True

class RevenueGeographyRequest(BaseModel):
    symbol: str
    period: Optional[str] = "annual"

class RevenueSegmentRequest(BaseModel):
    symbol: str
    period: Optional[str] = "annual"

# Response Models
class TickerInfo(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changePercent: float
    volume: int
    marketCap: Optional[float] = None
    pe: Optional[float] = None
    
class CompanyOverview(BaseModel):
    symbol: str
    name: str
    description: str
    sector: str
    industry: str
    marketCap: float
    employees: Optional[int] = None
    website: Optional[str] = None
    
class PriceData(BaseModel):
    date: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    
class NewsItem(BaseModel):
    title: str
    url: str
    published: datetime
    source: str
    summary: Optional[str] = None
    
class ManagementMember(BaseModel):
    name: str
    position: str
    age: Optional[int] = None
    tenure: Optional[int] = None
    
class ShareStatistics(BaseModel):
    sharesOutstanding: float
    sharesFloat: float
    sharesShort: float
    shortRatio: float
    shortPercentOfFloat: float
    institutionalOwnership: float