"""
OpenBB Copilot Agent with LangChain and LangGraph
Handles financial data analysis with context from dashboard widgets
"""

import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum

from langchain_openai import ChatOpenAI
from langchain.memory import ConversationSummaryBufferMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.chains import LLMChain
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from langchain.tools import Tool
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from pydantic import BaseModel, Field
import redis
import pickle

# Import settings
from config.settings import settings

# Load from .env.copilot if it exists
if os.path.exists('.env.copilot'):
    from dotenv import load_dotenv
    load_dotenv('.env.copilot')

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY") or settings.OPENAI_API_KEY
OPENAI_MODEL = os.getenv("OPENAI_MODEL") or settings.OPENAI_MODEL
TEMPERATURE = float(os.getenv("TEMPERATURE", settings.COPILOT_TEMPERATURE))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", settings.COPILOT_MAX_TOKENS))

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))


class WidgetType(str, Enum):
    """Types of widgets that can provide context"""
    COMPANY_PROFILE = "company_profile"
    FINANCIAL_STATEMENTS = "financial_statements"
    INCOME_STATEMENT = "income_statement"
    BALANCE_SHEET = "balance_sheet"
    CASH_FLOW = "cash_flow"
    KEY_METRICS = "key_metrics"
    VALUATION_MULTIPLES = "valuation_multiples"
    PRICE_CHART = "price_chart"
    REVENUE_ANALYSIS = "revenue_analysis"
    OPTIONS_FLOW = "options_flow"
    INSIDER_TRADING = "insider_trading"
    INSTITUTIONAL_OWNERSHIP = "institutional_ownership"
    NEWS = "news"
    COMPANY_NEWS = "company_news"
    MANAGEMENT_TEAM = "management_team"
    PRICE_PERFORMANCE = "price_performance"
    REVENUE_CHARTS = "revenue_charts"
    REVENUE_GEOGRAPHY = "revenue_geography"
    REVENUE_SEGMENT = "revenue_segment"
    SHARE_STATISTICS = "share_statistics"
    TICKER_INFO = "ticker_info"
    COMPANY_FILINGS = "company_filings"
    EARNINGS_TRANSCRIPTS = "earnings_transcripts"
    MARKET_OVERVIEW = "market_overview"
    PRICE_TARGET = "price_target"
    CUSTOM = "custom"


class WidgetContext(BaseModel):
    """Context data from a dashboard widget"""
    widget_id: str
    widget_type: WidgetType
    ticker: str
    title: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.now)
    

class ChatSession(BaseModel):
    """Chat session with context management"""
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)
    contexts: List[WidgetContext] = Field(default_factory=list)
    messages: List[Dict[str, str]] = Field(default_factory=list)
    active_ticker: Optional[str] = None
    

class AgentState(BaseModel):
    """State for the LangGraph agent"""
    session_id: str
    messages: List[BaseMessage]
    contexts: List[WidgetContext]
    current_step: str = "analyze"
    analysis_result: Optional[str] = None
    

