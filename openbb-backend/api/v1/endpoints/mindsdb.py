"""
MindsDB API Endpoints
Provides REST API interface for MindsDB integration
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging

from models import schemas
from services.mindsdb_service import mindsdb_service
from services.cache_service import cache_service

logger = logging.getLogger(__name__)
router = APIRouter()

class QueryRequest(BaseModel):
    query: str

class DataSourceRequest(BaseModel):
    name: str
    type: str
    parameters: Dict[str, Any]

class ModelRequest(BaseModel):
    name: str
    query: str
    predict_column: str

class PredictionRequest(BaseModel):
    model_name: str
    input_data: Dict[str, Any]

class AgentRequest(BaseModel):
    name: str
    model: str
    skills: Optional[List[str]] = None

class AgentQueryRequest(BaseModel):
    agent_name: str
    question: str

class IntegrationConnectionRequest(BaseModel):
    integration_id: str
    connection_params: Dict[str, Any]

@router.get("/status", response_model=schemas.BaseResponse)
async def get_mindsdb_status():
    """Check MindsDB connection status"""
    try:
        is_connected = await mindsdb_service.check_connection()
        return schemas.BaseResponse(
            success=True,
            data={"connected": is_connected, "service": "MindsDB"}
        )
    except Exception as e:
        logger.error(f"MindsDB status check failed: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/process", response_model=schemas.BaseResponse)
async def process_natural_language_query(
    query: str = Body(...),
    integration: str = Body(...)
):
    """Process natural language query and return results"""
    try:
        result = await mindsdb_service.process_natural_language_query(query, integration)
        return schemas.BaseResponse(
            success=True,
            data=result
        )
    except Exception as e:
        logger.error(f"Natural language processing failed: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/query", response_model=schemas.BaseResponse)
async def execute_sql_query(request: QueryRequest):
    """Execute SQL query on MindsDB"""
    try:
        # Check cache first
        cache_key = f"mindsdb:query:{hash(request.query)}"
        cached_result = cache_service.get(cache_key)
        if cached_result:
            return schemas.BaseResponse(success=True, data=cached_result)
        
        result = await mindsdb_service.execute_query(request.query)
        
        # Cache successful results for 5 minutes
        if result["success"]:
            cache_service.set(cache_key, result, ttl=300)
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"MindsDB query execution failed: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/data-sources", response_model=schemas.BaseResponse)
async def create_data_source(request: DataSourceRequest):
    """Create a new data source connection"""
    try:
        result = await mindsdb_service.create_data_source(
            request.name,
            request.type,
            request.parameters
        )
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to create data source: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/data-sources", response_model=schemas.BaseResponse)
async def list_data_sources():
    """List all connected data sources"""
    try:
        # Check cache first
        cache_key = "mindsdb:data-sources"
        cached_result = cache_service.get(cache_key)
        if cached_result:
            return schemas.BaseResponse(success=True, data=cached_result)
        
        result = await mindsdb_service.list_data_sources()
        
        # Cache for 30 minutes
        if result["success"]:
            cache_service.set(cache_key, result["data"], ttl=1800)
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to list data sources: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/models", response_model=schemas.BaseResponse)
async def create_model(request: ModelRequest):
    """Create a machine learning model"""
    try:
        result = await mindsdb_service.create_model(
            request.name,
            request.query,
            request.predict_column
        )
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to create model: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/predictions", response_model=schemas.BaseResponse)
async def get_predictions(request: PredictionRequest):
    """Get predictions from a model"""
    try:
        result = await mindsdb_service.get_model_predictions(
            request.model_name,
            request.input_data
        )
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to get predictions: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/agents", response_model=schemas.BaseResponse)
async def create_agent(request: AgentRequest):
    """Create an AI agent"""
    try:
        result = await mindsdb_service.create_agent(
            request.name,
            request.model,
            request.skills
        )
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to create agent: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/agents/query", response_model=schemas.BaseResponse)
async def query_agent(request: AgentQueryRequest):
    """Ask a question to an AI agent"""
    try:
        result = await mindsdb_service.query_agent(
            request.agent_name,
            request.question
        )
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to query agent: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/unified-data/{symbol}", response_model=schemas.BaseResponse)
async def get_unified_financial_data(
    symbol: str,
    data_types: Optional[str] = Query(None, description="Comma-separated data types: price,fundamentals,news")
):
    """Get unified financial data across multiple sources"""
    try:
        # Parse data types
        if data_types:
            data_type_list = [dt.strip() for dt in data_types.split(",")]
        else:
            data_type_list = ["price", "fundamentals", "news"]
        
        # Check cache first
        cache_key = f"mindsdb:unified:{symbol}:{'-'.join(sorted(data_type_list))}"
        cached_result = cache_service.get(cache_key)
        if cached_result:
            return schemas.BaseResponse(success=True, data=cached_result)
        
        result = await mindsdb_service.get_unified_financial_data(symbol, data_type_list)
        
        # Cache for 10 minutes
        if result["success"]:
            cache_service.set(cache_key, result["data"], ttl=600)
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to get unified data for {symbol}: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/setup-connections", response_model=schemas.BaseResponse)
async def setup_openbb_connections():
    """Setup connections to existing OpenBB data sources"""
    try:
        result = await mindsdb_service.setup_openbb_connections()
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("connections"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to setup connections: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/financial-insights/{symbol}", response_model=schemas.BaseResponse)
async def get_financial_insights(symbol: str):
    """Get AI-powered financial insights for a symbol"""
    try:
        # This would use an AI agent to analyze the symbol
        insights_query = f"""
        SELECT 
            ai_agent('financial_analyst', 
                'Provide comprehensive financial analysis for {symbol} including:
                - Current valuation assessment
                - Key financial metrics trends
                - Risk factors
                - Growth prospects
                - Recommendation'
            ) as insights
        """
        
        result = await mindsdb_service.execute_query(insights_query)
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to get financial insights for {symbol}: {e}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/integrations/connect", response_model=schemas.BaseResponse)
async def create_integration_connection(request: IntegrationConnectionRequest):
    """Create a connection for a specific integration"""
    try:
        result = await mindsdb_service.create_integration_connection(
            request.integration_id,
            request.connection_params
        )
        
        return schemas.BaseResponse(
            success=result["success"],
            data=result.get("data"),
            error=result.get("error")
        )
    except Exception as e:
        logger.error(f"Failed to create integration connection: {e}")
        return schemas.BaseResponse(success=False, error=str(e))