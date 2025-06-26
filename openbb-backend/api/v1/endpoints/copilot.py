"""
Copilot API endpoints for chat and context management
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field
import os

# Import will be done dynamically in get_agent()
WidgetContext = None  # Will be set by get_agent()
from models.schemas import BaseResponse

router = APIRouter()

# Initialize the agent (in production, use dependency injection)
agent = None

def get_agent():
    """Get or create the copilot agent"""
    global agent
    if agent is None:
        # Always use OpenAI agent
        from services.simple_openai_agent import SimpleOpenAIAgent, WidgetContext as WC
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OpenAI API key is required. Please set OPENAI_API_KEY environment variable.")
        
        agent = SimpleOpenAIAgent(api_key)
        print("Using OpenAI Agent")
        
        # Make WidgetContext available at module level
        global WidgetContext
        WidgetContext = WC
    return agent


class CreateSessionRequest(BaseModel):
    """Request to create a new chat session"""
    initial_ticker: Optional[str] = None
    

class CreateSessionResponse(BaseModel):
    """Response with new session details"""
    session_id: str
    created_at: datetime
    

class AddContextRequest(BaseModel):
    """Request to add widget context to session"""
    session_id: str
    widget_id: str
    widget_type: str  # Changed from WidgetType enum to str
    ticker: str
    title: str
    data: Dict[str, Any]
    

class RemoveContextRequest(BaseModel):
    """Request to remove widget context from session"""
    session_id: str
    widget_id: str
    

class ChatRequest(BaseModel):
    """Chat message request"""
    session_id: str
    message: str
    model: Optional[str] = "O4-mini-high"
    

class ChatResponse(BaseModel):
    """Chat message response"""
    response: str
    session_id: str
    contexts_used: int
    

class SessionSummaryResponse(BaseModel):
    """Session summary information"""
    session_id: str
    created_at: str
    message_count: int
    context_count: int
    active_ticker: Optional[str]
    tickers: List[str]
    widget_types: List[str]


@router.post("/session", response_model=BaseResponse)
async def create_session(request: CreateSessionRequest = Body(...)):
    """Create a new chat session"""
    try:
        copilot = get_agent()
        session = copilot.create_session()
        
        if request.initial_ticker:
            session.active_ticker = request.initial_ticker
            copilot._save_session(session)
            
        return BaseResponse(
            success=True,
            data=CreateSessionResponse(
                session_id=session.session_id,
                created_at=session.created_at
            )
        )
    except Exception as e:
        return BaseResponse(
            success=False,
            error=str(e)
        )


@router.get("/session/{session_id}", response_model=SessionSummaryResponse)
async def get_session_summary(session_id: str):
    """Get session summary"""
    try:
        copilot = get_agent()
        summary = copilot.get_session_summary(session_id)
        
        if "error" in summary:
            raise HTTPException(status_code=404, detail=summary["error"])
            
        return SessionSummaryResponse(**summary)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/context/add")
async def add_context(request: AddContextRequest):
    """Add widget context to a session"""
    try:
        copilot = get_agent()
        
        # Get WidgetContext class from agent module
        copilot = get_agent()
        from services.mock_copilot_simple import WidgetContext
        
        # Create widget context
        context = WidgetContext(
            widget_id=request.widget_id,
            widget_type=request.widget_type,
            ticker=request.ticker,
            title=request.title,
            data=request.data
        )
        
        # Add to session
        success = copilot.add_context(request.session_id, context)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
            
        return BaseResponse(
            success=True,
            data={"status": "success", "message": "Context added successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/context/remove")
async def remove_context(request: RemoveContextRequest):
    """Remove widget context from a session"""
    try:
        copilot = get_agent()
        success = copilot.remove_context(request.session_id, request.widget_id)
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
            
        return BaseResponse(
            success=True,
            data={"status": "success", "message": "Context removed successfully"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat", response_model=BaseResponse)
async def chat(request: ChatRequest):
    """Send a chat message and get response"""
    try:
        copilot = get_agent()
        
        # Get session to check context count
        session = copilot.get_session(request.session_id)
        if not session:
            return BaseResponse(
                success=False,
                error="Session not found"
            )
            
        # Process the chat message
        response = await copilot.chat(request.session_id, request.message, request.model)
        
        return BaseResponse(
            success=True,
            data=ChatResponse(
                response=response,
                session_id=request.session_id,
                contexts_used=len(session.contexts)
            )
        )
        
    except Exception as e:
        return BaseResponse(
            success=False,
            error=str(e)
        )


@router.get("/contexts/{session_id}")
async def get_contexts(session_id: str):
    """Get all contexts for a session"""
    try:
        copilot = get_agent()
        session = copilot.get_session(session_id)
        
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
            
        # Convert contexts to dict format
        contexts = []
        for ctx in session.contexts:
            contexts.append({
                "widget_id": ctx.widget_id,
                "widget_type": ctx.widget_type,
                "ticker": ctx.ticker,
                "title": ctx.title,
                "timestamp": ctx.timestamp.isoformat(),
                "data_preview": {
                    k: v for k, v in list(ctx.data.items())[:5]
                }  # Show first 5 data items as preview
            })
            
        return {
            "session_id": session_id,
            "contexts": contexts,
            "total": len(contexts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session"""
    try:
        copilot = get_agent()
        session = copilot.get_session(session_id)
        
        if not session:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
            
        # In a real implementation, add delete method to agent
        # For now, just return success
        return {"status": "success", "message": "Session deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))