"""
Simple Mock Copilot Agent for testing without dependencies
"""

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

class WidgetContext:
    def __init__(self, widget_id: str, widget_type: str, ticker: str, title: str, data: dict):
        self.widget_id = widget_id
        self.widget_type = widget_type
        self.ticker = ticker
        self.title = title
        self.data = data
        self.timestamp = datetime.now()

class ChatSession:
    def __init__(self):
        self.session_id = str(uuid.uuid4())
        self.created_at = datetime.now()
        self.messages = []
        self.contexts = []
        self.active_ticker = None

class SimpleMockAgent:
    def __init__(self):
        self.sessions = {}
    
    def create_session(self, initial_ticker: str = None) -> ChatSession:
        session = ChatSession()
        if initial_ticker:
            session.active_ticker = initial_ticker
        self.sessions[session.session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        return self.sessions.get(session_id)
    
    def add_context(self, session_id: str, widget_context: WidgetContext) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Update or add context
        existing = [c for c in session.contexts if c.widget_id == widget_context.widget_id]
        if existing:
            # Update existing
            idx = session.contexts.index(existing[0])
            session.contexts[idx] = widget_context
        else:
            session.contexts.append(widget_context)
        return True
    
    def remove_context(self, session_id: str, widget_id: str) -> bool:
        session = self.get_session(session_id)
        if not session:
            return False
        session.contexts = [c for c in session.contexts if c.widget_id != widget_id]
        return True
    
    def _save_session(self, session: ChatSession) -> None:
        """Save session to storage"""
        self.sessions[session.session_id] = session
    
    async def chat(self, session_id: str, message: str) -> str:
        session = self.get_session(session_id)
        if not session:
            return "Session not found. Please start a new chat."
        
        # Add user message
        session.messages.append({"role": "user", "content": message})
        
        # Generate intelligent mock response
        response = self._generate_response(session, message)
        
        # Add assistant message
        session.messages.append({"role": "assistant", "content": response})
        
        return response
    
    def _generate_response(self, session: ChatSession, message: str) -> str:
        message_lower = message.lower()
        
        # Get context info
        tickers = list(set(ctx.ticker for ctx in session.contexts))
        widget_types = [ctx.widget_type for ctx in session.contexts]
        
        if not session.contexts:
            return "I don't have any data to analyze yet. Please add some widgets using the '+' button on any widget to provide me with context about the companies you'd like to analyze."
        
        # Build context-aware response
        response_parts = []
        
        # Analyze based on available widgets
        for ctx in session.contexts:
            if "revenue" in message_lower and ctx.widget_type in ["financial_statements", "revenue_geography", "revenue_segment"]:
                if isinstance(ctx.data, dict):
                    if "revenue" in ctx.data:
                        response_parts.append(f"Looking at {ctx.ticker}'s revenue data from the {ctx.title}...")
                    if "transformedData" in ctx.data:
                        response_parts.append(f"The financial statements show detailed revenue information.")
            
            elif "employee" in message_lower and ctx.widget_type == "company_profile":
                if isinstance(ctx.data, dict) and "employees" in ctx.data:
                    response_parts.append(f"{ctx.ticker} has {ctx.data['employees']:,} employees according to the company profile.")
            
            elif "profit" in message_lower or "margin" in message_lower:
                if ctx.widget_type == "financial_statements" and isinstance(ctx.data, dict):
                    response_parts.append(f"I can analyze {ctx.ticker}'s profitability from the financial statements.")
            
            elif "valuation" in message_lower or "pe" in message_lower or "ratio" in message_lower:
                if ctx.widget_type in ["key_metrics", "valuation_multiples"]:
                    response_parts.append(f"I have valuation metrics for {ctx.ticker} available.")
        
        if response_parts:
            response = "\n\n".join(response_parts)
        else:
            # Generic response based on available data
            response = f"I have data from {len(session.contexts)} widgets for {', '.join(tickers)}. "
            response += "I can analyze financial statements, company profiles, valuations, and more. What would you like to know?"
        
        response += "\n\n*Note: This is a demo response. Connect an OpenAI API key for full AI analysis.*"
        
        return response
    
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        session = self.get_session(session_id)
        if not session:
            return {"error": "Session not found"}
        
        return {
            "session_id": session.session_id,
            "created_at": session.created_at.isoformat(),
            "message_count": len(session.messages),
            "context_count": len(session.contexts),
            "active_ticker": session.active_ticker,
            "tickers": list(set(ctx.ticker for ctx in session.contexts)),
            "widget_types": [ctx.widget_type for ctx in session.contexts]
        }