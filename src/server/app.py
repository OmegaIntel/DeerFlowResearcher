# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import base64
import json
import logging
import os
import re
from datetime import datetime, timedelta
from typing import List, cast
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from langchain_core.messages import AIMessageChunk, ToolMessage
from langgraph.types import Command

from src.graph.builder import build_graph_with_memory
from src.chat.graph.builder import build_chat_graph_with_memory
from src.podcast.graph.builder import build_graph as build_podcast_graph
from src.ppt.graph.builder import build_graph as build_ppt_graph
from src.prose.graph.builder import build_graph as build_prose_graph
from src.server.chat_request import (
    ChatMessage,
    ChatRequest,
    GeneratePodcastRequest,
    GeneratePPTRequest,
    GenerateProseRequest,
    TTSRequest,
)
from src.server.mcp_request import MCPServerMetadataRequest, MCPServerMetadataResponse
from src.server.mcp_utils import load_mcp_tools
from src.tools import VolcengineTTS
from src.db.db_session import (
    create_db_tables,
    SessionLocal,
    get_or_create_chat_session,
    add_chat_message,
)
from langchain_core.runnables.history import RunnableWithMessageHistory

# Routes from API folders
from src.api.api_register_user import router as register_user_router
from src.api.api_generate_token import user_generate_token_router
from src.api.api_get_current_user import current_user_router
from src.api.api_verify_user import verify_user_router

logger = logging.getLogger(__name__)

app = FastAPI(
    title="DeerFlow API",
    description="API for Deer",
    version="0.1.0",
)

app.include_router(register_user_router)
app.include_router(user_generate_token_router)
app.include_router(current_user_router)
app.include_router(verify_user_router)
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

graph = build_graph_with_memory()
chat_chains: dict[str, RunnableWithMessageHistory] = {}

create_db_tables()


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())
    return StreamingResponse(
        _astream_workflow_generator(
            request.model_dump()["messages"],
            thread_id,
            request.max_plan_iterations,
            request.max_step_num,
            request.auto_accepted_plan,
            request.interrupt_feedback,
            request.mcp_settings,
            request.enable_background_investigation,
        ),
        media_type="text/event-stream",
    )


@app.post("/api/chat/simple")
async def chat_simple(request: ChatRequest):
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())

    db = SessionLocal()
    session_obj = get_or_create_chat_session(db, thread_id)

    chain = chat_chains.get(thread_id)
    if chain is None:
        chain = build_chat_graph_with_memory()
        chat_chains[thread_id] = chain

    user_message = request.messages[-1].content if request.messages else ""
    # Persist the user message
    add_chat_message(db, session_obj, "user", str(user_message))

    def iter_response():
        try:
            # RunnableWithMessageHistory.invoke expects config with session_id
            config = {"configurable": {"session_id": thread_id}}
            result = chain.invoke({"input": user_message}, config=config)
            
            # The new API returns AIMessage content directly
            if hasattr(result, 'content'):
                response_text = result.content
            else:
                response_text = str(result)

            add_chat_message(db, session_obj, "assistant", str(response_text))
            data = {
                "thread_id": thread_id,
                "id": str(uuid4()),
                "role": "assistant",
                "content": response_text,
                "finish_reason": "stop",
            }
            yield f"event: message_chunk\ndata: {json.dumps(data)}\n\n"
        finally:
            db.close()

    return StreamingResponse(iter_response(), media_type="text/event-stream")


@app.post("/api/chat/tool")
async def chat_tool(request: ChatRequest):
    """Handle single tool queries with @ mention."""
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())

    # Extract tool information from request
    tool_id = request.tool_id
    tool_type = request.tool_type
    
    if not tool_id or not tool_type:
        raise HTTPException(status_code=400, detail="Missing tool_id or tool_type")

    user_message = request.messages[-1].content if request.messages else ""

    async def iter_response():
        try:
            if tool_type == "mcp":
                # Handle MCP tool query
                async for event in _handle_mcp_tool_query(user_message, tool_id, thread_id, request.mcp_settings or {}):
                    yield event
            elif tool_type == "agent":
                if tool_id == "research":
                    # Handle research agent query
                    for event in _handle_research_query(user_message, thread_id, request):
                        yield event
                else:
                    raise HTTPException(status_code=400, detail=f"Unknown agent: {tool_id}")
            else:
                raise HTTPException(status_code=400, detail=f"Unknown tool type: {tool_type}")
        except Exception as e:
            logger.exception(f"Error in tool query: {str(e)}")
            error_data = {
                "thread_id": thread_id,
                "id": str(uuid4()),
                "role": "assistant", 
                "content": f"Error executing tool: {str(e)}",
                "finish_reason": "error",
            }
            yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"

    return StreamingResponse(iter_response(), media_type="text/event-stream")


