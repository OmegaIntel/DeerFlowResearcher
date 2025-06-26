from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional
import logging
from services.data_cleaning_service import DataCleaningService
from models import schemas

logger = logging.getLogger(__name__)

router = APIRouter()
cleaning_service = DataCleaningService()

@router.get("/analyze", response_model=schemas.BaseResponse)
async def analyze_data_quality():
    """Analyze data quality issues in Non-PPP companies"""
    try:
        analysis = cleaning_service.analyze_non_ppp_companies()
        return schemas.BaseResponse(success=True, data=analysis)
    except Exception as e:
        logger.error(f"Error analyzing data quality: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/clean", response_model=schemas.BaseResponse)
async def start_cleaning_process(
    background_tasks: BackgroundTasks,
    batch_size: int = Query(1000, ge=100, le=5000, description="Batch size for processing")
):
    """Start the data cleaning process for Non-PPP companies"""
    try:
        # Run cleaning in background
        background_tasks.add_task(
            cleaning_service.run_cleaning_process,
            batch_size=batch_size
        )
        
        return schemas.BaseResponse(
            success=True,
            data={
                "message": "Data cleaning process started in background",
                "batch_size": batch_size
            }
        )
    except Exception as e:
        logger.error(f"Error starting cleaning process: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/test-extraction", response_model=schemas.BaseResponse)
async def test_name_extraction(
    text: str = Query(..., description="Text to extract company name from")
):
    """Test company name extraction from text"""
    try:
        extracted = cleaning_service.extract_company_name_from_description(text)
        return schemas.BaseResponse(
            success=True,
            data={
                "original_text": text,
                "extracted_name": extracted
            }
        )
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))