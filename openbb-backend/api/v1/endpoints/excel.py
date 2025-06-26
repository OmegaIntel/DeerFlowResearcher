from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
import pandas as pd
import openpyxl
from io import BytesIO
import base64
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory storage for demo (use database in production)
excel_sessions = {}

@router.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    """Upload an Excel file and return session ID"""
    try:
        # Validate file type
        if not file.filename.endswith(('.xlsx', '.xls', '.xlsm')):
            raise HTTPException(status_code=400, detail="Invalid file type. Only Excel files are allowed.")
        
        # Read file content
        content = await file.read()
        
        # Generate session ID
        session_id = f"excel_{datetime.now().timestamp()}"
        
        # Store in memory (in production, use object storage)
        excel_sessions[session_id] = {
            "filename": file.filename,
            "content": content,
            "upload_time": datetime.now(),
            "size": len(content)
        }
        
        # Parse Excel to get basic info
        df_dict = pd.read_excel(BytesIO(content), sheet_name=None)
        
        sheets_info = []
        for sheet_name, df in df_dict.items():
            sheets_info.append({
                "name": sheet_name,
                "rows": len(df),
                "columns": len(df.columns),
                "columns_list": df.columns.tolist()
            })
        
        return JSONResponse({
            "session_id": session_id,
            "filename": file.filename,
            "size": len(content),
            "sheets": sheets_info
        })
        
    except Exception as e:
        logger.error(f"Error uploading Excel file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_excel_session(session_id: str):
    """Get Excel file data for viewing/editing"""
    try:
        if session_id not in excel_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = excel_sessions[session_id]
        content = session["content"]
        
        # Convert to base64 for frontend
        base64_content = base64.b64encode(content).decode('utf-8')
        
        return JSONResponse({
            "session_id": session_id,
            "filename": session["filename"],
            "base64_content": base64_content,
            "size": session["size"]
        })
        
    except Exception as e:
        logger.error(f"Error getting Excel session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/session/{session_id}/save")
async def save_excel_changes(session_id: str, data: Dict[str, Any]):
    """Save changes to Excel file"""
    try:
        if session_id not in excel_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Get the modified content from frontend
        base64_content = data.get("content")
        if not base64_content:
            raise HTTPException(status_code=400, detail="No content provided")
        
        # Decode base64
        content = base64.b64decode(base64_content)
        
        # Update session
        excel_sessions[session_id]["content"] = content
        excel_sessions[session_id]["last_modified"] = datetime.now()
        
        return JSONResponse({
            "status": "success",
            "message": "Changes saved successfully"
        })
        
    except Exception as e:
        logger.error(f"Error saving Excel changes: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/download")
async def download_excel(session_id: str):
    """Download Excel file"""
    try:
        if session_id not in excel_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = excel_sessions[session_id]
        content = session["content"]
        filename = session["filename"]
        
        return StreamingResponse(
            BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading Excel: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}/data")
async def get_excel_data(session_id: str, sheet: Optional[str] = None):
    """Get Excel data as JSON for analysis"""
    try:
        if session_id not in excel_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = excel_sessions[session_id]
        content = session["content"]
        
        # Read Excel file
        if sheet:
            df = pd.read_excel(BytesIO(content), sheet_name=sheet)
            data = {
                sheet: df.to_dict(orient='records')
            }
        else:
            df_dict = pd.read_excel(BytesIO(content), sheet_name=None)
            data = {
                sheet_name: df.to_dict(orient='records')
                for sheet_name, df in df_dict.items()
            }
        
        return JSONResponse({
            "session_id": session_id,
            "filename": session["filename"],
            "data": data
        })
        
    except Exception as e:
        logger.error(f"Error getting Excel data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates")
async def get_excel_templates():
    """Get list of available Excel templates"""
    templates = [
        {
            "id": "dcf-model",
            "name": "DCF Valuation Model",
            "description": "Discounted Cash Flow model with sensitivity analysis",
            "category": "valuation"
        },
        {
            "id": "three-statement",
            "name": "Three Statement Model",
            "description": "Integrated financial statements",
            "category": "financial"
        },
        {
            "id": "lbo-model",
            "name": "LBO Model",
            "description": "Leveraged Buyout model with returns analysis",
            "category": "valuation"
        }
    ]
    
    return JSONResponse({"templates": templates})

@router.get("/templates/{template_id}/download")
async def download_template(template_id: str):
    """Download a specific Excel template"""
    try:
        # For demo, return the sample file
        # In production, load actual template files
        with open("/root/openBB/openbb-frontend/public/sample-financials.xlsx", "rb") as f:
            content = f.read()
        
        return StreamingResponse(
            BytesIO(content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={template_id}.xlsx"
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading template: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))