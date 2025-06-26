"""
Simple OpenAI Agent for OpenBB Copilot
Direct implementation using OpenAI API without complex dependencies
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from enum import Enum
from openai import OpenAI
import redis
import pickle

# Import from mock agent to ensure compatibility
from .mock_copilot_simple import WidgetContext, ChatSession

class SimpleOpenAIAgent:
    """Simple OpenAI-based agent for financial analysis"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            self.client = None
        
        # Redis for session storage
        try:
            self.redis_client = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=0,
                decode_responses=False
            )
            self.redis_client.ping()
        except:
            print("Redis not available, using in-memory storage")
            self.redis_client = None
            self.sessions = {}
    
    def _build_system_prompt(self, contexts: List[WidgetContext]) -> str:
        """Build system prompt with widget contexts"""
        system_prompt = """You are an AI assistant for OpenBB Terminal, a professional financial analysis platform. 
You can help with financial analysis, market insights, and general questions.

Guidelines:
- Be friendly and conversational for greetings and casual chat
- When asked about stocks or financial topics, provide helpful insights based on your knowledge
- If specific widget data is available in the context, reference it to provide data-driven analysis
- If no widget data is available but the user asks about financial topics, provide general insights and suggest they can add widget data for more detailed analysis
- Don't force financial topics into casual conversation

You have general knowledge about markets, stocks, and financial analysis that you can share even without specific widget data.
"""
        
        if contexts:
            system_prompt += "\nAvailable widget data:\n"
        
        # Group contexts by ticker for better organization
        ticker_contexts = {}
        for ctx in contexts:
            if ctx.ticker not in ticker_contexts:
                ticker_contexts[ctx.ticker] = []
            ticker_contexts[ctx.ticker].append(ctx)
        
        # Add organized context data
        for ticker, ticker_ctxs in ticker_contexts.items():
            system_prompt += f"\n\n## {ticker} Data:\n"
            for ctx in ticker_ctxs:
                system_prompt += f"\n### {ctx.title}:\n"
                # Format data based on widget type
                if ctx.widget_type == "key_metrics" and isinstance(ctx.data, dict):
                    for key, value in ctx.data.items():
                        system_prompt += f"- {key}: {value}\n"
                else:
                    system_prompt += json.dumps(ctx.data, indent=2)
        
        return system_prompt
    
    def create_session(self, initial_ticker: str = None) -> ChatSession:
        """Create a new chat session"""
        session = ChatSession()
        if initial_ticker:
            session.active_ticker = initial_ticker
        self._save_session(session)
        return session
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get session by ID"""
        if self.redis_client:
            try:
                data = self.redis_client.get(f"session:{session_id}")
                if data:
                    session_data = pickle.loads(data)
                    return ChatSession(**session_data)
            except Exception as e:
                print(f"Error loading session: {e}")
        else:
            return self.sessions.get(session_id)
        return None
    
    def _save_session(self, session: ChatSession):
        """Save session to storage"""
        if self.redis_client:
            try:
                self.redis_client.setex(
                    f"session:{session.session_id}",
                    86400,  # 24 hour TTL
                    pickle.dumps(session.dict())
                )
            except Exception as e:
                print(f"Error saving session: {e}")
        else:
            self.sessions[session.session_id] = session
    
    def add_context(self, session_id: str, widget_context: WidgetContext) -> bool:
        """Add widget context to session"""
        session = self.get_session(session_id)
        if not session:
            return False
        
        # Validate context data
        if not widget_context.data:
            print(f"Warning: Empty data for widget {widget_context.widget_id}")
            return False
        
        # Log context details for debugging
        print(f"Adding context: {widget_context.widget_type} - {widget_context.ticker}")
        print(f"Data keys: {list(widget_context.data.keys()) if isinstance(widget_context.data, dict) else 'Not a dict'}")
        
        # Update or add context
        existing_index = None
        for i, ctx in enumerate(session.contexts):
            if ctx.widget_id == widget_context.widget_id:
                existing_index = i
                break
        
        if existing_index is not None:
            # Update existing context
            session.contexts[existing_index] = widget_context
            print(f"Updated context for {widget_context.title}")
        else:
            # Add new context
            session.contexts.append(widget_context)
            print(f"Added new context: {widget_context.title}")
        
        # Limit total contexts to prevent token overflow
        if len(session.contexts) > 20:
            # Remove oldest contexts
            session.contexts = session.contexts[-20:]
            print("Context limit reached, removed oldest contexts")
        
        self._save_session(session)
        return True
    
    def remove_context(self, session_id: str, widget_id: str) -> bool:
        """Remove widget context from session"""
        session = self.get_session(session_id)
        if not session:
            return False
        
        session.contexts = [ctx for ctx in session.contexts if ctx.widget_id != widget_id]
        self._save_session(session)
        return True
    
    async def chat(self, session_id: str, message: str, model: str = "gpt-3.5-turbo") -> str:
        """Process chat message using OpenAI"""
        session = self.get_session(session_id)
        if not session:
            return "Session not found. Please start a new chat."
        
        # Add user message to history
        session.messages.append({"role": "user", "content": message})
        
        # Ensure client is available
        if not self.client:
            return "OpenAI client not initialized. Please check API key configuration."
        
        try:
            # Build messages for OpenAI
            messages = [
                {"role": "system", "content": self._build_system_prompt(session.contexts)}
            ]
            
            # Add conversation history with context awareness
            # Include more history if we have fewer contexts, less if we have many
            context_data_size = len(json.dumps([ctx.data for ctx in session.contexts]))
            if context_data_size > 10000:  # Large context
                history_limit = 6
            elif context_data_size > 5000:  # Medium context
                history_limit = 10
            else:  # Small context
                history_limit = 20
            
            # Add conversation history (excluding the last message we just added)
            for msg in session.messages[-history_limit:-1]:
                messages.append(msg)
            
            # Add the current user message
            messages.append({"role": "user", "content": message})
            
            # Map model names to actual OpenAI models
            model_mapping = {
                "O4-mini-high": "gpt-4",  # Using GPT-4 as placeholder for Omega Copilot
                "o3-mini": "gpt-3.5-turbo",
                "o4": "gpt-4",
                "gpt-4-turbo": "gpt-4-turbo-preview",
                "gpt-4": "gpt-4",
                "gpt-3.5-turbo": "gpt-3.5-turbo"
            }
            
            actual_model = model_mapping.get(model, model)
            
            # Call OpenAI API (new syntax)
            response = self.client.chat.completions.create(
                model=actual_model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            assistant_message = response.choices[0].message.content
            
        except Exception as e:
            assistant_message = f"I encountered an error processing your request: {str(e)}. Please try again."
        
        # Add assistant response to history
        session.messages.append({"role": "assistant", "content": assistant_message})
        self._save_session(session)
        
        return assistant_message
    
    async def _mock_chat_response(self, session: ChatSession, message: str) -> str:
        """Generate intelligent mock response when no API key"""
        response = "I'm analyzing your question"
        
        # Check for specific analysis requests
        message_lower = message.lower()
        
        if session.contexts:
            response = f"Based on the {len(session.contexts)} widgets you've added, "
            
            # Analyze available data types
            widget_types = [ctx.widget_type for ctx in session.contexts]
            tickers = list(set(ctx.ticker for ctx in session.contexts))
            
            if "financial_statements" in widget_types:
                response += "I can see the financial statements data. "
                for ctx in session.contexts:
                    if ctx.widget_type == "financial_statements":
                        data = ctx.data
                        if isinstance(data, dict) and 'transformedData' in data:
                            response += f"The latest revenue figures show significant trends. "
                            break
            
            if "key_metrics" in widget_types:
                response += "I have access to key metrics including valuation ratios. "
            
            if "company_news" in widget_types:
                response += "I can see recent news that might impact the stock. "
            
            response += f"\n\nYou're analyzing: {', '.join(tickers)}"
            
            # Respond to specific questions
            if "revenue" in message_lower:
                response += "\n\nRegarding revenue: Based on the financial data available, I would need to analyze the revenue trends across the periods shown in your widgets."
            elif "profit" in message_lower or "margin" in message_lower:
                response += "\n\nFor profitability analysis: The financial statements widget shows gross profit, operating income, and net income trends."
            elif "compare" in message_lower:
                response += "\n\nFor comparison: I can analyze the metrics across different time periods or against industry benchmarks."
            elif "valuation" in message_lower:
                response += "\n\nFor valuation: Key metrics like P/E ratio, EV/EBITDA, and other multiples are available in your widgets."
        else:
            response = "I don't have any widget data to analyze yet. Please click the '+' button on any widget to add its data to our conversation context."
        
        response += "\n\n*Note: This is a demo response. Connect an OpenAI API key for full AI-powered analysis.*"
        
        return response
    
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Get session summary"""
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