# src/server/report_api.py

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Annotated
from pydantic import BaseModel
from datetime import datetime

from src.service.report_service import ReportService
from src.api.api_get_current_user import get_current_user, User

report_router = APIRouter()


class ReportResponse(BaseModel):
    id: str
    thread_id: str
    report_content: str
    plan_title: Optional[str]
    plan_description: Optional[str]
    plan_iterations: int
    locale: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    reports: List[ReportResponse]
    total: int
    page: int
    limit: int


@report_router.get("/api/reports/thread/{thread_id}", response_model=ReportResponse)
async def get_report_by_thread(
    thread_id: str,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get a report by thread ID. Only returns reports owned by the current user."""
    report = ReportService.get_report_by_thread_id(thread_id, current_user.id)
    
    if not report:
        raise HTTPException(
            status_code=404, 
            detail=f"Report not found for thread {thread_id}"
        )
    
    return ReportResponse.from_orm(report)


@report_router.get("/api/reports/my-reports", response_model=ReportListResponse)
async def get_my_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Number of reports per page")
):
    """Get reports for the current user with pagination."""
    offset = (page - 1) * limit
    reports = ReportService.get_user_reports(current_user.id, limit, offset)
    
    # Note: You might want to add a count method to get total reports
    # For now, we'll return the current page size
    return ReportListResponse(
        reports=[ReportResponse.from_orm(report) for report in reports],
        total=len(reports),  # This should be the actual total count
        page=page,
        limit=limit
    )


@report_router.get("/api/reports/{report_id}", response_model=ReportResponse)
async def get_report_by_id(
    report_id: str,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """Get a specific report by ID. Only returns reports owned by the current user."""
    # You'll need to add this method to ReportService
    # report = ReportService.get_report_by_id(report_id, current_user.id)
    
    # For now, return an error since the method doesn't exist yet
    raise HTTPException(
        status_code=501,
        detail="Get report by ID not implemented yet"
    )


# Admin endpoints (if needed)
@report_router.get("/api/admin/reports", response_model=ReportListResponse)
async def get_all_reports_admin(
    current_user: Annotated[User, Depends(get_current_user)],
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    """Admin endpoint to get all reports. Requires admin privileges."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Admin privileges required"
        )
    
    # You'll need to add an admin method to ReportService
    raise HTTPException(
        status_code=501,
        detail="Admin report listing not implemented yet"
    )