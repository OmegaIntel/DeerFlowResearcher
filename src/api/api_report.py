# src/server/report_api.py - CORRECTED Implementation

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Annotated
from pydantic import BaseModel
from datetime import datetime
import math

from src.service.report_service import ReportService
from src.api.api_get_current_user import get_current_user, User
from sqlalchemy.orm import Session
from src.db.db_session import get_db

report_router = APIRouter()


# Response Models
class ReportSummary(BaseModel):
    """Response model for report list (pagination view)"""

    id: str
    report_name: str
    created_at: datetime

    class Config:
        from_attributes = True


class ReportListResponse(BaseModel):
    """Response model for paginated report list"""

    reports: List[ReportSummary]
    total_count: int
    page: int
    limit: int
    total_pages: int
    has_next_page: bool
    has_previous_page: bool

    @classmethod
    def create(cls, reports_data: List[dict], total_count: int, page: int, limit: int):
        """Helper method to create paginated response"""
        total_pages = math.ceil(total_count / limit) if total_count > 0 else 1
        has_next_page = page < total_pages
        has_previous_page = page > 1

        # Convert dict data to ReportSummary objects
        reports = [
            ReportSummary(
                id=report["id"],
                report_name=report["report_name"],
                created_at=report["created_at"],
            )
            for report in reports_data
        ]

        return cls(
            reports=reports,
            total_count=total_count,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next_page=has_next_page,
            has_previous_page=has_previous_page,
        )


class ReportDetail(BaseModel):
    """Response model for full report detail"""

    id: str
    thread_id: str
    report_name: str
    report_content: str
    plan_title: Optional[str]
    plan_description: Optional[str]
    plan_iterations: int
    locale: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_report(cls, report, report_name: str):
        """Helper method to create ReportDetail from Report model"""
        return cls(
            id=str(report.id),
            thread_id=report.thread_id,
            report_name=report_name,
            report_content=report.report_content,
            plan_title=report.plan_title,
            plan_description=report.plan_description,
            plan_iterations=report.plan_iterations,
            locale=report.locale,
            created_at=report.created_at,
            updated_at=report.updated_at,
        )


# API Endpoints
@report_router.get("/api/reports/my-reports", response_model=ReportListResponse)
async def get_my_reports(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Number of reports per page"),
):
    """
    Get paginated list of reports for the current user.

    Returns lightweight report summaries with report names extracted from content.
    """
    try:
        # Calculate offset for pagination
        offset = (page - 1) * limit

        # Get reports with extracted names
        reports_data = ReportService.get_user_reports_with_names(
            user_id=current_user.id, limit=limit, offset=offset, db=db
        )

        # Get total count for pagination
        total_count = ReportService.get_user_reports_count(
            user_id=current_user.id, db=db
        )

        # Create paginated response
        response = ReportListResponse.create(
            reports_data=reports_data, total_count=total_count, page=page, limit=limit
        )

        return response

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve reports: {str(e)}"
        )


@report_router.get("/api/reports/{report_id}", response_model=ReportDetail)
async def get_report_by_id(
    report_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get full report details by report ID.

    Only returns reports owned by the current user for security.
    """
    try:
        # Get full report by ID
        report = ReportService.get_report_by_id(
            report_id=report_id, user_id=current_user.id, db=db
        )

        if not report:
            raise HTTPException(
                status_code=404, detail=f"Report not found with ID: {report_id}"
            )

        # Extract report name from content
        report_name = ReportService.extract_report_name(
            content=report.report_content, plan_title=report.plan_title
        )

        # Create detailed response
        response = ReportDetail.from_report(report, report_name)

        return response

    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve report: {str(e)}"
        )


@report_router.get("/api/reports/thread/{thread_id}", response_model=ReportDetail)
async def get_report_by_thread(
    thread_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Get report by thread ID.

    Useful for retrieving the report associated with a specific conversation.
    Only returns reports owned by the current user.
    """
    try:
        # FIXED: Update this method to accept db session parameter
        # You'll need to modify get_report_by_thread_id in ReportService to accept db parameter
        report = ReportService.get_report_by_thread_id(
            thread_id=thread_id,
            user_id=current_user.id,
            db=db,  # Pass db session if the method supports it
        )

        if not report:
            raise HTTPException(
                status_code=404, detail=f"Report not found for thread: {thread_id}"
            )

        # Extract report name from content
        report_name = ReportService.extract_report_name(
            content=report.report_content, plan_title=report.plan_title
        )

        # Create detailed response
        response = ReportDetail.from_report(report, report_name)

        return response

    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve report: {str(e)}"
        )


@report_router.get("/api/reports/health")
async def reports_health_check():
    """Simple health check endpoint for the reports API"""
    return {"status": "healthy", "service": "reports_api"}
