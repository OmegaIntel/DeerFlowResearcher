from fastapi import Request
import logging
import sys

# Set up logging to ensure it outputs
logging.basicConfig(level=logging.INFO, stream=sys.stdout, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def log_auth_headers(request: Request, call_next):
    """Middleware to log authentication headers for debugging"""
    if request.url.path.startswith("/api/documents/upload"):
        print(f"=== Auth Debug for {request.method} {request.url.path} ===", flush=True)
        auth_header = request.headers.get("authorization", "No auth header")
        print(f"Authorization header: {auth_header}", flush=True)
        print(f"All headers: {dict(request.headers)}", flush=True)
        print("=== End Auth Debug ===", flush=True)
    
    response = await call_next(request)
    return response