class FinancialAnalysisTool:
    """Tool for analyzing financial data from widget contexts"""
    
    def __init__(self):
        self.name = "analyze_financial_data"
        self.description = "Analyze financial data from dashboard widgets"
        
    def run(self, contexts: List[WidgetContext], query: str) -> str:
        """Analyze the provided contexts based on the query"""
        if not contexts:
            return "No financial data context available. Please add data from dashboard widgets using the + button."
            
        # Group contexts by type and ticker
        ticker_data = {}
        for ctx in contexts:
            if ctx.ticker not in ticker_data:
                ticker_data[ctx.ticker] = {}
            ticker_data[ctx.ticker][ctx.widget_type.value] = ctx.data
            
        # Create analysis summary
        analysis = []
        for ticker, data_types in ticker_data.items():
            analysis.append(f"\n**Analysis for {ticker}:**")
            
            # Analyze different data types
            if WidgetType.FINANCIAL_STATEMENTS.value in data_types or \
               WidgetType.INCOME_STATEMENT.value in data_types:
                income_data = data_types.get(WidgetType.INCOME_STATEMENT.value, 
                                           data_types.get(WidgetType.FINANCIAL_STATEMENTS.value, {}))
                if income_data:
                    analysis.append(self._analyze_income_statement(income_data))
                    
            if WidgetType.BALANCE_SHEET.value in data_types:
                analysis.append(self._analyze_balance_sheet(data_types[WidgetType.BALANCE_SHEET.value]))
                
            if WidgetType.KEY_METRICS.value in data_types:
                analysis.append(self._analyze_key_metrics(data_types[WidgetType.KEY_METRICS.value]))
                
            if WidgetType.VALUATION_MULTIPLES.value in data_types:
                analysis.append(self._analyze_valuation(data_types[WidgetType.VALUATION_MULTIPLES.value]))
                
        return "\n".join(analysis)
        
    def _analyze_income_statement(self, data: Dict) -> str:
        """Analyze income statement data"""
        analysis = ["\n*Income Statement Analysis:*"]
        
        # Extract key metrics if available
        if "revenue" in data:
            analysis.append(f"- Revenue: ${data['revenue']:,.0f}")
        if "gross_profit" in data:
            analysis.append(f"- Gross Profit: ${data['gross_profit']:,.0f}")
        if "operating_income" in data:
            analysis.append(f"- Operating Income: ${data['operating_income']:,.0f}")
        if "net_income" in data:
            analysis.append(f"- Net Income: ${data['net_income']:,.0f}")
            
        # Calculate margins if possible
        if "revenue" in data and data["revenue"] > 0:
            if "gross_profit" in data:
                gross_margin = (data["gross_profit"] / data["revenue"]) * 100
                analysis.append(f"- Gross Margin: {gross_margin:.1f}%")
            if "net_income" in data:
                net_margin = (data["net_income"] / data["revenue"]) * 100
                analysis.append(f"- Net Margin: {net_margin:.1f}%")
                
        return "\n".join(analysis)
        
    def _analyze_balance_sheet(self, data: Dict) -> str:
        """Analyze balance sheet data"""
        analysis = ["\n*Balance Sheet Analysis:*"]
        
        if "total_assets" in data:
            analysis.append(f"- Total Assets: ${data['total_assets']:,.0f}")
        if "total_liabilities" in data:
            analysis.append(f"- Total Liabilities: ${data['total_liabilities']:,.0f}")
        if "total_equity" in data:
            analysis.append(f"- Total Equity: ${data['total_equity']:,.0f}")
            
        # Calculate ratios
        if "total_liabilities" in data and "total_equity" in data and data["total_equity"] > 0:
            debt_to_equity = data["total_liabilities"] / data["total_equity"]
            analysis.append(f"- Debt-to-Equity Ratio: {debt_to_equity:.2f}")
            
        return "\n".join(analysis)
        
    def _analyze_key_metrics(self, data: Dict) -> str:
        """Analyze key metrics data"""
        analysis = ["\n*Key Metrics:*"]
        
        for key, value in data.items():
            if isinstance(value, (int, float)):
                analysis.append(f"- {key.replace('_', ' ').title()}: {value:.2f}")
            else:
                analysis.append(f"- {key.replace('_', ' ').title()}: {value}")
                
        return "\n".join(analysis)
        
    def _analyze_valuation(self, data: Dict) -> str:
        """Analyze valuation multiples"""
        analysis = ["\n*Valuation Analysis:*"]
        
        if "pe_ratio" in data:
            analysis.append(f"- P/E Ratio: {data['pe_ratio']:.2f}")
        if "price_to_book" in data:
            analysis.append(f"- Price-to-Book: {data['price_to_book']:.2f}")
        if "ev_to_ebitda" in data:
            analysis.append(f"- EV/EBITDA: {data['ev_to_ebitda']:.2f}")
            
        return "\n".join(analysis)