async def _handle_mcp_tool_query(user_message: str, tool_id: str, thread_id: str, mcp_settings: dict):
    """Handle MCP tool query."""
    from langchain_mcp_adapters.client import MultiServerMCPClient
    from langchain_core.messages import HumanMessage
    from src.llms.llm import get_llm_by_type
    from src.config.agents import AGENT_LLM_MAP
    
    # Parse tool_id to get server and tool name
    server_id, tool_name = tool_id.split('.', 1)
    
    try:
        # Debug: Log the MCP settings structure
        logger.info(f"MCP settings received: {mcp_settings}")
        logger.info(f"MCP settings type: {type(mcp_settings)}")
        
        # Get server configuration for the specific server
        if not mcp_settings or "servers" not in mcp_settings:
            logger.error(f"No MCP servers configured. Settings: {mcp_settings}")
            raise ValueError(f"No MCP servers configured. Available settings: {mcp_settings}")
        
        servers = mcp_settings["servers"]
        
        # Debug: Log the available servers and the requested server_id
        logger.info(f"Available servers: {list(servers.keys()) if servers else 'None'}")
        logger.info(f"Requested server_id: '{server_id}' (type: {type(server_id)})")
        
        # Try to find the server with flexible matching
        server_config = None
        if server_id in servers:
            server_config = servers[server_id]
        else:
            # Try converting to int if it's a numeric string
            try:
                numeric_id = int(server_id)
                if numeric_id in servers:
                    server_config = servers[numeric_id]
            except ValueError:
                pass
            
            # Try converting to string if the keys are strings
            if server_config is None:
                str_id = str(server_id)
                if str_id in servers:
                    server_config = servers[str_id]
        
        if server_config is None:
            available_servers = ", ".join(str(k) for k in servers.keys())
            raise ValueError(f"Server '{server_id}' not found in configuration. Available servers: {available_servers}")
        
        # Create MCP client for the specific server
        mcp_servers = {
            server_id: {
                k: v for k, v in server_config.items()
                if k in ("transport", "command", "args", "url", "env")
            }
        }
        
        tool_result = None
        async with MultiServerMCPClient(mcp_servers) as client:
            # Find the specific tool
            target_tool = None
            for tool in client.get_tools():
                if tool.name == tool_name:
                    target_tool = tool
                    break
            
            if not target_tool:
                raise ValueError(f"Tool '{tool_name}' not found in server '{server_id}'")
            
            # Execute the tool with user message as input
            # For stock tools, we need to extract parameters from the user message
            tool_input = {}
            
            # Get tool schema to understand expected parameters
            if hasattr(target_tool, 'args_schema') and target_tool.args_schema:
                schema = target_tool.args_schema.schema() if hasattr(target_tool.args_schema, 'schema') else {}
                properties = schema.get('properties', {})
                
                # For getStockHistory, parse parameters from user message
                if tool_name == "getStockHistory":
                    # Extract stock symbol (look for capital letters that could be tickers)
                    symbols = re.findall(r'\b[A-Z]{1,5}\b', user_message.upper())
                    if symbols:
                        tool_input['symbol'] = symbols[0]
                    
                    # For Yahoo Finance, use different parameter structure
                    # Let's check what parameters the tool expects by looking at the schema
                    logger.info(f"Tool schema properties: {properties}")
                    
                    # Extract date range instead of period for Yahoo Finance
                    
                    # Calculate date range based on user request
                    end_date = datetime.now()
                    if 'week' in user_message.lower():
                        start_date = end_date - timedelta(days=7)
                    elif 'month' in user_message.lower():
                        start_date = end_date - timedelta(days=30)
                    elif 'year' in user_message.lower():
                        start_date = end_date - timedelta(days=365)
                    else:
                        start_date = end_date - timedelta(days=7)  # default to 1 week
                    
                    # Format dates as strings
                    tool_input['start'] = start_date.strftime('%Y-%m-%d')
                    tool_input['end'] = end_date.strftime('%Y-%m-%d')
                    
                    # Extract interval - Yahoo Finance typically uses '1d', '1h', etc.
                    if 'hourly' in user_message.lower() or 'hour' in user_message.lower():
                        tool_input['interval'] = '1h'
                    elif 'minute' in user_message.lower():
                        tool_input['interval'] = '5m'
                    else:
                        tool_input['interval'] = '1d'  # default to daily
                    
                    logger.info(f"Extracted parameters for getStockHistory: {tool_input}")
                
                # For other tools, try to map user message to expected parameters
                else:
                    # Try common parameter patterns
                    for param_name, _ in properties.items():
                        if param_name in ['symbol', 'ticker']:
                            # Extract stock symbols
                            symbols = re.findall(r'\b[A-Z]{1,5}\b', user_message.upper())
                            if symbols:
                                tool_input[param_name] = symbols[0]
                        elif param_name in ['query', 'question', 'text', 'input', 'prompt']:
                            tool_input[param_name] = user_message
                        elif param_name == 'period':
                            if 'week' in user_message.lower():
                                tool_input[param_name] = '1w'
                            elif 'month' in user_message.lower():
                                tool_input[param_name] = '1mo'
                            elif 'year' in user_message.lower():
                                tool_input[param_name] = '1y'
                        elif param_name == 'interval':
                            if 'daily' in user_message.lower():
                                tool_input[param_name] = '1d'
                            elif 'hourly' in user_message.lower():
                                tool_input[param_name] = '1h'
            
            # Initialize tool_result
            tool_result = None
            
            # If no specific parameters extracted, try to build parameters from schema
            if not tool_input:
                # Check if the tool has required parameters in its schema
                if hasattr(target_tool, 'args_schema') and target_tool.args_schema:
                    schema = target_tool.args_schema.schema() if hasattr(target_tool.args_schema, 'schema') else {}
                    properties = schema.get('properties', {})
                    required_params = schema.get('required', [])
                    
                    logger.info(f"Tool '{tool_name}' schema - properties: {properties}")
                    logger.info(f"Tool '{tool_name}' schema - required: {required_params}")
                    
                    # If the schema is empty, try common parameter patterns
                    if not properties:
                        logger.info(f"Tool '{tool_name}' has empty schema, trying common parameter patterns")
                        # Try common parameter names that might work
                        common_params = []
                        
                        # Generic MCP tool orchestration using reasoning LLM
                        logger.info(f"Starting generic MCP orchestration for tool '{tool_name}'")
                        try:
                            tool_result = await _generic_mcp_orchestration(target_tool, tool_name, user_message, server_id)
                        except Exception as e:
                            logger.error(f"Generic MCP orchestration failed: {e}")
                            tool_result = None
                        
                        # If generic MCP orchestration didn't run or failed, try standard parameter patterns
                        if tool_result is None:
                            # Add standard parameter patterns as fallback
                            common_params.extend([
                                {"query": user_message},
                                {"text": user_message},
                                {"input": user_message},
                                {"search": user_message},
                                {"q": user_message},
                                {"data": user_message},
                                {"prompt": user_message},
                                {"question": user_message},
                                {"message": user_message},
                                {"request": user_message},
                                {"term": user_message},
                                {"keywords": user_message},
                                # Try with just the user message as a string (for tools that accept string directly)
                                user_message,
                                {},  # Try with no parameters
                            ])
                            
                            last_error = None
                            for params in common_params:
                                try:
                                    logger.info(f"Trying tool '{tool_name}' with params: {params}")
                                    tool_result = await target_tool.ainvoke(params)
                                    logger.info(f"Success! Tool '{tool_name}' returned: {tool_result}")
                                    break
                                except Exception as e:
                                    logger.info(f"Failed with params {params}: {type(e).__name__}: {e}")
                                    last_error = e
                                    continue
                            
                            if tool_result is None:
                                # If all attempts failed, raise an error
                                error_msg = f"Tool '{tool_name}' has empty schema and none of the common parameter patterns worked."
                                if last_error:
                                    error_msg += f" Last error: {last_error}"
                                raise ValueError(error_msg)
                    
                    # Try to extract parameters based on the schema if we have properties
                    elif properties:
                        for param_name, param_info in properties.items():
                            param_type = param_info.get('type', 'string')
                            param_description = param_info.get('description', '').lower()
                            
                            # Common query-like parameters
                            if param_name.lower() in ['query', 'question', 'text', 'input', 'prompt', 'search', 'q', 'search_query', 'keyword', 'keywords']:
                                tool_input[param_name] = user_message
                            elif param_name.lower() in ['symbol', 'ticker'] and param_type == 'string':
                                # Extract stock symbols
                                symbols = re.findall(r'\b[A-Z]{1,5}\b', user_message.upper())
                                if symbols:
                                    tool_input[param_name] = symbols[0]
                            elif any(word in param_name.lower() for word in ['search', 'query', 'keyword', 'term']):
                                tool_input[param_name] = user_message
                            elif any(word in param_description for word in ['search', 'query', 'keyword', 'term', 'text', 'input']):
                                tool_input[param_name] = user_message
                            elif param_type == 'string' and len(tool_input) == 0:
                                # If it's a string parameter and we haven't set anything yet, try the user message
                                tool_input[param_name] = user_message
                            
                            # Handle specific parameter types
                            elif param_type == 'integer' and param_name.lower() in ['limit', 'count', 'max', 'size']:
                                # Extract numbers from user message for limits
                                numbers = re.findall(r'\d+', user_message)
                                if numbers:
                                    tool_input[param_name] = int(numbers[0])
                                else:
                                    tool_input[param_name] = 10  # default limit
                            elif param_type == 'boolean' and param_name.lower() in ['detailed', 'verbose', 'full']:
                                # Check for boolean-like words
                                if any(word in user_message.lower() for word in ['detailed', 'full', 'complete', 'verbose']):
                                    tool_input[param_name] = True
                                else:
                                    tool_input[param_name] = False
                    
                    # If we still don't have required parameters, try to use user message for the first required param
                    if not tool_input and required_params:
                        first_required = required_params[0]
                        if first_required in properties:
                            param_info = properties[first_required]
                            if param_info.get('type') == 'string':
                                tool_input[first_required] = user_message
                
                # Try with common parameter names if we still don't have any
                if not tool_input:
                    for param_name in ["query", "symbol", "input", "text", "prompt", "question", "search", "keyword"]:
                        try:
                            tool_result = await target_tool.ainvoke({param_name: user_message})
                            break
                        except Exception as e:
                            logger.debug(f"Failed to call tool with {param_name}: {e}")
                            continue
                    else:
                        # Final fallback - if the tool doesn't accept string inputs, we need structured input
                        error_msg = f"Could not determine how to call tool '{tool_name}'. "
                        if hasattr(target_tool, 'args_schema') and target_tool.args_schema:
                            schema = target_tool.args_schema.schema() if hasattr(target_tool.args_schema, 'schema') else {}
                            properties = schema.get('properties', {})
                            required_params = schema.get('required', [])
                            error_msg += f"Tool expects parameters: {list(properties.keys())}. Required: {required_params}"
                        raise ValueError(error_msg)
            
            # Execute with extracted parameters if we don't already have a result
            if tool_result is None:
                try:
                    logger.info(f"Calling tool '{tool_name}' with parameters: {tool_input}")
                    tool_result = await target_tool.ainvoke(tool_input)
                    logger.info(f"Tool '{tool_name}' returned: {tool_result}")
                except Exception as e:
                    logger.error(f"Error calling tool '{tool_name}' with parameters {tool_input}: {e}")
                    # Try with just the symbol if the complex parameters fail and we have a symbol
                    if 'symbol' in tool_input:
                        try:
                            logger.info(f"Retrying with just symbol: {tool_input['symbol']}")
                            tool_result = await target_tool.ainvoke({'symbol': tool_input['symbol']})
                        except Exception as e2:
                            logger.error(f"Retry with symbol also failed: {e2}")
                            raise e
                    else:
                        raise e
        
        # Use LLM to process and format the tool result
        llm = get_llm_by_type(AGENT_LLM_MAP.get("coordinator", "gpt-4o-mini"))
        
        system_prompt = f"""You are an AI assistant helping to interpret results from the MCP tool '{tool_name}'.

The user asked: {user_message}

The tool returned the following result:
{tool_result}

Please provide a clear, helpful response that:
1. Interprets the tool's output in the context of the user's question
2. If the result contains an error, explain what might have gone wrong and suggest alternatives
3. Highlights the most relevant information if data was returned successfully
4. Provides additional context or explanation if helpful
5. Formats the information in a readable way (use tables for stock data if appropriate)

Be concise but thorough in your response. If there was an error retrieving the data, acknowledge it and provide helpful guidance."""

        messages = [HumanMessage(content=system_prompt)]
        response = await llm.ainvoke(messages)
        
        # Stream the LLM response
        response_content = response.content if hasattr(response, 'content') else str(response)
        
        data = {
            "thread_id": thread_id,
            "id": str(uuid4()),
            "role": "assistant",
            "content": response_content,
            "finish_reason": "stop",
        }
        yield f"event: message_chunk\ndata: {json.dumps(data)}\n\n"
        
    except Exception as e:
        logger.exception(f"Error executing MCP tool '{tool_name}': {str(e)}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid4()),
            "role": "assistant",
            "content": f"Error executing MCP tool '{tool_name}': {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


async def _generic_mcp_orchestration(target_tool, tool_name: str, user_message: str, server_id: str):
    """Generic MCP tool orchestration using Claude Desktop's systematic approach for progressive discovery."""
    from src.llms.llm import get_llm_by_type
    from src.config.agents import AGENT_LLM_MAP
    from langchain_core.messages import HumanMessage, SystemMessage
    
    logger.info(f"Starting Claude Desktop-style MCP orchestration for '{tool_name}'")
    
    # Use a reasoning LLM to orchestrate the tool calls
    reasoning_llm = get_llm_by_type(AGENT_LLM_MAP.get("coordinator", "gpt-4o-mini"))
    
    max_iterations = 6  # Allow more iterations for discovery process
    iteration = 0
    discovery_log = []  # Track the discovery process
    
    # Get tool schema information if available
    tool_schema_info = ""
    if hasattr(target_tool, 'args_schema') and target_tool.args_schema:
        try:
            schema = target_tool.args_schema.schema() if hasattr(target_tool.args_schema, 'schema') else {}
            properties = schema.get('properties', {})
            if properties:
                tool_schema_info = f"\n\nTool Schema Available:\n{json.dumps(properties, indent=2)}"
        except:
            pass
    
    # System prompt based on Claude Desktop's approach
    system_prompt = f"""You are an MCP tool orchestrator that follows Claude Desktop's systematic approach for progressive data discovery.

**Tool Information:**
- Tool name: {tool_name}
- Server: {server_id}
- User query: {user_message}{tool_schema_info}

**Claude Desktop's Systematic Process:**

1. **Query Understanding & Planning**
   - Analyze the user's question for: data type, location, time frame, specific metrics
   - Identify what kind of information is needed

2. **Progressive Discovery Strategy** (Discovery First → Access Second):
   - **Step 1: Broad Discovery** - Start with catalog/discovery calls to find available datasets
   - **Step 2: Refinement** - If initial search fails, broaden or narrow search terms
   - **Step 3: Dataset Selection** - Analyze discovered datasets to pick the most relevant
   - **Step 4: Targeted Query** - Make specific data access calls with proper filters

3. **MCP Function Pattern Recognition**:
   - Look for "type" parameter with values like: "catalog", "data-access", "dataset-metadata"
   - Start with discovery types (catalog) before access types (data-access)
   - Use appropriate filters (where, select, limit) for data queries
   - OpenGov pattern: catalog → datasetId extraction → data-access with filters

4. **Query Construction Patterns**:
   - Time filters: Use ISO datetime format (YYYY-MM-DDTHH:MM:SS)
   - Aggregation: Use SQL-like functions (count(*), sum, avg)
   - Filtering: Use SQL WHERE clause syntax
   - Parameter naming: Use camelCase (datasetId, not dataset_id)

**Your Current Task:** Determine the next logical step in the discovery process.

Respond with JSON:
{{
    "step_type": "discovery" | "refinement" | "access" | "done",
    "reasoning": "Why this step makes sense in the discovery process",
    "parameters": {{"key": "value"}},
    "expected_outcome": "What you expect this call to reveal",
    "next_steps": "What you'll do based on the result"
}}

**Step Types:**
- "discovery": Find available datasets/capabilities (use catalog, categories, etc.)
- "refinement": Modify search strategy based on previous results  
- "access": Query specific dataset with proper filters
- "done": Have sufficient data to answer the user's question

**Common Parameter Examples:**
- Discovery: {{"type": "catalog", "query": "search terms"}}
- Metadata: {{"type": "dataset-metadata", "datasetId": "abc-123"}}
- Data Access: {{"type": "data-access", "datasetId": "abc-123", "select": "count(*)", "where": "date_column >= '2025-06-01T00:00:00'"}}

**IMPORTANT**: When you see errors like "datasetId is required" but you passed dataset_id, the parameter naming is wrong. Always use camelCase for parameter names.
"""

    while iteration < max_iterations:
        iteration += 1
        logger.info(f"MCP Discovery Step {iteration}")
        
        # Prepare context with discovery history
        context_messages = [SystemMessage(content=system_prompt)]
        
        if discovery_log:
            history_text = "\n\n**Discovery Progress So Far:**\n"
            for i, entry in enumerate(discovery_log, 1):
                history_text += f"\nStep {i} ({entry['step_type']}):\n"
                history_text += f"Parameters: {entry['parameters']}\n"
                history_text += f"Result: {str(entry['result'])[:300]}{'...' if len(str(entry['result'])) > 300 else ''}\n"
                history_text += f"Analysis: {entry.get('analysis', 'N/A')}\n"
            context_messages.append(HumanMessage(content=history_text))
        
        context_messages.append(HumanMessage(content="What is the next step in the discovery process?"))
        
        try:
            # Get next step from reasoning LLM
            reasoning_response = await reasoning_llm.ainvoke(context_messages)
            reasoning_content = reasoning_response.content
            logger.info(f"Reasoning response: {reasoning_content}")
            
            # Parse the reasoning response
            import json
            from src.utils.json_utils import repair_json_output
            
            try:
                step_data = json.loads(repair_json_output(reasoning_content))
            except json.JSONDecodeError:
                logger.warning(f"Could not parse reasoning response, using fallback")
                # Fallback based on iteration
                if iteration == 1:
                    step_data = {
                        "step_type": "discovery",
                        "parameters": {"type": "catalog", "query": _extract_key_terms(user_message)},
                        "reasoning": "Starting with catalog discovery"
                    }
                else:
                    break
            
            step_type = step_data.get("step_type", "discovery")
            parameters = step_data.get("parameters", {})
            reasoning_text = step_data.get("reasoning", "")
            
            logger.info(f"Step {iteration}: {step_type}")
            logger.info(f"Parameters: {parameters}")
            logger.info(f"Reasoning: {reasoning_text}")
            
            if step_type == "done":
                # Find the best result from our discovery
                if discovery_log:
                    # Look for the most recent successful data access result
                    for entry in reversed(discovery_log):
                        if entry['step_type'] == 'access' and not str(entry['result']).startswith("ERROR"):
                            return entry['result']
                    # If no access results, return the best discovery result
                    for entry in reversed(discovery_log):
                        if not str(entry['result']).startswith("ERROR"):
                            return entry['result']
                return "No data found through discovery process"
            
            # Execute the tool call
            try:
                # Fix parameter naming issues (snake_case to camelCase for common MCP patterns)
                fixed_parameters = _fix_parameter_naming(parameters)
                logger.info(f"Executing: {tool_name}({fixed_parameters})")
                result = await target_tool.ainvoke(fixed_parameters)
                logger.info(f"✅ Success: {str(result)[:100]}...")
                
                # Analyze the result
                analysis = _analyze_discovery_result(result, step_type, user_message)
                
                discovery_log.append({
                    "step_type": step_type,
                    "parameters": fixed_parameters,
                    "result": result,
                    "analysis": analysis,
                    "reasoning": reasoning_text
                })
                
                # If this was a successful data access call, we might be done
                if step_type == "access" and result and not str(result).startswith("ERROR"):
                    # Check if result contains actual data
                    if _has_meaningful_data(result):
                        return result
                
            except Exception as e:
                error_msg = str(e)
                logger.info(f"❌ Failed: {error_msg}")
                
                discovery_log.append({
                    "step_type": step_type,
                    "parameters": parameters,
                    "result": f"ERROR: {error_msg}",
                    "analysis": f"Call failed: {error_msg}",
                    "reasoning": reasoning_text
                })
                
        except Exception as e:
            logger.error(f"Error in orchestration step: {e}")
            break
    
    # Return best result found during discovery
    if discovery_log:
        for entry in reversed(discovery_log):
            if not str(entry['result']).startswith("ERROR") and _has_meaningful_data(entry['result']):
                return entry['result']
    
    raise ValueError(f"Could not discover how to use tool '{tool_name}' effectively after {max_iterations} attempts")


def _fix_parameter_naming(parameters: dict) -> dict:
    """Fix common parameter naming issues (snake_case to camelCase) for MCP tools."""
    if not isinstance(parameters, dict):
        return parameters
    
    fixed_params = {}
    for key, value in parameters.items():
        # Common parameter name mappings
        if key == "dataset_id":
            fixed_params["datasetId"] = value
        elif key == "resource_id":
            fixed_params["resourceId"] = value
        elif key == "user_id":
            fixed_params["userId"] = value
        elif key == "api_key":
            fixed_params["apiKey"] = value
        elif key == "max_results":
            fixed_params["maxResults"] = value
        elif key == "page_size":
            fixed_params["pageSize"] = value
        elif key == "start_date":
            fixed_params["startDate"] = value
        elif key == "end_date":
            fixed_params["endDate"] = value
        else:
            # Keep original key if no mapping found
            fixed_params[key] = value
    
    return fixed_params


def _extract_key_terms(user_message: str) -> str:
    """Extract key search terms from user message for initial discovery."""
    message_lower = user_message.lower()
    
    # Extract meaningful terms, removing common stop words
    words = message_lower.split()
    stop_words = {'how', 'many', 'what', 'where', 'when', 'why', 'who', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'}
    key_words = [w for w in words if w not in stop_words and len(w) > 2]
    
    # Return first few key words
    return ' '.join(key_words[:3])


def _analyze_discovery_result(result, step_type: str, user_message: str) -> str:
    """Analyze discovery results to guide next steps."""
    result_str = str(result)
    
    if step_type == "discovery":
        if "no results" in result_str.lower() or result_str == "[]" or not result:
            return "No datasets found - need to broaden search terms"
        elif isinstance(result, list) and len(result) > 0:
            return f"Found {len(result)} datasets - need to select most relevant and get details"
        else:
            return "Found dataset information - analyze for relevance"
    
    elif step_type == "access":
        if "count" in result_str.lower():
            return "Successfully retrieved count data - query complete"
        elif isinstance(result, list) and len(result) > 0:
            return "Successfully retrieved data records"
        else:
            return "Data access attempt made - check if meaningful data returned"
    
    return "Result obtained - analyze for next steps"


def _has_meaningful_data(result) -> bool:
    """Check if result contains meaningful data that could answer the user's query."""
    if not result:
        return False
    
    result_str = str(result)
    
    # Check for error indicators
    if result_str.startswith("ERROR") or "error" in result_str.lower():
        return False
    
    # Check for empty results
    if result_str in ["[]", "{}", "null", "None"]:
        return False
    
    # Check for meaningful data patterns
    if any(indicator in result_str.lower() for indicator in ["count", "total", "records", "data"]):
        return True
    
    # Check if it's a non-empty list or dict
    if isinstance(result, (list, dict)) and len(result) > 0:
        return True
    
    return len(result_str.strip()) > 10  # Has some substantial content


def _handle_research_query(user_message: str, thread_id: str, _request: ChatRequest):
    """Handle research agent query - single research, not deep research."""
    # For now, return a simple response indicating research functionality
    data = {
        "thread_id": thread_id,
        "id": str(uuid4()),
        "role": "assistant",
        "content": f"Single research query for: {user_message}\n\nThis would perform a focused research task without the full deep research planning flow.",
        "finish_reason": "stop",
    }
    yield f"event: message_chunk\ndata: {json.dumps(data)}\n\n"


async def _astream_workflow_generator(
    messages: List[ChatMessage],
    thread_id: str,
    max_plan_iterations: int,
    max_step_num: int,
    auto_accepted_plan: bool,
    interrupt_feedback: str,
    mcp_settings: dict,
    enable_background_investigation,
):
    input_ = {
        "messages": messages,
        "plan_iterations": 0,
        "final_report": "",
        "current_plan": None,
        "observations": [],
        "auto_accepted_plan": auto_accepted_plan,
        "enable_background_investigation": enable_background_investigation,
    }
    if not auto_accepted_plan and interrupt_feedback:
        resume_msg = f"[{interrupt_feedback}]"
        # add the last message to the resume message
        if messages:
            resume_msg += f" {messages[-1]['content']}"
        input_ = Command(resume=resume_msg)
    async for agent, _, event_data in graph.astream(
        input_,
        config={
            "thread_id": thread_id,
            "max_plan_iterations": max_plan_iterations,
            "max_step_num": max_step_num,
            "mcp_settings": mcp_settings,
        },
        stream_mode=["messages", "updates"],
        subgraphs=True,
    ):
        if isinstance(event_data, dict):
            if "__interrupt__" in event_data:
                yield _make_event(
                    "interrupt",
                    {
                        "thread_id": thread_id,
                        "id": event_data["__interrupt__"][0].ns[0],
                        "role": "assistant",
                        "content": event_data["__interrupt__"][0].value,
                        "finish_reason": "interrupt",
                        "options": [
                            {"text": "Edit plan", "value": "edit_plan"},
                            {"text": "Start research", "value": "accepted"},
                        ],
                    },
                )
            continue
        message_chunk, _ = cast(
            tuple[AIMessageChunk, dict[str, any]], event_data
        )
        event_stream_message: dict[str, any] = {
            "thread_id": thread_id,
            "agent": agent[0].split(":")[0],
            "id": message_chunk.id,
            "role": "assistant",
            "content": message_chunk.content,
        }
        if message_chunk.response_metadata.get("finish_reason"):
            event_stream_message["finish_reason"] = message_chunk.response_metadata.get(
                "finish_reason"
            )
        if isinstance(message_chunk, ToolMessage):
            # Tool Message - Return the result of the tool call
            event_stream_message["tool_call_id"] = message_chunk.tool_call_id
            yield _make_event("tool_call_result", event_stream_message)
        else:
            # AI Message - Raw message tokens
            if message_chunk.tool_calls:
                # AI Message - Tool Call
                event_stream_message["tool_calls"] = message_chunk.tool_calls
                event_stream_message["tool_call_chunks"] = (
                    message_chunk.tool_call_chunks
                )
                yield _make_event("tool_calls", event_stream_message)
            elif message_chunk.tool_call_chunks:
                # AI Message - Tool Call Chunks
                event_stream_message["tool_call_chunks"] = (
                    message_chunk.tool_call_chunks
                )
                yield _make_event("tool_call_chunks", event_stream_message)
            else:
                # AI Message - Raw message tokens
                yield _make_event("message_chunk", event_stream_message)


def _make_event(event_type: str, data: dict[str, any]):
    if data.get("content") == "":
        data.pop("content")
    return f"event: {event_type}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/tts")
async def text_to_speech(request: TTSRequest):
    """Convert text to speech using volcengine TTS API."""
    try:
        app_id = os.getenv("VOLCENGINE_TTS_APPID", "")
        if not app_id:
            raise HTTPException(
                status_code=400, detail="VOLCENGINE_TTS_APPID is not set"
            )
        access_token = os.getenv("VOLCENGINE_TTS_ACCESS_TOKEN", "")
        if not access_token:
            raise HTTPException(
                status_code=400, detail="VOLCENGINE_TTS_ACCESS_TOKEN is not set"
            )
        cluster = os.getenv("VOLCENGINE_TTS_CLUSTER", "volcano_tts")
        voice_type = os.getenv("VOLCENGINE_TTS_VOICE_TYPE", "BV700_V2_streaming")

        tts_client = VolcengineTTS(
            appid=app_id,
            access_token=access_token,
            cluster=cluster,
            voice_type=voice_type,
        )
        # Call the TTS API
        result = tts_client.text_to_speech(
            text=request.text[:1024],
            encoding=request.encoding,
            speed_ratio=request.speed_ratio,
            volume_ratio=request.volume_ratio,
            pitch_ratio=request.pitch_ratio,
            text_type=request.text_type,
            with_frontend=request.with_frontend,
            frontend_type=request.frontend_type,
        )

        if not result["success"]:
            raise HTTPException(status_code=500, detail=str(result["error"]))

        # Decode the base64 audio data
        audio_data = base64.b64decode(result["audio_data"])

        # Return the audio file
        return Response(
            content=audio_data,
            media_type=f"audio/{request.encoding}",
            headers={
                "Content-Disposition": (
                    f"attachment; filename=tts_output.{request.encoding}"
                )
            },
        )
    except Exception as e:
        logger.exception(f"Error in TTS endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/podcast/generate")
async def generate_podcast(request: GeneratePodcastRequest):
    try:
        report_content = request.content
        print(report_content)
        workflow = build_podcast_graph()
        final_state = workflow.invoke({"input": report_content})
        audio_bytes = final_state["output"]
        return Response(content=audio_bytes, media_type="audio/mp3")
    except Exception as e:
        logger.exception(f"Error occurred during podcast generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ppt/generate")
async def generate_ppt(request: GeneratePPTRequest):
    try:
        report_content = request.content
        print(report_content)
        workflow = build_ppt_graph()
        final_state = workflow.invoke({"input": report_content})
        generated_file_path = final_state["generated_file_path"]
        with open(generated_file_path, "rb") as f:
            ppt_bytes = f.read()
        return Response(
            content=ppt_bytes,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        logger.exception(f"Error occurred during ppt generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/prose/generate")
async def generate_prose(request: GenerateProseRequest):
    try:
        logger.info(f"Generating prose for prompt: {request.prompt}")
        workflow = build_prose_graph()
        events = workflow.astream(
            {
                "content": request.prompt,
                "option": request.option,
                "command": request.command,
            },
            stream_mode="messages",
            subgraphs=True,
        )
        return StreamingResponse(
            (f"data: {event[0].content}\n\n" async for _, event in events),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(f"Error occurred during prose generation: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/mcp/server/metadata", response_model=MCPServerMetadataResponse)
async def mcp_server_metadata(request: MCPServerMetadataRequest):
    """Get information about an MCP server."""
    try:
        # Set default timeout with a longer value for this endpoint
        timeout = 300  # Default to 300 seconds for this endpoint

        # Use custom timeout from request if provided
        if request.timeout_seconds is not None:
            timeout = request.timeout_seconds

        # Load tools from the MCP server using the utility function
        tools = await load_mcp_tools(
            server_type=request.transport,
            command=request.command,
            args=request.args,
            url=request.url,
            env=request.env,
            timeout_seconds=timeout,
        )

        # Create the response with tools
        response = MCPServerMetadataResponse(
            transport=request.transport,
            command=request.command,
            args=request.args,
            url=request.url,
            env=request.env,
            tools=tools,
        )

        return response
    except Exception as e:
        if not isinstance(e, HTTPException):
            logger.exception(f"Error in MCP server metadata endpoint: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        raise
