from fastapi import APIRouter, HTTPException, Query, Body
from typing import Optional, List, Dict
from datetime import datetime
from pydantic import BaseModel
from models import schemas
import uuid

router = APIRouter()

# Pydantic models
class Assignee(BaseModel):
    name: str
    avatar: Optional[str] = None

class Reviewer(BaseModel):
    name: str
    avatar: Optional[str] = None

class DealCreate(BaseModel):
    title: str
    category: str
    assignee: Assignee
    reviewers: List[Reviewer] = []
    pr: Optional[str] = None
    startDate: datetime
    dueDate: datetime

class DealUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    assignee: Optional[Assignee] = None
    reviewers: Optional[List[Reviewer]] = None
    pr: Optional[str] = None
    findings: Optional[int] = None
    comments: Optional[int] = None
    attachments: Optional[int] = None
    startDate: Optional[datetime] = None
    dueDate: Optional[datetime] = None
    completionPercentage: Optional[int] = None

class StatusUpdate(BaseModel):
    status: str

# In-memory storage for demo
deals_db: Dict[str, Dict] = {
    "1": {
        "id": "1",
        "taskId": "349",
        "title": "Review financial statements and audit reports",
        "category": "due-diligence",
        "status": "open",
        "assignee": {"name": "Kathryn Murphy"},
        "reviewers": [{"name": "Jerome Bell"}],
        "findings": 1,
        "comments": 1,
        "attachments": 4,
        "startDate": "2024-08-28T00:00:00Z",
        "dueDate": "2025-01-12T00:00:00Z",
        "completionPercentage": 50,
        "createdAt": "2024-08-01T00:00:00Z",
        "updatedAt": "2024-08-28T00:00:00Z"
    },
    "2": {
        "id": "2",
        "taskId": "776",
        "title": "Analyze corporate structure, including subsidiaries",
        "category": "due-diligence",
        "status": "resolved",
        "assignee": {"name": "Jerome Bell"},
        "reviewers": [{"name": "Kathryn Murphy"}],
        "startDate": "2024-09-27T00:00:00Z",
        "dueDate": "2025-05-30T00:00:00Z",
        "completionPercentage": 100,
        "createdAt": "2024-09-01T00:00:00Z",
        "updatedAt": "2024-10-15T00:00:00Z"
    },
    "3": {
        "id": "3",
        "taskId": "748",
        "title": "Review and analyze contracts and agreements",
        "category": "human-resource",
        "status": "open",
        "assignee": {"name": "Leslie Alexander"},
        "reviewers": [{"name": "Kathryn Murphy"}],
        "startDate": "2024-11-16T00:00:00Z",
        "dueDate": "2025-06-11T00:00:00Z",
        "createdAt": "2024-11-01T00:00:00Z",
        "updatedAt": "2024-11-16T00:00:00Z"
    },
    "4": {
        "id": "4",
        "taskId": "230",
        "title": "Analyze employee benefit plans and compensation",
        "category": "human-resource",
        "status": "in-progress",
        "assignee": {"name": "Arlene McCoy"},
        "reviewers": [{"name": "Jerome Bell"}],
        "findings": 1,
        "comments": 2,
        "attachments": 1,
        "startDate": "2024-09-05T00:00:00Z",
        "dueDate": "2025-06-21T00:00:00Z",
        "completionPercentage": 60,
        "createdAt": "2024-09-01T00:00:00Z",
        "updatedAt": "2024-12-01T00:00:00Z"
    },
    "5": {
        "id": "5",
        "taskId": "330",
        "title": "Review financial statements and audit reports",
        "category": "finance",
        "status": "open",
        "assignee": {"name": "Jerome Bell"},
        "reviewers": [],
        "findings": 1,
        "comments": 2,
        "startDate": "2025-01-02T00:00:00Z",
        "dueDate": "2025-11-02T00:00:00Z",
        "createdAt": "2025-01-01T00:00:00Z",
        "updatedAt": "2025-01-02T00:00:00Z"
    },
    "6": {
        "id": "6",
        "taskId": "331",
        "title": "Verify tax returns and supporting documents",
        "category": "finance",
        "status": "in-progress",
        "assignee": {"name": "Jerome Bell"},
        "reviewers": [],
        "startDate": "2025-04-06T00:00:00Z",
        "dueDate": "2025-12-28T00:00:00Z",
        "completionPercentage": 40,
        "createdAt": "2025-04-01T00:00:00Z",
        "updatedAt": "2025-04-20T00:00:00Z"
    },
    "7": {
        "id": "7",
        "taskId": "332",
        "title": "Analyze sales and distribution channels",
        "category": "sales-operations",
        "status": "in-progress",
        "assignee": {"name": "Leslie Alexander"},
        "reviewers": [],
        "comments": 1,
        "attachments": 2,
        "startDate": "2024-11-22T00:00:00Z",
        "dueDate": "2025-04-07T00:00:00Z",
        "completionPercentage": 75,
        "createdAt": "2024-11-20T00:00:00Z",
        "updatedAt": "2025-01-10T00:00:00Z"
    }
}