class OpenBBCopilotAgent:
    """Main agent class for OpenBB Copilot"""
    
    def __init__(self, openai_api_key: str = None):
        self.api_key = openai_api_key or OPENAI_API_KEY
        if not self.api_key:
            raise ValueError("OpenAI API key is required")
            
        # Initialize LLM
        self.llm = ChatOpenAI(
            temperature=TEMPERATURE,
            model=OPENAI_MODEL,
            api_key=self.api_key,
            max_tokens=MAX_TOKENS
        )
        
        # Initialize Redis for session storage
        try:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=False
            )
            self.redis_client.ping()
        except:
            print("Warning: Redis not available, using in-memory storage")
            self.redis_client = None
            self.sessions = {}
            
        # Initialize tools
        self.financial_tool = FinancialAnalysisTool()
        
        # Import advanced analysis tools
        from .financial_analysis_tools import (
            FinancialMetrics,
            TechnicalAnalysisTool,
            ComparativeAnalysisTool,
            RiskAnalysisTool,
            ScenarioAnalysisTool
        )
        
        # Import quantitative models
        # from .quantitative_models import (
        #     MonteCarloSimulation,
        #     OptionsGreeks,
        #     MLPricePrediction
        # )
        
        self.financial_metrics = FinancialMetrics()
        self.technical_analysis = TechnicalAnalysisTool()
        self.comparative_analysis = ComparativeAnalysisTool()
        self.risk_analysis = RiskAnalysisTool()
        self.scenario_analysis = ScenarioAnalysisTool()
        
        # Initialize quantitative models
        # self.monte_carlo = MonteCarloSimulation()
        # self.options_greeks = OptionsGreeks()
        # self.ml_predictor = MLPricePrediction()
        
        # Create the agent graph
        self.graph = self._create_agent_graph()
        
    def _create_agent_graph(self):
        """Create the LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Define nodes
        workflow.add_node("analyze", self._analyze_node)
        workflow.add_node("synthesize", self._synthesize_node)
        workflow.add_node("respond", self._respond_node)
        
        # Define edges
        workflow.add_edge("analyze", "synthesize")
        workflow.add_edge("synthesize", "respond")
        workflow.add_edge("respond", END)
        
        # Set entry point
        workflow.set_entry_point("analyze")
        
        return workflow.compile()
        
    def _analyze_node(self, state: AgentState) -> AgentState:
        """Analyze the financial data based on user query"""
        # Get the latest user message
        user_message = None
        for msg in reversed(state.messages):
            if isinstance(msg, HumanMessage):
                user_message = msg.content.lower()
                break
                
        if not user_message:
            state.analysis_result = "No user query found"
            return state
            
        # Basic financial analysis
        analysis_parts = [self.financial_tool.run(state.contexts, user_message)]
        
        # Determine which advanced analyses to perform based on query
        if any(word in user_message for word in ['growth', 'cagr', 'trend', 'revenue growth']):
            # Perform growth analysis
            for context in state.contexts:
                if context.widget_type in [WidgetType.INCOME_STATEMENT, WidgetType.FINANCIAL_STATEMENTS]:
                    growth_analysis = self.financial_metrics.calculate_growth_rates(
                        context.data if isinstance(context.data, list) else [context.data],
                        'revenue'
                    )
                    analysis_parts.append(f"\n**Revenue Growth Analysis for {context.ticker}:**")
                    if 'error' not in growth_analysis:
                        if growth_analysis.get('cagr'):
                            analysis_parts.append(f"- CAGR: {growth_analysis['cagr']:.2f}%")
                        if growth_analysis.get('latest_growth'):
                            analysis_parts.append(f"- Latest YoY Growth: {growth_analysis['latest_growth']:.2f}%")
                        if growth_analysis.get('growth_trend'):
                            analysis_parts.append(f"- Growth Trend: {growth_analysis['growth_trend']}")
                            
        if any(word in user_message for word in ['profitability', 'margin', 'roe', 'roa', 'dupont']):
            # Perform profitability analysis
            income_contexts = [c for c in state.contexts if c.widget_type == WidgetType.INCOME_STATEMENT]
            balance_contexts = [c for c in state.contexts if c.widget_type == WidgetType.BALANCE_SHEET]
            
            if income_contexts and balance_contexts:
                for ticker in set(c.ticker for c in state.contexts):
                    income_data = next((c.data for c in income_contexts if c.ticker == ticker), None)
                    balance_data = next((c.data for c in balance_contexts if c.ticker == ticker), None)
                    
                    if income_data and balance_data:
                        prof_metrics = self.financial_metrics.calculate_profitability_metrics(
                            income_data if isinstance(income_data, list) else [income_data],
                            balance_data if isinstance(balance_data, list) else [balance_data]
                        )
                        if 'error' not in prof_metrics:
                            analysis_parts.append(f"\n**Profitability Analysis for {ticker}:**")
                            analysis_parts.append(f"- Net Profit Margin: {prof_metrics.get('net_profit_margin', 0):.2f}%")
                            analysis_parts.append(f"- ROA: {prof_metrics.get('roa', 0):.2f}%")
                            analysis_parts.append(f"- ROE: {prof_metrics.get('roe', 0):.2f}%")
                            if 'dupont_roe' in prof_metrics:
                                analysis_parts.append(f"- DuPont ROE: {prof_metrics['dupont_roe']:.2f}%")
                                
        if any(word in user_message for word in ['compare', 'comparison', 'versus', 'vs', 'benchmark']):
            # Perform comparative analysis
            if len(set(c.ticker for c in state.contexts)) > 1:
                metric_type = 'valuation' if 'valuation' in user_message else 'profitability'
                comparison = self.comparative_analysis.compare_companies(state.contexts, metric_type)
                
                if comparison:
                    analysis_parts.append(f"\n**Comparative Analysis ({metric_type.title()}):**")
                    for ticker, metrics in comparison.items():
                        analysis_parts.append(f"\n{ticker}:")
                        for metric, value in metrics.items():
                            analysis_parts.append(f"  - {metric.replace('_', ' ').title()}: {value:.2f}")
                            
        if any(word in user_message for word in ['risk', 'volatility', 'leverage', 'debt']):
            # Perform risk analysis
            for context in state.contexts:
                if context.widget_type == WidgetType.BALANCE_SHEET:
                    risk_metrics = self.risk_analysis.calculate_risk_metrics([], context.data[0] if isinstance(context.data, list) else context.data)
                    if risk_metrics and 'error' not in risk_metrics:
                        analysis_parts.append(f"\n**Risk Analysis for {context.ticker}:**")
                        analysis_parts.append(f"- Debt-to-Equity: {risk_metrics.get('debt_to_equity', 0):.2f}")
                        analysis_parts.append(f"- Current Ratio: {risk_metrics.get('current_ratio', 0):.2f}")
                        if 'risk_level' in risk_metrics:
                            analysis_parts.append(f"- Overall Risk Level: {risk_metrics['risk_level']}")
                            
        # Monte Carlo simulation queries
        if any(word in user_message for word in ['monte carlo', 'simulation', 'var', 'value at risk', 'price forecast']):
            price_contexts = [c for c in state.contexts if c.widget_type == WidgetType.PRICE_CHART]
            if price_contexts:
                for context in price_contexts:
                    # Extract current price and volatility
                    current_price = context.data.get('current_price', 100)
                    volatility = context.data.get('volatility', 0.25)
                    drift = context.data.get('expected_return', 0.08)
                    
                    mc_results = self.monte_carlo.simulate_price_paths(
                        current_price=current_price,
                        volatility=volatility,
                        drift=drift,
                        time_horizon=252  # 1 year
                    )
                    
                    if 'error' not in mc_results:
                        analysis_parts.append(f"\n**Monte Carlo Simulation for {context.ticker}:**")
                        analysis_parts.append(f"- Current Price: ${mc_results['current_price']:.2f}")
                        analysis_parts.append(f"- Expected Price (1Y): ${mc_results['expected_price']:.2f}")
                        analysis_parts.append(f"- 95% VaR: ${mc_results['value_at_risk']['var_95']:.2f}")
                        analysis_parts.append(f"- Probability of Gain: {mc_results['probabilities']['above_current']*100:.1f}%")
                        
        # Options analysis queries
        if any(word in user_message for word in ['option', 'call', 'put', 'greeks', 'delta', 'gamma', 'theta']):
            options_contexts = [c for c in state.contexts if c.widget_type == WidgetType.OPTIONS_FLOW]
            if options_contexts:
                for context in options_contexts:
                    # Extract option parameters
                    option_data = context.data
                    if isinstance(option_data, dict):
                        greeks = self.options_greeks.black_scholes(
                            S=option_data.get('underlying_price', 100),
                            K=option_data.get('strike', 100),
                            T=option_data.get('days_to_expiry', 30) / 365,
                            r=0.05,  # Risk-free rate
                            sigma=option_data.get('implied_volatility', 0.25),
                            option_type=option_data.get('option_type', 'call')
                        )
                        
                        if 'error' not in greeks:
                            analysis_parts.append(f"\n**Options Analysis for {context.ticker}:**")
                            analysis_parts.append(f"- Option Price: ${greeks['price']:.2f}")
                            analysis_parts.append(f"- Delta: {greeks['delta']:.3f}")
                            analysis_parts.append(f"- Gamma: {greeks['gamma']:.3f}")
                            analysis_parts.append(f"- Theta: ${greeks['theta']:.2f}/day")
                            analysis_parts.append(f"- Implied Leverage: {greeks['leverage']:.1f}x")
                            
        # ML prediction queries
        if any(word in user_message for word in ['predict', 'forecast', 'machine learning', 'ml', 'future price']):
            price_contexts = [c for c in state.contexts if c.widget_type == WidgetType.PRICE_CHART]
            if price_contexts and hasattr(price_contexts[0].data, 'get'):
                # Note: This would require historical price data
                analysis_parts.append(f"\n**ML Price Prediction:**")
                analysis_parts.append("Note: ML predictions require historical price data. Please ensure price chart widget contains historical data.")
                            
        # Combine all analyses
        state.analysis_result = "\n".join(analysis_parts)
        state.current_step = "synthesize"
        return state
        
    def _synthesize_node(self, state: AgentState) -> AgentState:
        """Synthesize insights from the analysis"""
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are Omega Copilot, an expert financial analyst AI assistant.
            You help users understand financial data from their dashboard widgets.
            Provide clear, actionable insights based on the data provided.
            Use professional financial terminology but explain complex concepts clearly."""),
            MessagesPlaceholder(variable_name="messages"),
            HumanMessage(content=f"Based on this analysis, provide insights:\n{state.analysis_result}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        response = chain.invoke({"messages": state.messages})
        
        state.current_step = "respond"
        return state
        
    def _respond_node(self, state: AgentState) -> AgentState:
        """Generate the final response"""
        # Create comprehensive response
        prompt = ChatPromptTemplate.from_messages([
            SystemMessage(content="""You are Omega Copilot. Based on the financial analysis,
            provide a comprehensive response that:
            1. Directly answers the user's question
            2. Provides specific insights from the data
            3. Suggests actionable next steps or areas to investigate
            4. Maintains a professional but approachable tone"""),
            MessagesPlaceholder(variable_name="messages"),
            HumanMessage(content=f"Financial Analysis:\n{state.analysis_result}")
        ])
        
        chain = LLMChain(llm=self.llm, prompt=prompt)
        response = chain.invoke({"messages": state.messages})
        
        # Add AI response to messages
        state.messages.append(AIMessage(content=response["text"]))
        return state
        
    def create_session(self) -> ChatSession:
        """Create a new chat session"""
        session = ChatSession()
        self._save_session(session)
        return session
        
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Retrieve a session by ID"""
        if self.redis_client:
            try:
                data = self.redis_client.get(f"session:{session_id}")
                if data:
                    return ChatSession(**pickle.loads(data))
            except:
                pass
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
            except:
                pass
        else:
            self.sessions[session.session_id] = session
            
    def add_context(self, session_id: str, widget_context: WidgetContext) -> bool:
        """Add widget context to a session"""
        session = self.get_session(session_id)
        if not session:
            return False
            
        # Check if context already exists
        existing_ids = [ctx.widget_id for ctx in session.contexts]
        if widget_context.widget_id not in existing_ids:
            session.contexts.append(widget_context)
            self._save_session(session)
            
        return True
        
    def remove_context(self, session_id: str, widget_id: str) -> bool:
        """Remove widget context from a session"""
        session = self.get_session(session_id)
        if not session:
            return False
            
        session.contexts = [ctx for ctx in session.contexts if ctx.widget_id != widget_id]
        self._save_session(session)
        return True
        
    async def chat(self, session_id: str, message: str) -> str:
        """Process a chat message"""
        session = self.get_session(session_id)
        if not session:
            return "Session not found. Please start a new chat."
            
        # Convert session messages to LangChain format
        lc_messages = []
        for msg in session.messages:
            if msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            else:
                lc_messages.append(AIMessage(content=msg["content"]))
                
        # Add new user message
        lc_messages.append(HumanMessage(content=message))
        session.messages.append({"role": "user", "content": message})
        
        # Create agent state
        state = AgentState(
            session_id=session_id,
            messages=lc_messages,
            contexts=session.contexts
        )
        
        # Run the agent graph
        final_state = await self.graph.ainvoke(state)
        
        # Extract response
        response = final_state.messages[-1].content
        session.messages.append({"role": "assistant", "content": response})
        
        # Save updated session
        self._save_session(session)
        
        return response
        
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Get a summary of the session"""
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
            "widget_types": list(set(ctx.widget_type.value for ctx in session.contexts))
        }


