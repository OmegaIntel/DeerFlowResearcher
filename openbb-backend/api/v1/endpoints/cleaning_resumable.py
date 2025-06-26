from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
import sys
import os

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from services.resumable_cleaning_service import ResumableCleaningService
from models import schemas

logger = logging.getLogger(__name__)

router = APIRouter()
cleaning_service = ResumableCleaningService()

@router.get("/status", response_model=schemas.BaseResponse)
async def get_cleaning_status():
    """Get current status of the cleaning process"""
    try:
        status = cleaning_service.get_status()
        return schemas.BaseResponse(success=True, data=status)
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/process-batch", response_model=schemas.BaseResponse)
async def process_next_batch(
    batch_size: int = Query(1000, ge=100, le=10000, description="Number of companies to process in this batch")
):
    """Process the next batch of companies"""
    try:
        result = cleaning_service.process_single_batch(batch_size)
        return schemas.BaseResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/start-or-resume", response_model=schemas.BaseResponse)
async def start_or_resume_cleaning(
    batch_size: int = Query(1000, ge=100, le=10000, description="Batch size for processing")
):
    """Start new cleaning or resume from checkpoint"""
    try:
        result = cleaning_service.start_or_resume(batch_size)
        return schemas.BaseResponse(success=True, data=result)
    except Exception as e:
        logger.error(f"Error starting/resuming: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/summary", response_model=schemas.BaseResponse)
async def get_summary_report():
    """Get summary report of the cleaning process"""
    try:
        summary = cleaning_service.get_summary_report()
        return schemas.BaseResponse(success=True, data=summary)
    except Exception as e:
        logger.error(f"Error getting summary: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))

@router.delete("/checkpoint", response_model=schemas.BaseResponse)
async def reset_checkpoint():
    """Reset the checkpoint to start fresh (use with caution)"""
    try:
        import os
        checkpoint_file = '/cleaning_data/cleaning_checkpoint.json'
        if os.path.exists(checkpoint_file):
            os.remove(checkpoint_file)
            return schemas.BaseResponse(
                success=True, 
                data={"message": "Checkpoint reset successfully. Next run will start from beginning."}
            )
        else:
            return schemas.BaseResponse(
                success=True,
                data={"message": "No checkpoint found to reset."}
            )
    except Exception as e:
        logger.error(f"Error resetting checkpoint: {str(e)}")
        return schemas.BaseResponse(success=False, error=str(e))