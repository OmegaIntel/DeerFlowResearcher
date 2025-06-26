"""
API endpoints for report generation
"""

from fastapi import APIRouter, HTTPException, Body, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import os
import tempfile

from services.report_generator import ReportGenerator
from services.copilot_agent import OpenBBCopilotAgent

router = APIRouter()

# Initialize services
report_generator = ReportGenerator()
copilot_agent = OpenBBCopilotAgent()


class GenerateReportRequest(BaseModel):
    session_id: str
    report_type: str = "pdf"  # pdf or excel
    include_sections: Dict[str, bool] = Field(default_factory=lambda: {
        "summary": True,
        "company_info": True,
        "financial_metrics": True,
        "valuation": True,
        "risk_analysis": True,
        "charts": True
    })
    custom_title: Optional[str] = None
    email_to: Optional[str] = None


class ReportResponse(BaseModel):
    report_id: str
    filename: str
    generated_at: datetime
    download_url: str


@router.post("/reports/generate", response_model=ReportResponse)
async def generate_report(
    request: GenerateReportRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Generate a financial report"""
    try:
        # Get session data
        session = copilot_agent.get_session(request.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Create analysis summary
        analysis_data = report_generator.create_analysis_summary(
            {"session_id": request.session_id},
            session.contexts
        )
        
        # Add session insights
        if session.messages:
            key_insights = []
            for msg in session.messages:
                if msg['role'] == 'assistant':
                    # Extract key points from assistant messages
                    content = msg['content']
                    if "**" in content:  # Look for highlighted sections
                        lines = content.split('\n')
                        for line in lines:
                            if line.strip().startswith('-') and '**' not in line:
                                key_insights.append(line.strip()[2:])
            analysis_data['key_insights'] = key_insights[:10]  # Top 10 insights
        
        # Add custom sections based on context data
        for context in session.contexts:
            widget_type = context.widget_type.value
            
            # Add financial metrics
            if widget_type in ['income_statement', 'balance_sheet', 'key_metrics']:
                if isinstance(context.data, list) and len(context.data) >= 2:
                    current = context.data[0]
                    previous = context.data[1]
                    
                    for key in current:
                        if isinstance(current[key], (int, float)) and key != 'date':
                            if key not in analysis_data['financial_metrics']:
                                analysis_data['financial_metrics'][key] = {
                                    'current': current[key],
                                    'previous': previous.get(key, 0)
                                }
            
            # Add valuation data
            if widget_type == 'valuation_multiples' and isinstance(context.data, dict):
                if 'valuation' not in analysis_data:
                    analysis_data['valuation'] = {'multiples': {}}
                
                for metric, value in context.data.items():
                    if isinstance(value, (int, float)):
                        analysis_data['valuation']['multiples'][metric] = {
                            'company': value,
                            'peer_mean': value * 1.1,  # Placeholder
                            'premium_discount': -9.1  # Placeholder
                        }
        
        # Generate report
        if request.report_type == "pdf":
            filename = await background_tasks.add_task(
                report_generator.generate_pdf_report,
                analysis_data
            )
            # For immediate generation (not background)
            filename = report_generator.generate_pdf_report(analysis_data)
        else:
            filename = await background_tasks.add_task(
                report_generator.generate_excel_report,
                analysis_data
            )
            # For immediate generation (not background)
            filename = report_generator.generate_excel_report(analysis_data)
        
        if not filename:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate {request.report_type.upper()} report"
            )
        
        # Create response
        report_id = f"report_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        return ReportResponse(
            report_id=report_id,
            filename=filename,
            generated_at=datetime.now(),
            download_url=f"/api/v1/reports/download/{report_id}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/download/{report_id}")
async def download_report(report_id: str):
    """Download a generated report"""
    # In a real implementation, you would map report_id to actual filename
    # For now, we'll look for recent reports
    
    # Check for PDF files
    pdf_files = [f for f in os.listdir('.') if f.startswith('financial_report_') and f.endswith('.pdf')]
    excel_files = [f for f in os.listdir('.') if f.startswith('financial_report_') and f.endswith('.xlsx')]
    
    all_files = pdf_files + excel_files
    if not all_files:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Get most recent file
    all_files.sort(reverse=True)
    filename = all_files[0]
    
    if not os.path.exists(filename):
        raise HTTPException(status_code=404, detail="Report file not found")
    
    # Determine media type
    media_type = "application/pdf" if filename.endswith('.pdf') else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    
    return FileResponse(
        path=filename,
        media_type=media_type,
        filename=filename
    )


@router.post("/reports/quick-summary")
async def generate_quick_summary(session_id: str = Body(..., embed=True)):
    """Generate a quick summary of the session"""
    try:
        session = copilot_agent.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Extract key metrics
        summary = {
            "session_id": session_id,
            "created_at": session.created_at.isoformat(),
            "tickers_analyzed": list(set(ctx.ticker for ctx in session.contexts)),
            "data_sources": list(set(ctx.widget_type.value for ctx in session.contexts)),
            "key_metrics": {},
            "insights": []
        }
        
        # Extract key metrics from contexts
        for context in session.contexts:
            if context.widget_type.value == 'key_metrics' and isinstance(context.data, dict):
                for metric, value in context.data.items():
                    if isinstance(value, (int, float)):
                        summary['key_metrics'][f"{context.ticker}_{metric}"] = value
        
        # Extract insights from chat
        for msg in session.messages[-10:]:  # Last 10 messages
            if msg['role'] == 'assistant':
                # Extract first paragraph as insight
                lines = msg['content'].split('\n')
                if lines and lines[0]:
                    summary['insights'].append(lines[0][:200])  # First 200 chars
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/templates")
async def get_report_templates():
    """Get available report templates"""
    return {
        "templates": [
            {
                "id": "comprehensive",
                "name": "Comprehensive Financial Analysis",
                "description": "Full analysis including financials, valuation, and risk assessment",
                "sections": ["summary", "company_info", "financial_metrics", "valuation", "risk_analysis", "charts"]
            },
            {
                "id": "valuation_focus",
                "name": "Valuation Report",
                "description": "Focused on valuation metrics and peer comparison",
                "sections": ["summary", "company_info", "valuation", "charts"]
            },
            {
                "id": "risk_assessment",
                "name": "Risk Assessment Report",
                "description": "Detailed risk analysis and financial health metrics",
                "sections": ["summary", "company_info", "financial_metrics", "risk_analysis"]
            },
            {
                "id": "executive_summary",
                "name": "Executive Summary",
                "description": "High-level overview for executives",
                "sections": ["summary", "key_metrics", "insights"]
            }
        ]
    }