class MockCopilotAgent:
    """Mock implementation of OpenBBCopilotAgent for testing without OpenAI API key"""
    
    def __init__(self):
        self.sessions = {}
        
    def create_session(self) -> ChatSession:
        """Create a new chat session"""
        session = ChatSession()
        self.sessions[session.session_id] = session
        return session
        
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Get session by ID"""
        return self.sessions.get(session_id)
        
    def _save_session(self, session: ChatSession) -> None:
        """Save session (in-memory for mock)"""
        self.sessions[session.session_id] = session
        
    def add_widget_context(self, session_id: str, context: WidgetContext) -> bool:
        """Add widget context to session"""
        session = self.get_session(session_id)
        if not session:
            return False
            
        # Check if context already exists
        existing_ids = {ctx.widget_id for ctx in session.contexts}
        if context.widget_id not in existing_ids:
            session.contexts.append(context)
            self._save_session(session)
        return True
        
    def remove_widget_context(self, session_id: str, widget_id: str) -> bool:
        """Remove widget context from session"""
        session = self.get_session(session_id)
        if not session:
            return False
            
        session.contexts = [ctx for ctx in session.contexts if ctx.widget_id != widget_id]
        self._save_session(session)
        return True
        
    async def chat(self, session_id: str, message: str) -> str:
        """Process chat message with mock response"""
        session = self.get_session(session_id)
        if not session:
            return "Session not found. Please start a new chat."
            
        # Add user message
        session.messages.append({"role": "user", "content": message})
        
        # Generate mock response
        response = f"Mock response: I understand you asked about \"{message}\". "
        if session.contexts:
            response += f"I have {len(session.contexts)} widget contexts available. "
            tickers = list(set(ctx.ticker for ctx in session.contexts))
            if tickers:
                response += f"The tickers being analyzed are: {', '.join(tickers)}. "
        response += "This is a mock response for testing purposes."
        
        # Add assistant message
        session.messages.append({"role": "assistant", "content": response})
        self._save_session(session)
        
        return response
        
    def get_session_summary(self, session_id: str) -> Dict[str, Any]:
        """Get a summary of the session"""
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
            "widget_types": list(set(ctx.widget_type.value for ctx in session.contexts))
        }

