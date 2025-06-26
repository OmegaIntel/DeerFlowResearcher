from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, JSONResponse
from services.onlyoffice_service import onlyoffice_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/create-session")
async def create_excel_session(request: Request):
    """Create OnlyOffice editing session for Excel file"""
    try:
        data = await request.json()
        file_data = data.get('file_data')  # base64 encoded file
        filename = data.get('filename', 'document.xlsx')
        user_id = data.get('user_id', 'default')
        
        if not file_data:
            raise HTTPException(status_code=400, detail="No file data provided")
        
        import base64
        file_content = base64.b64decode(file_data)
        
        result = onlyoffice_service.create_edit_session(file_content, filename, user_id)
        
        if result.get('success'):
            return JSONResponse(result)
        else:
            raise HTTPException(status_code=500, detail=result.get('error', 'Unknown error'))
            
    except Exception as e:
        logger.error(f"Error creating Excel session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download/{doc_key}")
async def download_document(doc_key: str):
    """Download document for OnlyOffice to load"""
    try:
        content = onlyoffice_service.get_document(doc_key)
        if content:
            return Response(
                content=content,
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                    "Content-Disposition": f"attachment; filename=document.xlsx"
                }
            )
        else:
            raise HTTPException(status_code=404, detail="Document not found")
            
    except Exception as e:
        logger.error(f"Error downloading document: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/callback/{doc_key}")
async def onlyoffice_callback(doc_key: str, request: Request):
    """Handle OnlyOffice save callbacks"""
    try:
        callback_data = await request.json()
        result = onlyoffice_service.handle_callback(doc_key, callback_data)
        return JSONResponse(result)
        
    except Exception as e:
        logger.error(f"Error handling callback: {str(e)}")
        return JSONResponse({"error": 1, "message": str(e)})

@router.get("/health")
async def check_onlyoffice_health():
    """Check OnlyOffice server health"""
    is_healthy = onlyoffice_service.check_server_health()
    return JSONResponse({
        "onlyoffice_available": is_healthy,
        "server_url": onlyoffice_service.server_url
    })