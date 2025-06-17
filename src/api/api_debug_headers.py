from fastapi import APIRouter, Request
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/debug/headers")
async def debug_headers(request: Request):
    """Debug endpoint to check headers"""
    headers = dict(request.headers)
    logger.info(f"Received headers: {headers}")
    
    auth_header = headers.get("authorization", "No auth header")
    logger.info(f"Authorization header: {auth_header}")
    
    return {
        "headers": headers,
        "auth_header": auth_header,
        "has_bearer": auth_header.startswith("Bearer ") if auth_header != "No auth header" else False
    }