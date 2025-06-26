from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, List
import logging
from services.unified_db_service import unified_db_service
from services.semantic_search_service import SemanticSearchService
from models import schemas

logger = logging.getLogger(__name__)

router = APIRouter()
private_company_service = unified_db_service
semantic_search_service = SemanticSearchService()

@router.get("/list", response_model=schemas.BaseResponse)
async def list_companies(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(100, ge=1, le=1000, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term"),
    industry_primary: Optional[str] = Query(None, description="Filter by primary industry"),
    state: Optional[str] = Query(None, description="Filter by state"),
    status: Optional[str] = Query(None, description="Filter by status"),
    founded_year_min: Optional[int] = Query(None, description="Minimum founded year"),
    founded_year_max: Optional[int] = Query(None, description="Maximum founded year"),
    employee_count_min: Optional[int] = Query(None, description="Minimum employee count"),
    employee_count_max: Optional[int] = Query(None, description="Maximum employee count"),
    data_source: Optional[str] = Query(None, description="Filter by data source"),
    exclude_ppp: bool = Query(False, description="Exclude PPP loan companies")
):
    """Get paginated list of private companies with optional filters"""
    try:
        # Build filters dict
        filters = {}
        if industry_primary:
            filters['industry_primary'] = industry_primary
        if state:
            filters['state'] = state
        if status:
            filters['status'] = status
        if founded_year_min:
            filters['founded_year_min'] = founded_year_min
        if founded_year_max:
            filters['founded_year_max'] = founded_year_max
        if employee_count_min:
            filters['employee_count_min'] = employee_count_min
        if employee_count_max:
            filters['employee_count_max'] = employee_count_max
        if data_source:
            filters['data_source'] = data_source
        if exclude_ppp:
            filters['exclude_ppp'] = True
        
        companies, total_count = private_company_service.get_companies(
            page=page,
            limit=limit,
            search=search,
            filters=filters if filters else None
        )
        
        return schemas.BaseResponse(
            success=True,
            data={
                'companies': companies,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total_count': total_count,
                    'total_pages': (total_count + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/search", response_model=schemas.BaseResponse)
async def search_companies(
    q: str = Query(..., description="Search query"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results")
):
    """Quick search for companies by name or domain"""
    try:
        companies, _ = private_company_service.get_companies(
            page=1,
            limit=limit,
            search=q
        )
        
        return schemas.BaseResponse(success=True, data=companies)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/statistics", response_model=schemas.BaseResponse)
async def get_statistics():
    """Get database statistics"""
    try:
        stats = private_company_service.get_statistics()
        return schemas.BaseResponse(success=True, data=stats)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/filters", response_model=schemas.BaseResponse)
async def get_filter_options():
    """Get available filter options"""
    try:
        options = private_company_service.get_filter_options()
        return schemas.BaseResponse(success=True, data=options)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/semantic-search", response_model=schemas.BaseResponse)
async def semantic_search(
    q: str = Query(..., description="Natural language search query", example="automobile companies in California"),
    limit: int = Query(100, ge=1, le=500, description="Maximum results")
):
    """
    Perform semantic search using natural language queries.
    
    Examples:
    - "automobile companies in California"
    - "tech startups in New York with over 100 employees"
    - "healthcare companies founded after 2015"
    - "companies in Texas that received PPP loans"
    """
    try:
        companies, parsed_query = semantic_search_service.semantic_search(q, limit)
        
        return schemas.BaseResponse(
            success=True,
            data={
                'companies': companies,
                'total_count': len(companies),
                'parsed_query': parsed_query,
                'query': q
            }
        )
    except Exception as e:
        logger.error(f"Semantic search error: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/semantic-search/index", response_model=schemas.BaseResponse)
async def index_companies_for_search(
    batch_size: int = Query(100, ge=10, le=1000, description="Batch size for indexing")
):
    """
    Index all companies for vector search (requires Pinecone).
    This is a one-time operation that should be run after initial data load.
    """
    try:
        semantic_search_service.index_companies(batch_size)
        return schemas.BaseResponse(
            success=True,
            data={"message": "Indexing started. Check logs for progress."}
        )
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/{company_id}", response_model=schemas.BaseResponse)
async def get_company_details(company_id: str):
    """Get details for a specific company"""
    try:
        company = private_company_service.get_company_by_id(company_id)
        
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")
        
        return schemas.BaseResponse(success=True, data=company)
    except HTTPException:
        raise
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/cache/warm", response_model=schemas.BaseResponse)
async def warm_cache():
    """Pre-warm cache with common queries"""
    try:
        # Cache first few pages
        for page in range(1, 6):
            private_company_service.get_companies(page=page, limit=100)
        
        # Cache filter options
        private_company_service.get_filter_options()
        
        # Cache statistics
        private_company_service.get_statistics()
        
        return schemas.BaseResponse(success=True, data={"message": "Cache warmed successfully"})
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.delete("/cache", response_model=schemas.BaseResponse)
async def clear_cache(pattern: Optional[str] = Query(None, description="Cache key pattern to clear")):
    """Clear cache entries"""
    try:
        private_company_service.clear_cache(pattern)
        return schemas.BaseResponse(success=True, data={"message": f"Cache cleared for pattern: {pattern or 'all'}"})
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))