@router.get("/deals", response_model=schemas.BaseResponse)
async def get_deals(
    status: Optional[str] = Query(None, description="Filter by status"),
    assignee: Optional[str] = Query(None, description="Filter by assignee name"),
    category: Optional[str] = Query(None, description="Filter by category"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date")
):
    """Get all deals with optional filters"""
    try:
        filtered_deals = []
        
        for deal in deals_db.values():
            # Apply filters
            if status and deal.get("status") != status:
                continue
            if assignee and deal.get("assignee", {}).get("name") != assignee:
                continue
            if category and deal.get("category") != category:
                continue
            if start_date and datetime.fromisoformat(deal["startDate"].replace("Z", "+00:00")) < start_date:
                continue
            if end_date and datetime.fromisoformat(deal["dueDate"].replace("Z", "+00:00")) > end_date:
                continue
            
            filtered_deals.append(deal)
        
        return schemas.BaseResponse(
            success=True,
            data={"deals": filtered_deals}
        )
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/deals/{deal_id}", response_model=schemas.BaseResponse)
async def get_deal(deal_id: str):
    """Get a specific deal by ID"""
    try:
        if deal_id not in deals_db:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        return schemas.BaseResponse(success=True, data=deals_db[deal_id])
    except HTTPException:
        raise
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.post("/deals", response_model=schemas.BaseResponse)
async def create_deal(deal: DealCreate):
    """Create a new deal"""
    try:
        deal_id = str(uuid.uuid4())
        task_id = str(1000 + len(deals_db))
        
        new_deal = {
            "id": deal_id,
            "taskId": task_id,
            "title": deal.title,
            "category": deal.category,
            "status": "open",
            "assignee": deal.assignee.dict(),
            "reviewers": [r.dict() for r in deal.reviewers],
            "pr": deal.pr,
            "startDate": deal.startDate.isoformat() + "Z",
            "dueDate": deal.dueDate.isoformat() + "Z",
            "completionPercentage": 0,
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z"
        }
        
        deals_db[deal_id] = new_deal
        
        return schemas.BaseResponse(success=True, data=new_deal)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.put("/deals/{deal_id}", response_model=schemas.BaseResponse)
async def update_deal(deal_id: str, updates: DealUpdate):
    """Update a deal"""
    try:
        if deal_id not in deals_db:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        deal = deals_db[deal_id]
        update_data = updates.dict(exclude_unset=True)
        
        # Convert datetime objects to strings
        if "startDate" in update_data:
            update_data["startDate"] = update_data["startDate"].isoformat() + "Z"
        if "dueDate" in update_data:
            update_data["dueDate"] = update_data["dueDate"].isoformat() + "Z"
        
        # Convert nested objects
        if "assignee" in update_data:
            update_data["assignee"] = update_data["assignee"].dict() if update_data["assignee"] else None
        if "reviewers" in update_data:
            update_data["reviewers"] = [r.dict() for r in update_data["reviewers"]] if update_data["reviewers"] else []
        
        # Update the deal
        deal.update(update_data)
        deal["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        return schemas.BaseResponse(success=True, data=deal)
    except HTTPException:
        raise
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.patch("/deals/{deal_id}/status", response_model=schemas.BaseResponse)
async def update_deal_status(deal_id: str, status_update: StatusUpdate):
    """Update only the status of a deal"""
    try:
        if deal_id not in deals_db:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        deal = deals_db[deal_id]
        deal["status"] = status_update.status
        deal["updatedAt"] = datetime.utcnow().isoformat() + "Z"
        
        # Update completion percentage based on status
        if status_update.status == "resolved":
            deal["completionPercentage"] = 100
        elif status_update.status == "in-progress" and deal.get("completionPercentage", 0) == 0:
            deal["completionPercentage"] = 50
        
        return schemas.BaseResponse(success=True, data=deal)
    except HTTPException:
        raise
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.delete("/deals/{deal_id}", response_model=schemas.BaseResponse)
async def delete_deal(deal_id: str):
    """Delete a deal"""
    try:
        if deal_id not in deals_db:
            raise HTTPException(status_code=404, detail="Deal not found")
        
        del deals_db[deal_id]
        
        return schemas.BaseResponse(success=True, data={"message": "Deal deleted successfully"})
    except HTTPException:
        raise
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/categories", response_model=schemas.BaseResponse)
async def get_categories():
    """Get all deal categories with counts"""
    try:
        categories = {}
        
        for deal in deals_db.values():
            cat = deal.get("category", "uncategorized")
            if cat not in categories:
                categories[cat] = {"id": cat, "name": cat, "dealCount": 0}
            categories[cat]["dealCount"] += 1
        
        return schemas.BaseResponse(
            success=True,
            data=list(categories.values())
        )
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))

@router.get("/statistics", response_model=schemas.BaseResponse)
async def get_statistics():
    """Get dealroom statistics"""
    try:
        stats = {
            "total_deals": len(deals_db),
            "by_status": {"open": 0, "in-progress": 0, "resolved": 0},
            "by_category": {},
            "by_assignee": {},
            "completion_rate": 0
        }
        
        for deal in deals_db.values():
            # Status counts
            status = deal.get("status", "open")
            if status in stats["by_status"]:
                stats["by_status"][status] += 1
            
            # Category counts
            category = deal.get("category", "uncategorized")
            if category not in stats["by_category"]:
                stats["by_category"][category] = 0
            stats["by_category"][category] += 1
            
            # Assignee counts
            assignee = deal.get("assignee", {}).get("name", "Unassigned")
            if assignee not in stats["by_assignee"]:
                stats["by_assignee"][assignee] = 0
            stats["by_assignee"][assignee] += 1
        
        # Calculate completion rate
        if stats["total_deals"] > 0:
            stats["completion_rate"] = (stats["by_status"]["resolved"] / stats["total_deals"]) * 100
        
        return schemas.BaseResponse(success=True, data=stats)
    except Exception as e:
        return schemas.BaseResponse(success=False, error=str(e))