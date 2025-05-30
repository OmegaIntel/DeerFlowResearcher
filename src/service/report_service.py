# src/services/report_service.py
import logging
import json
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from src.db_models.report import Report
from src.db.db_session import get_db
from src.prompts.planner_model import Plan

logger = logging.getLogger(__name__)


class ReportService:
    """Service class for managing report operations."""
    
    @staticmethod
    def extract_report_name(content: str, plan_title: Optional[str] = None) -> str:
        """
        Extract report name from markdown content (first # heading).
        
        Args:
            content: The report content in markdown format
            plan_title: Fallback title if no heading found
            
        Returns:
            Extracted report name or fallback title
        """
        if not content:
            return plan_title or "Untitled Report"
            
        lines = content.strip().split('\n')
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()  # Remove '# ' prefix
                if title:  # Make sure it's not empty
                    return title
        
        # Fallback to plan_title or default
        return plan_title or "Untitled Report"
    
    @staticmethod
    def get_user_reports_count(user_id: str, db: Session) -> int:
        """
        Get total count of reports for a specific user.
        
        Args:
            user_id: The user ID
            db: Database session
            
        Returns:
            Total number of reports for the user
        """
        try:
            count = db.query(Report).filter(Report.user_id == user_id).count()
            return count
        except Exception as e:
            logger.exception(f"[get_user_reports_count] Error counting reports for user {user_id}: {e}")
            return 0
    
    @staticmethod
    def get_user_reports_with_names(user_id: str, limit: int, offset: int, db: Session) -> List[Dict[str, Any]]:
        """
        Get reports for a user with extracted report names.
        
        Args:
            user_id: The user ID
            limit: Maximum number of reports to return
            offset: Number of reports to skip
            db: Database session
            
        Returns:
            List of dictionaries with report summaries
        """
        try:
            reports = (
                db.query(Report)
                .filter(Report.user_id == user_id)
                .order_by(Report.created_at.desc())
                .limit(limit)
                .offset(offset)
                .all()
            )
            
            result = []
            for report in reports:
                report_name = ReportService.extract_report_name(
                    report.report_content, 
                    report.plan_title
                )
                result.append({
                    "id": str(report.id),
                    "report_name": report_name,
                    "created_at": report.created_at
                })
            
            return result
            
        except Exception as e:
            logger.exception(f"[get_user_reports_with_names] Error retrieving reports for user {user_id}: {e}")
            return []
    
    @staticmethod
    def get_report_by_id(report_id: str, user_id: str, db: Session) -> Optional[Report]:
        """
        Get full report by ID for a specific user.
        
        Args:
            report_id: The report ID
            user_id: The user ID (for access control)
            db: Database session
            
        Returns:
            Report object if found and accessible by user, None otherwise
        """
        try:
            report = db.query(Report).filter(
                Report.id == report_id,
                Report.user_id == user_id
            ).first()
            return report
        except Exception as e:
            logger.exception(f"[get_report_by_id] Error retrieving report {report_id} for user {user_id}: {e}")
            return None
    
    # Keep all your existing methods below...
    
    @staticmethod
    async def save_report_from_state(
        thread_id: str,
        final_state: Dict[str, Any],
        request_context: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None
    ) -> Optional[str]:
        """
        Save a report from the graph's final state to the database.
        
        Args:
            thread_id: The conversation thread ID
            final_state: The final state from the graph execution
            request_context: Original request context (ChatRequest data)
            user_id: Optional user ID if authenticated
            
        Returns:
            The report ID if saved successfully, None if failed
        """
        try:
            print(f"DEBUG: save_report_from_state called for thread {thread_id}")
            print(f"DEBUG: user_id: {user_id}")
            print(f"DEBUG: final_state type: {type(final_state)}")
            
            # Debug the final_state structure
            logger.debug(f"[save_report] final_state type: {type(final_state)}")
            logger.debug(f"[save_report] final_state content: {final_state}")
            
            # Handle different state formats
            if final_state is None:
                print(f"DEBUG: final_state is None")
                logger.warning(f"[save_report] final_state is None for thread {thread_id}")
                return None
                
            if not isinstance(final_state, dict):
                print(f"DEBUG: final_state is not a dict")
                logger.error(f"[save_report] final_state is not a dict. Type: {type(final_state)}, Content: {final_state}")
                return None
            
            print(f"DEBUG: final_state keys: {list(final_state.keys())}")
            
            # Extract report content
            final_report = final_state.get("final_report", "")
            print(f"DEBUG: final_report type: {type(final_report)}")
            print(f"DEBUG: final_report length: {len(final_report) if final_report else 0}")
            print(f"DEBUG: final_report preview: {final_report[:100] if final_report else 'None'}")
            
            if not final_report or final_report.strip() == "":
                print(f"DEBUG: Empty or None final_report, skipping save")
                logger.warning(f"[save_report] Empty report for thread {thread_id}, skipping save")
                return None
            
            logger.info(f"[save_report] Found report content with length: {len(final_report)}")
            
            # Extract plan information
            current_plan = final_state.get("current_plan")
            plan_title = None
            plan_description = None
            
            print(f"DEBUG: current_plan type: {type(current_plan)}")
            
            if current_plan:
                logger.debug(f"[save_report] current_plan type: {type(current_plan)}")
                if isinstance(current_plan, Plan):
                    plan_title = current_plan.title
                    plan_description = current_plan.thought
                elif isinstance(current_plan, dict):
                    plan_title = current_plan.get("title")
                    plan_description = current_plan.get("thought")
                elif isinstance(current_plan, str):
                    # Handle case where plan is stored as JSON string
                    try:
                        plan_data = json.loads(current_plan)
                        plan_title = plan_data.get("title")
                        plan_description = plan_data.get("thought")
                    except json.JSONDecodeError:
                        logger.warning(f"[save_report] Could not parse plan JSON for thread {thread_id}")
            
            print(f"DEBUG: plan_title: {plan_title}")
            print(f"DEBUG: plan_description: {plan_description[:100] if plan_description else 'None'}")
            
            # Prepare observations
            observations = final_state.get("observations", [])
            observations_json = observations if observations else None
            
            print(f"DEBUG: observations count: {len(observations) if observations else 0}")
            
            # Extract request context if provided
            request_data = request_context or {}
            
            print(f"DEBUG: About to create database session")
            
            # Create database session
            try:
                db = next(get_db())
                print(f"DEBUG: Database session created successfully")
            except Exception as e:
                print(f"DEBUG: Error creating database session: {e}")
                return None
            
            try:
                print(f"DEBUG: Creating Report object")
                # Create report record
                report = Report(
                    thread_id=thread_id,
                    user_id=user_id,
                    report_content=final_report,
                    plan_title=plan_title,
                    plan_description=plan_description,
                    plan_iterations=final_state.get("plan_iterations", 0),
                    locale=final_state.get("locale", "en-US"),
                    max_plan_iterations=request_data.get("max_plan_iterations"),
                    max_step_num=request_data.get("max_step_num"),
                    auto_accepted_plan=str(request_data.get("auto_accepted_plan", False)).lower(),
                    enable_background_investigation=str(request_data.get("enable_background_investigation", True)).lower(),
                    observations=observations_json,
                    mcp_settings=request_data.get("mcp_settings")
                )
                
                print(f"DEBUG: Report object created, adding to session")
                
                # Save to database
                db.add(report)
                print(f"DEBUG: Added to session, committing")
                db.commit()
                print(f"DEBUG: Committed, refreshing")
                db.refresh(report)
                print(f"DEBUG: Report saved with ID: {report.id}")
                
                logger.info(f"[save_report] Successfully saved report {report.id} for thread {thread_id}")
                return str(report.id)
                
            except SQLAlchemyError as e:
                print(f"DEBUG: SQLAlchemy error: {e}")
                db.rollback()
                logger.error(f"[save_report] Database error saving report for thread {thread_id}: {e}")
                return None
            except Exception as e:
                print(f"DEBUG: Other database error: {e}")
                db.rollback()
                logger.error(f"[save_report] Unexpected database error for thread {thread_id}: {e}")
                return None
            finally:
                print(f"DEBUG: Closing database session")
                db.close()
                
        except Exception as e:
            print(f"DEBUG: Exception in save_report_from_state: {e}")
            logger.exception(f"[save_report] Unexpected error saving report for thread {thread_id}: {e}")
            return None
    
    @staticmethod
    def get_report_by_thread_id(thread_id: str, user_id: Optional[str] = None) -> Optional[Report]:
        """
        Retrieve a report by thread ID.
        
        Args:
            thread_id: The conversation thread ID
            user_id: Optional user ID for access control
            
        Returns:
            Report object if found, None otherwise
        """
        try:
            db = next(get_db())
            try:
                query = db.query(Report).filter(Report.thread_id == thread_id)
                
                # Add user filter if provided (for access control)
                if user_id:
                    query = query.filter(Report.user_id == user_id)
                
                report = query.first()
                return report
            finally:
                db.close()
                
        except Exception as e:
            logger.exception(f"[get_report] Error retrieving report for thread {thread_id}: {e}")
            return None
    
    @staticmethod
    def get_user_reports(user_id: str, limit: int = 10, offset: int = 0) -> list[Report]:
        """
        Get reports for a specific user.
        
        Args:
            user_id: The user ID
            limit: Maximum number of reports to return
            offset: Number of reports to skip
            
        Returns:
            List of Report objects
        """
        try:
            db = next(get_db())
            try:
                reports = (
                    db.query(Report)
                    .filter(Report.user_id == user_id)
                    .order_by(Report.created_at.desc())
                    .limit(limit)
                    .offset(offset)
                    .all()
                )
                return reports
            finally:
                db.close()
                
        except Exception as e:
            logger.exception(f"[get_user_reports] Error retrieving reports for user {user_id}: {e}")
            return []