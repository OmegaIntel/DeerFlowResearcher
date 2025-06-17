# Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
# SPDX-License-Identifier: MIT

import base64
import json
import logging
import os
import pprint
from typing import List, cast
# uuid module imported later

from fastapi import FastAPI, HTTPException, Request, UploadFile, File, Form
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
from src.config.mcp_servers import mcp_server_config
from src.server.llamacloud_upload import router as llamacloud_router
from src.server.pinecone_routes import router as pinecone_router
from src.server.chat_history_routes import router as chat_history_router
from src.server.documents_routes import router as documents_router, enhanced_document_processor
from src.server.fix_titles_route import router as fix_titles_router
from src.server.project_routes import router as project_router
from src.db.db_session import (
    create_db_tables,
    SessionLocal,
    get_or_create_chat_session,
    add_chat_message,
)
from src.db_models.chat_session import ChatSession
import uuid
from langchain_core.runnables.history import RunnableWithMessageHistory

# Routes from API folders
from src.api.api_register_user import router as register_user_router
from src.api.api_generate_token import user_generate_token_router
from src.api.api_get_current_user import current_user_router
from src.api.api_verify_user import verify_user_router
from src.api.api_debug_headers import router as debug_router
from src.server.auth_debug_middleware import log_auth_headers

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
app.include_router(debug_router)
app.include_router(llamacloud_router)
app.include_router(pinecone_router, prefix="/api/pinecone")
app.include_router(chat_history_router, prefix="/api/chat")
app.include_router(fix_titles_router, prefix="/api/chat")
app.include_router(documents_router, prefix="/api/documents")
app.include_router(project_router, prefix="/api")
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://ec2-54-91-85-225.compute-1.amazonaws.com:3000",
        "http://ec2-54-91-85-225.compute-1.amazonaws.com:3001",
        "http://54.91.85.225:3000",
        "http://54.91.85.225:3001",
        "*"  # Allow all origins temporarily for debugging
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Add auth debug middleware
app.middleware("http")(log_auth_headers)

graph = build_graph_with_memory()
chat_chains: dict[str, RunnableWithMessageHistory] = {}

create_db_tables()


@app.on_event("startup")
async def startup_event():
    """Load MCP servers from backend configuration on startup."""
    try:
        await mcp_server_config.load_tools_for_servers()
        logger.info(f"Loaded {len(mcp_server_config.servers)} MCP servers from backend configuration")
    except Exception as e:
        logger.error(f"Failed to load MCP servers on startup: {e}")
    
    # Start upload queue workers
    try:
        from src.server.upload_queue import upload_queue
        await upload_queue.start_workers(num_workers=2)
        logger.info("Started upload queue workers")
    except Exception as e:
        logger.error(f"Failed to start upload queue workers: {e}")
    
    # Start Pinecone upload queue workers
    try:
        from src.server.pinecone_upload import pinecone_upload_queue
        await pinecone_upload_queue.start_workers(num_workers=2)
        logger.info("Started Pinecone upload queue workers")
    except Exception as e:
        logger.error(f"Failed to start Pinecone upload queue workers: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    try:
        from src.server.upload_queue import upload_queue
        await upload_queue.stop_workers()
        logger.info("Stopped upload queue workers")
    except Exception as e:
        logger.error(f"Failed to stop upload queue workers: {e}")
    
    # Stop Pinecone upload queue workers
    try:
        from src.server.pinecone_upload import pinecone_upload_queue
        await pinecone_upload_queue.stop_workers()
        logger.info("Stopped Pinecone upload queue workers")
    except Exception as e:
        logger.error(f"Failed to stop Pinecone upload queue workers: {e}")


@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, req: Request):
    from src.api.api_get_current_user import get_current_user
    from src.db.db_session import get_db, get_or_create_chat_session, add_chat_message, SessionLocal
    from src.db_models.chat_message import ChatMessage as ChatMessageModel
    from src.db_models.chat_session import ChatSession
    
    # Get current user
    current_user = None
    try:
        # Get the authorization header
        auth_header = req.headers.get("authorization")
        logger.info(f"[RESEARCH SAVE] Auth header present: {bool(auth_header)}")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            logger.info(f"[RESEARCH SAVE] Token extracted: {token[:20]}...")
            
            db_temp = SessionLocal()
            try:
                current_user = await get_current_user(token, db_temp)
                logger.info(f"[RESEARCH SAVE] Authenticated user: {current_user.email if current_user else 'None'}")
            finally:
                db_temp.close()
        else:
            logger.warning("[RESEARCH SAVE] No valid authorization header for research stream")
    except Exception as e:
        logger.error(f"[RESEARCH SAVE] Failed to authenticate user: {str(e)}")
        import traceback
        logger.error(f"[RESEARCH SAVE] Traceback: {traceback.format_exc()}")
    
    # Get database session - don't use next() to avoid closing it prematurely
    db = SessionLocal()
    
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = f"research_{uuid.uuid4()}"
    
    logger.info(f"[RESEARCH SAVE] Thread ID: {thread_id}")
    
    # Get or create chat session
    session_obj = None
    if current_user:
        try:
            # Check if session exists
            session_obj = db.query(ChatSession).filter(
                ChatSession.thread_id == thread_id,
                ChatSession.user_id == uuid.UUID(current_user.id)
            ).first()
            
            if not session_obj:
                logger.info(f"[RESEARCH SAVE] Creating new session for user {current_user.email}")
                # Get the user message to use as title
                user_msg_content = request.messages[-1].content if request.messages else ""
                session_obj = ChatSession(
                    thread_id=thread_id,
                    user_id=uuid.UUID(current_user.id),
                    mode='research',
                    title=user_msg_content[:100] if user_msg_content else None
                )
                db.add(session_obj)
                db.commit()
                db.refresh(session_obj)
                logger.info(f"[RESEARCH SAVE] Created session with ID: {session_obj.id}")
            else:
                logger.info(f"[RESEARCH SAVE] Found existing session with ID: {session_obj.id}")
                # Update mode to research if needed
                if session_obj.mode != "research":
                    session_obj.mode = "research"
                    db.commit()
        except Exception as e:
            logger.error(f"[RESEARCH SAVE] Error creating/getting session: {str(e)}")
            import traceback
            logger.error(f"[RESEARCH SAVE] Traceback: {traceback.format_exc()}")
    else:
        logger.warning(f"[RESEARCH SAVE] No authenticated user for thread_id: {thread_id}")
    
    # Save user message if we have a session
    if session_obj and request.messages:
        user_msg = request.messages[-1]
        if user_msg.role == "user":
            attachments_data = None
            if hasattr(user_msg, 'attachments') and user_msg.attachments:
                attachments_data = [
                    {
                        "filename": att.filename,
                        "size": att.size,
                        "type": att.type,
                        "documentId": att.documentId
                    }
                    for att in user_msg.attachments
                ]
            add_chat_message(db, session_obj, "user", str(user_msg.content), attachments=attachments_data)
            logger.info(f"[RESEARCH SAVE] Saved user message to session {session_obj.id}")
    
    return StreamingResponse(
        _astream_workflow_generator_with_persistence(
            request.model_dump()["messages"],
            thread_id,
            request.max_plan_iterations,
            request.max_step_num,
            request.auto_accepted_plan,
            request.interrupt_feedback,
            request.mcp_settings,
            request.enable_background_investigation,
            session_obj,
            db,
        ),
        media_type="text/event-stream",
    )


@app.post("/api/chat/simple")
async def chat_simple(request: ChatRequest, req: Request):
    print(f"[CHAT_SIMPLE] === ENDPOINT CALLED === thread_id: {request.thread_id}", flush=True)
    from src.api.api_get_current_user import get_current_user
    from src.db_models.chat_session import ChatSession
    from fastapi import Header
    
    # Get auth token from header
    auth_header = req.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '') if auth_header.startswith('Bearer ') else None
    
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[CHAT_SIMPLE] Auth header: {auth_header[:50] if auth_header else 'None'}")
    logger.info(f"[CHAT_SIMPLE] Token extracted: {token[:20] if token else 'None'}...")
    
    # Get current user
    current_user = None
    if token:
        try:
            db_temp = SessionLocal()
            current_user = await get_current_user(token, db_temp)
            db_temp.close()
            logger.info(f"[CHAT_SIMPLE] Current user: {current_user.email if current_user else 'None'}")
        except Exception as e:
            logger.error(f"[CHAT_SIMPLE] Error getting user: {str(e)}")
            pass
    else:
        logger.warning("[CHAT_SIMPLE] No token provided")
    
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = f"chat_{uuid.uuid4()}"

    db = SessionLocal()
    
    # Debug: Print entire request
    print(f"[CHAT_SIMPLE] Full request messages: {request.messages}", flush=True)
    
    # Create or get session with user association
    if current_user:
        print(f"[CHAT_SIMPLE] Looking for session - user: {current_user.email}, thread_id: {thread_id}", flush=True)
        session_obj = db.query(ChatSession).filter(
            ChatSession.thread_id == thread_id,
            ChatSession.user_id == uuid.UUID(current_user.id)
        ).first()
        if not session_obj:
            print(f"[CHAT_SIMPLE] Creating NEW session", flush=True)
            # Get the user message to use as title
            user_msg = request.messages[-1].content if request.messages else ""
            session_obj = ChatSession(
                thread_id=thread_id,
                user_id=uuid.UUID(current_user.id),
                mode='chat',
                title=user_msg[:100] if user_msg else None  # Set title immediately
            )
            db.add(session_obj)
            db.commit()
            db.refresh(session_obj)
            print(f"[CHAT_SIMPLE] Created new session with ID: {session_obj.id}, title: {session_obj.title}", flush=True)
        else:
            print(f"[CHAT_SIMPLE] Found EXISTING session with ID: {session_obj.id}, title: {session_obj.title}", flush=True)
    else:
        logger.warning(f"[CHAT_SIMPLE] No user - creating anonymous session for thread_id: {thread_id}")
        session_obj = get_or_create_chat_session(db, thread_id)

    chain = chat_chains.get(thread_id)
    if chain is None:
        chain = build_chat_graph_with_memory()
        chat_chains[thread_id] = chain

    user_message = request.messages[-1].content if request.messages else ""
    user_attachments = request.messages[-1].attachments if request.messages and request.messages[-1].attachments else None
    
    print(f"[CHAT_SIMPLE] User message: {user_message[:50]}...", flush=True)
    print(f"[CHAT_SIMPLE] User attachments: {user_attachments}", flush=True)
    
    # Convert attachments to dict format for JSON storage
    attachments_data = None
    if user_attachments:
        attachments_data = [
            {
                "filename": att.filename,
                "size": att.size,
                "type": att.type,
                "documentId": att.documentId
            }
            for att in user_attachments
        ]
        print(f"[CHAT_SIMPLE] Converted attachments data: {attachments_data}", flush=True)
    
    add_chat_message(db, session_obj, "user", str(user_message), attachments=attachments_data)
    
    # Always update title if it's the first message and no title is set
    from src.db_models.chat_message import ChatMessage as ChatMessageModel
    message_count = db.query(ChatMessageModel).filter(ChatMessageModel.session_id == session_obj.id).count()
    print(f"[CHAT_SIMPLE DEBUG] Session {session_obj.id} - Title: {repr(session_obj.title)}, Messages: {message_count}, Current msg: {user_message[:50]}", flush=True)
    
    if (not session_obj.title or session_obj.title == '') and user_message and message_count <= 2:
        print(f"[CHAT_SIMPLE] Setting title for session {session_obj.id}: {str(user_message)[:50]}...", flush=True)
        session_obj.title = str(user_message)[:100]  # Limit to 100 chars
        db.add(session_obj)  # Make sure session is in the session
        db.commit()
        db.refresh(session_obj)
        print(f"[CHAT_SIMPLE] Title set and committed: {session_obj.title}", flush=True)
    else:
        print(f"[CHAT_SIMPLE] Not setting title - Title: {repr(session_obj.title)}, Messages: {message_count}", flush=True)
    
    # Search documents if user has uploaded any
    context_docs = []
    citations = []  # Initialize citations list
    if current_user and session_obj:
        try:
            from src.server.document_processor_with_validation import validated_document_processor
            from src.db_models import Document
            
            # Check if session has documents
            session_docs = db.query(Document).filter(
                Document.session_id == session_obj.id,
                Document.processing_status == 'completed',
                Document.is_active == True
            ).count()
            
            if session_docs > 0:
                logger.info(f"[RAG] Found {session_docs} documents for session {session_obj.id}")
                # Use validated search that ensures documents exist in DB
                search_results = validated_document_processor.search_documents_with_validation(
                    query=user_message,
                    user_id=current_user.id,
                    session_id=str(session_obj.id),
                    top_k=3,
                    db=db
                )
                
                # If no results with session filter, try without session filter
                if not search_results:
                    logger.info(f"[RAG] No results with session filter, trying without session filter")
                    search_results = validated_document_processor.search_documents_with_validation(
                        query=user_message,
                        user_id=current_user.id,
                        session_id=None,
                        top_k=3,
                        db=db
                    )
                
                logger.info(f"[RAG] Validated search returned {len(search_results)} results")
                
                if search_results:
                    context_docs = search_results
                    # Add context to the message with citation markers
                    context_text = "\n\nRelevant information from your documents:\n"
                    for doc in search_results:
                        citation_id = doc['citation_id']
                        context_text += f"\n{citation_id} {doc['content'][:500]}...\n"
                        logger.info(f"[RAG] Including document chunk from {doc['metadata'].get('filename', 'unknown')}")
                        # Store citation info for later
                        # Only add citation if it's from a valid document
                        if doc.get('citation') and doc['citation'].get('document_id'):
                            citations.append(doc['citation'])
                            logger.info(f"[RAG] Added citation for document {doc['citation']['document_id']}")
                    
                    # Add instruction for LLM to use citations
                    system_instruction = """When answering, use the citation markers [1], [2], etc. inline where you reference the information.
IMPORTANT: 
- Do NOT add a "References" section, bibliography, or list of sources at the end of your response
- Do NOT convert citation markers into links - just use plain text like [1], [2], etc.
- Do NOT create markdown links for citations
- Citations should only appear as plain text markers inline"""
                    
                    # Prepend context to user message
                    user_message = f"{system_instruction}\n\n{context_text}\n\nUser question: {user_message}"
                    logger.info(f"[RAG] Enhanced message with document context and citations")
        except Exception as e:
            logger.warning(f"Error searching documents: {e}")

    def iter_response():
        logger.info(f"[RAG] iter_response called for thread_id: {thread_id}")
        try:
            # RunnableWithMessageHistory.invoke expects config with session_id
            config = {"configurable": {"session_id": thread_id}}
            logger.info(f"[RAG] Invoking chain with config: {config}")
            result = chain.invoke({"input": user_message}, config=config)
            logger.info(f"[RAG] Chain invoked, result type: {type(result)}")
            
            # The new API returns AIMessage content directly
            if hasattr(result, 'content'):
                response_text = result.content
            else:
                response_text = str(result)

            # Log the response to check for markdown links
            logger.info(f"[RAG] LLM response length: {len(response_text)}")
            logger.info(f"[RAG] LLM response preview: {response_text[:500]}...")
            
            # Check if response contains markdown links that might be causing issues
            if "](document-viewer/" in response_text or "](/document-viewer/" in response_text:
                logger.warning("[RAG] Response contains document-viewer links! This will cause 404 errors.")
                # Remove any markdown links to document-viewer
                import re
                response_text = re.sub(r'\[([^\]]+)\]\(/?(document-viewer/[^)]+)\)', r'[\1]', response_text)
                logger.info("[RAG] Cleaned response to remove document-viewer links")
            
            # Also check for citation links with document IDs
            import re
            # Pattern to match [number](any-url-with-document-id)
            doc_id_pattern = r'\[(\d+)\]\([^)]*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[^)]*\)'
            if re.search(doc_id_pattern, response_text):
                logger.warning("[RAG] Response contains citation links with document IDs! Removing them.")
                response_text = re.sub(doc_id_pattern, r'[\1]', response_text)
                logger.info("[RAG] Cleaned response to remove citation links with document IDs")
            
            # Final check for ANY citation that looks like a markdown link
            citation_link_pattern = r'\[(\d+|\[\d+\])\]\([^)]+\)'
            if re.search(citation_link_pattern, response_text):
                logger.warning("[RAG] Response still contains citation links! Final cleanup.")
                response_text = re.sub(citation_link_pattern, r'[\1]', response_text)
                logger.info("[RAG] Final cleanup of citation links complete")
            
            # Also check for other problematic patterns
            if "](" in response_text and "document" in response_text:
                logger.warning(f"[RAG] Response may contain document links. Checking...")
                # Log any markdown links found
                import re
                links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', response_text)
                if links:
                    logger.warning(f"[RAG] Found markdown links: {links[:3]}...")
            
            add_chat_message(db, session_obj, "assistant", str(response_text), citations=citations)
            
            # Include citations in the response data
            data = {
                "thread_id": thread_id,
                "id": str(uuid.uuid4()),
                "agent": "coordinator",  # Add agent field for compatibility
                "role": "assistant",
                "content": response_text,
                "finish_reason": "stop",
                "citations": citations if citations else None
            }
            
            # Log what we're sending
            logger.info(f"[RAG] Sending response with {len(citations) if citations else 0} citations")
            if citations:
                logger.info(f"[RAG] First citation: {citations[0]}")
            
            # Debug: log the full data being sent
            logger.info(f"[RAG-DEBUG] Full response data being sent:")
            logger.info(pprint.pformat(data))
            
            yield f"event: message_chunk\ndata: {json.dumps(data)}\n\n"
        except Exception as e:
            logger.exception(f"Error in simple chat: {str(e)}")
            error_data = {
                "thread_id": thread_id,
                "id": str(uuid.uuid4()),
                "agent": "coordinator",
                "role": "assistant",
                "content": f"Error: {str(e)}",
                "finish_reason": "error",
            }
            yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"

    return StreamingResponse(iter_response(), media_type="text/event-stream")


@app.post("/api/chat/tool")
async def chat_tool(request: ChatRequest, req: Request):
    """Handle single tool queries with @ mention."""
    from src.api.api_get_current_user import get_current_user
    from src.db.db_session import get_db, get_or_create_chat_session, add_chat_message, SessionLocal
    
    # Get current user
    current_user = None
    try:
        auth_header = req.headers.get("authorization")
        logger.info(f"[TOOL] Auth header present: {bool(auth_header)}")
        
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            db_temp = SessionLocal()
            try:
                current_user = await get_current_user(token, db_temp)
                logger.info(f"[TOOL] Authenticated user: {current_user.email if current_user else 'None'}")
            finally:
                db_temp.close()
    except Exception as e:
        logger.error(f"[TOOL] Failed to authenticate user: {str(e)}")
    
    # Get database session
    db = SessionLocal()
    
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid.uuid4())

    # Extract tool information from request
    tool_id = request.tool_id
    tool_type = request.tool_type
    
    if not tool_id or not tool_type:
        raise HTTPException(status_code=400, detail="Missing tool_id or tool_type")

    user_message = request.messages[-1].content if request.messages else ""
    
    # Get or create chat session
    session_obj = None
    if current_user:
        try:
            session_obj = db.query(ChatSession).filter(
                ChatSession.thread_id == thread_id,
                ChatSession.user_id == uuid.UUID(current_user.id)
            ).first()
            
            if not session_obj:
                logger.info(f"[TOOL] Creating new session for user {current_user.email}")
                # Determine mode based on tool
                mode = 'research' if tool_id == 'research' else 'chat'
                session_obj = ChatSession(
                    thread_id=thread_id,
                    user_id=uuid.UUID(current_user.id),
                    mode=mode,
                    title=user_message[:100] if user_message else None
                )
                db.add(session_obj)
                db.commit()
                db.refresh(session_obj)
                logger.info(f"[TOOL] Created session with ID: {session_obj.id}")
            else:
                logger.info(f"[TOOL] Found existing session with ID: {session_obj.id}")
        except Exception as e:
            logger.error(f"[TOOL] Error creating/getting session: {str(e)}")
    
    # Save user message if we have a session
    if session_obj and request.messages and user_message:
        add_chat_message(db, session_obj, "user", user_message)
        logger.info(f"[TOOL] Saved user message to session {session_obj.id}")

    async def iter_response():
        try:
            if tool_type == "mcp":
                # Handle MCP tool query
                async for event in _handle_mcp_tool_query(user_message, tool_id, thread_id, request.mcp_settings or {}):
                    yield event
            elif tool_type == "agent":
                if tool_id == "research":
                    # Handle research agent query with persistence
                    async for event in _handle_research_query_with_persistence(user_message, thread_id, request, session_obj, db):
                        yield event
                elif tool_id == "documents":
                    # Handle documents query
                    for event in _handle_documents_query(user_message, thread_id, request):
                        yield event
                else:
                    raise HTTPException(status_code=400, detail=f"Unknown agent: {tool_id}")
            else:
                raise HTTPException(status_code=400, detail=f"Unknown tool type: {tool_type}")
        except Exception as e:
            logger.exception(f"Error in tool query: {str(e)}")
            error_data = {
                "thread_id": thread_id,
                "id": str(uuid.uuid4()),
                "role": "assistant", 
                "content": f"Error executing tool: {str(e)}",
                "finish_reason": "error",
            }
            yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"

    return StreamingResponse(iter_response(), media_type="text/event-stream")


async def _handle_mcp_tool_query(user_message: str, tool_id: str, thread_id: str, mcp_settings: dict):
    """Handle MCP tool query - supports both OpenAI responses API and traditional MCP."""
    # Parse tool_id to get server and tool name
    server_id, tool_name = tool_id.split('.', 1)
    
    try:
        # Debug: Log the MCP settings structure
        logger.info(f"MCP settings received: {mcp_settings}")
        logger.info(f"MCP settings type: {type(mcp_settings)}")
        
        # Get server configuration for the specific server
        # Combine backend servers with frontend servers
        backend_servers = mcp_server_config.get_mcp_servers_dict()
        frontend_servers = mcp_settings.get("servers", {}) if mcp_settings else {}
        
        # Merge servers - frontend servers override backend if same ID
        servers = {**backend_servers, **frontend_servers}
        
        if not servers:
            logger.error(f"No MCP servers configured. Settings: {mcp_settings}")
            raise ValueError(f"No MCP servers configured")
        
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
        
        # Check transport type to determine which implementation to use
        transport = server_config.get("transport", "stdio")
        
        if transport == "openai-responses":
            # Use OpenAI responses API
            async for event in _handle_openai_responses_query(user_message, tool_name, thread_id, server_config):
                yield event
        else:
            # Use traditional MCP implementation
            async for event in _handle_traditional_mcp_query(user_message, tool_id, thread_id, server_config, mcp_settings):
                yield event
            
    except Exception as e:
        logger.exception(f"Error executing MCP tool '{tool_name}': {str(e)}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"Error executing MCP tool '{tool_name}': {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


async def _handle_openai_responses_query(user_message: str, tool_name: str, thread_id: str, server_config: dict):
    """Handle MCP tool query using OpenAI responses API."""
    try:
        from openai import OpenAI
        
        # Get OpenAI credentials from server configuration
        api_key = server_config.get("api_key")
        base_url = server_config.get("base_url", "https://api-gateway.octagonagents.com/v1")
        model = server_config.get("model", "octagon-agent")
        
        if not api_key:
            raise ValueError(f"No API key found for OpenAI responses server. Please add 'api_key' to your MCP server configuration.")
        
        # Create OpenAI client
        client = OpenAI(
            api_key=api_key,
            base_url=base_url
        )
        
        # Make the API call using the responses endpoint
        logger.info(f"Making OpenAI responses API call for tool '{tool_name}' with input: {user_message}")
        response = client.responses.create(
            model=model,
            input=user_message
        )
        
        logger.info(f"OpenAI responses API returned: {response}")
        
        # Extract response content
        if hasattr(response, 'content'):
            response_content = response.content
        elif hasattr(response, 'text'):
            response_content = response.text
        else:
            response_content = str(response)
        
        data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": response_content,
            "finish_reason": "stop",
        }
        yield f"event: message_chunk\ndata: {json.dumps(data)}\n\n"
        
    except Exception as e:
        logger.exception(f"Error in OpenAI responses query: {str(e)}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"Error executing OpenAI responses API: {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


async def _handle_traditional_mcp_query(user_message: str, tool_id: str, thread_id: str, server_config: dict, mcp_settings: dict):
    """Handle traditional MCP tool query using langchain-mcp-adapters."""
    try:
        from langchain_mcp_adapters.client import MultiServerMCPClient
        from langchain_core.messages import HumanMessage
        from src.llms.llm import get_llm_by_type
        from src.config.agents import AGENT_LLM_MAP
        
        # Parse tool_id to get server and tool name
        server_id, tool_name = tool_id.split('.', 1)
        
        # Create MCP client for the specific server
        mcp_servers = {
            server_id: {
                k: v for k, v in server_config.items()
                if k in ("transport", "command", "args", "url", "env")
            }
        }
        
        tool_result = None
        async with MultiServerMCPClient(mcp_servers) as client:
            # List all available tools for debugging
            all_tools = client.get_tools()
            logger.info(f"Available tools in server '{server_id}': {[tool.name for tool in all_tools]}")
            
            # Find the specific tool
            target_tool = None
            for tool in all_tools:
                logger.info(f"Checking tool: {tool.name} (looking for: {tool_name})")
                if tool.name == tool_name:
                    target_tool = tool
                    logger.info(f"Found target tool: {tool.name}")
                    break
            
            if not target_tool:
                available_tools = [tool.name for tool in all_tools]
                raise ValueError(f"Tool '{tool_name}' not found in server '{server_id}'. Available tools: {available_tools}")
            
            # First, try to inspect the tool schema
            tool_schema = None
            if hasattr(target_tool, 'args_schema') and target_tool.args_schema:
                try:
                    # Try Pydantic model schema method
                    tool_schema = target_tool.args_schema.schema()
                    logger.info(f"Tool '{tool_name}' schema: {tool_schema}")
                except Exception as e:
                    logger.info(f"Could not get schema for tool '{tool_name}': {e}")
                    # Try alternative schema access methods
                    try:
                        # Check if it's already a dict (like in this case)
                        if isinstance(target_tool.args_schema, dict):
                            tool_schema = target_tool.args_schema
                            logger.info(f"Tool '{tool_name}' schema (dict): {tool_schema}")
                        elif hasattr(target_tool.args_schema, '__fields__'):
                            fields = target_tool.args_schema.__fields__
                            logger.info(f"Tool '{tool_name}' fields: {list(fields.keys())}")
                            for field_name, field in fields.items():
                                logger.info(f"  Field '{field_name}': {field}")
                        elif hasattr(target_tool.args_schema, '__dict__'):
                            logger.info(f"Tool '{tool_name}' args_schema attributes: {target_tool.args_schema.__dict__}")
                    except Exception as e2:
                        logger.info(f"Could not get fields for tool '{tool_name}': {e2}")
                        # Try to inspect the raw object
                        logger.info(f"Tool '{tool_name}' args_schema type: {type(target_tool.args_schema)}")
                        logger.info(f"Tool '{tool_name}' args_schema: {target_tool.args_schema}")
            
            # Also log the tool object details for debugging
            logger.info(f"Tool '{tool_name}' details - Type: {type(target_tool)}, Has args_schema: {hasattr(target_tool, 'args_schema')}")
            if hasattr(target_tool, 'description'):
                logger.info(f"Tool '{tool_name}' description: {target_tool.description}")
            if hasattr(target_tool, '__dict__'):
                logger.info(f"Tool '{tool_name}' attributes: {list(target_tool.__dict__.keys())}")
            
            # Build parameter patterns based on schema or common patterns
            common_params = []
            
            # If we have schema, try to use it
            if tool_schema and 'properties' in tool_schema:
                properties = tool_schema['properties']
                required_params = tool_schema.get('required', [])
                
                # Special handling for OpenGov schema with 'type' enum
                if 'type' in properties and 'enum' in properties['type']:
                    type_enum = properties['type']['enum']
                    logger.info(f"Found type enum for tool '{tool_name}': {type_enum}")
                    
                    # Add specific patterns for each type
                    for type_value in type_enum:
                        if type_value == 'catalog':
                            common_params.append({'type': 'catalog', 'query': user_message})
                        elif type_value == 'data-access':
                            # For data access, we need a dataset ID, so try catalog first
                            common_params.append({'type': 'catalog', 'query': 'traffic violations'})
                        else:
                            common_params.append({'type': type_value})
                    
                    # Add basic query patterns
                    common_params.extend([
                        {'type': 'catalog', 'query': 'traffic'},
                        {'type': 'catalog', 'query': 'violations'},  
                        {'type': 'catalog', 'query': 'parking'},
                        {'type': 'catalog'},
                        {'type': 'categories'},
                        {'type': 'site-metrics'}
                    ])
                elif len(properties) == 1:
                    # Single parameter - use it directly
                    param_name = list(properties.keys())[0]
                    common_params.append({param_name: user_message})
                elif required_params:
                    # Multiple parameters with required ones - try required first
                    for param_name in required_params:
                        if param_name in properties:
                            common_params.append({param_name: user_message})
                else:
                    # Multiple optional parameters - try each one
                    for param_name in properties.keys():
                        common_params.append({param_name: user_message})
            
            # Add OpenGov-specific operation patterns first (based on error analysis)
            opengov_patterns = [
                {"operation": "search", "query": user_message},
                {"operation": "get", "dataset": user_message},
                {"operation": "list", "query": user_message},
                {"operation": "find", "query": user_message},
                {"operation": "fetch", "query": user_message},
                {"operation": "search", "search_query": user_message},
                {"operation": "get_data", "query": user_message},
                {"operation": "query", "text": user_message},
            ]
            
            # Add common parameter patterns
            common_patterns = [
                {"prompt": user_message},
                {"query": user_message},
                {"text": user_message},
                {"input": user_message},
                {"search": user_message},
                {"q": user_message},
                {"data": user_message},
                {"question": user_message},
                {"message": user_message},
                {"request": user_message},
                {"term": user_message},
                {"keywords": user_message},
                # OpenGov specific patterns
                {"dataset": user_message},
                {"search_query": user_message},
                {"filter": user_message},
                # Try with just the string
                user_message,
                # Try with no parameters
                {},
            ]
            
            # Combine OpenGov patterns first, then common patterns
            common_params.extend(opengov_patterns + common_patterns)
            
            logger.info(f"Starting parameter testing for tool '{tool_name}' with {len(common_params)} parameter patterns")
            failed_attempts = []
            for i, params in enumerate(common_params):
                try:
                    logger.info(f"Trying tool '{tool_name}' with params: {params}")
                    tool_result = await target_tool.ainvoke(params)
                    logger.info(f"Success! Tool '{tool_name}' returned result")
                    break
                except Exception as e:
                    error_details = f"{type(e).__name__}: {e}"
                    failed_attempts.append(f"params {params} -> {error_details}")
                    logger.info(f"Failed attempt {i+1}/{len(common_params)} with params {params}: {error_details}")
                    continue
            
            if tool_result is None:
                error_msg = f"Could not determine how to call tool '{tool_name}' with any parameter patterns."
                if tool_schema:
                    error_msg += f" Tool schema: {tool_schema}"
                error_msg += f" Failed attempts: {'; '.join(failed_attempts[:5])}..."  # Show first 5 failures
                raise ValueError(error_msg)
        
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
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": response_content,
            "finish_reason": "stop",
        }
        yield f"event: message_chunk\ndata: {json.dumps(data)}\n\n"
        
    except Exception as e:
        logger.exception(f"Error in traditional MCP query: {str(e)}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"Error executing traditional MCP tool: {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


async def _handle_research_query(user_message: str, thread_id: str, request: ChatRequest):
    """Handle research agent query using DeerFlow research capabilities."""
    try:
        # If we have interrupt feedback, we're resuming an interrupted flow
        # Don't create a new message in this case
        messages = []
        if not request.interrupt_feedback and user_message:
            messages = [{"role": "user", "content": user_message}]
        
        # Use the main DeerFlow research stream with proper configuration
        async for event in _astream_workflow_generator(
            messages,
            thread_id,
            request.max_plan_iterations or 3,
            request.max_step_num or 25,
            request.auto_accepted_plan or False,
            request.interrupt_feedback or "",
            request.mcp_settings or {},
            request.enable_background_investigation or True,
        ):
            yield event
    except Exception as e:
        logger.exception(f"Error in research query: {str(e)}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"Error during research: {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


async def _handle_research_query_with_persistence(user_message: str, thread_id: str, request: ChatRequest, session_obj, db):
    """Handle research agent query with message persistence."""
    try:
        # If we have interrupt feedback, we're resuming an interrupted flow
        # Don't create a new message in this case
        messages = []
        if not request.interrupt_feedback and user_message:
            messages = [{"role": "user", "content": user_message}]
        
        # Use the persistence wrapper for research
        async for event in _astream_workflow_generator_with_persistence(
            messages,
            thread_id,
            request.max_plan_iterations or 3,
            request.max_step_num or 25,
            request.auto_accepted_plan or False,
            request.interrupt_feedback or "",
            request.mcp_settings or {},
            request.enable_background_investigation or True,
            session_obj,
            db,
        ):
            yield event
    except Exception as e:
        logger.exception(f"Error in research query with persistence: {str(e)}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"Error during research: {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


def _handle_documents_query(user_message: str, thread_id: str, _request: ChatRequest):
    """Handle documents query - search and Q&A over uploaded documents."""
    try:
        import json
        import os
        
        # Use direct Pinecone integration to avoid internal HTTP call deadlock
        try:
            from pinecone import Pinecone
            from openai import OpenAI
            import numpy as np
            
            # Get API keys
            pinecone_api_key = os.getenv("PINECONE_API_KEY")
            openai_api_key = os.getenv("OPENAI_API_KEY")
            
            if not pinecone_api_key or not openai_api_key:
                content = "Pinecone or OpenAI API keys not configured. Please configure them to use document search."
            else:
                # Initialize clients
                pc = Pinecone(api_key=pinecone_api_key)
                openai_client = OpenAI(api_key=openai_api_key)
                
                # Generate embedding for question
                embedding_response = openai_client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=user_message
                )
                query_embedding = embedding_response.data[0].embedding
                
                # Search across indices
                all_results = []
                indices_info = pc.list_indexes()
                indices_to_search = [idx.name for idx in indices_info]
                
                for index_name in indices_to_search:
                    try:
                        index = pc.Index(index_name)
                        search_results = index.query(
                            vector=query_embedding,
                            top_k=6,  # Get more results for better context
                            include_metadata=True,
                            include_values=False
                        )
                        
                        for match in search_results.matches:
                            metadata = match.metadata or {}
                            all_results.append({
                                "text": metadata.get("text", ""),
                                "score": match.score,
                                "source": f"{index_name}/{metadata.get('filename', 'unknown')}",
                                "metadata": metadata
                            })
                    except Exception as e:
                        logger.warning(f"Error searching index {index_name}: {e}")
                        continue
                
                if not all_results:
                    content = "I couldn't find any relevant information in your documents to answer your question. Please make sure you have uploaded documents using the paperclip icon."
                else:
                    # Sort by score and take top results
                    all_results.sort(key=lambda x: x["score"], reverse=True)
                    relevant_chunks = all_results[:3]
                    
                    # Build context from relevant chunks
                    context_parts = []
                    sources = []
                    
                    for i, result in enumerate(relevant_chunks):
                        context_parts.append(f"[Source {i+1}]: {result['text']}")
                        sources.append({
                            "source": result["source"],
                            "score": result["score"],
                            "metadata": result["metadata"]
                        })
                    
                    context = "\n\n".join(context_parts)
                    
                    # Generate answer using OpenAI
                    prompt = f"""Based on the following context from the knowledge base, please answer the question.
If the context doesn't contain enough information to answer the question, say so.

Context:
{context}

Question: {user_message}

Answer:"""
                    
                    response = openai_client.chat.completions.create(
                        model="gpt-4-turbo-preview",
                        messages=[
                            {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. Be accurate and cite sources when possible."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.7,
                        max_tokens=500
                    )
                    
                    answer = response.choices[0].message.content
                    
                    # Calculate confidence based on search scores
                    avg_score = float(np.mean([r["score"] for r in relevant_chunks]))
                    
                    # Format the response nicely
                    content_parts = [
                        f"**Question**: {user_message}\n",
                        f"**Answer**: {answer}\n"
                    ]
                    
                    if sources:
                        content_parts.append("**Sources**:")
                        for i, source in enumerate(sources, 1):
                            content_parts.append(f"{i}. **{source['source']}** (relevance: {source['score']:.1%})")
                            # Show a snippet of the source text
                            if source['metadata'].get('text'):
                                snippet = source['metadata']['text'][:150]
                                content_parts.append(f"   _{snippet}..._")
                        content_parts.append("")
                    
                    content_parts.append(f"**Confidence**: {avg_score:.1%}")
                    content_parts.append(f"**Documents Searched**: {len(relevant_chunks)} chunks")
                    
                    content = "\n".join(content_parts)
                    
        except Exception as e:
            logger.error(f"Error in direct Pinecone search: {e}")
            content = f"I encountered an error while searching your documents: {str(e)}"
        
        # Yield the response
        response_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": content,
            "finish_reason": "stop",
        }
        yield f"event: message_chunk\ndata: {json.dumps(response_data)}\n\n"
        
    except Exception as e:
        logger.error(f"Error in documents query: {e}")
        error_data = {
            "thread_id": thread_id,
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": f"I encountered an error while searching your documents: {str(e)}",
            "finish_reason": "error",
        }
        yield f"event: message_chunk\ndata: {json.dumps(error_data)}\n\n"


async def _astream_workflow_generator_with_persistence(
    messages: List[ChatMessage],
    thread_id: str,
    max_plan_iterations: int,
    max_step_num: int,
    auto_accepted_plan: bool,
    interrupt_feedback: str,
    mcp_settings: dict,
    enable_background_investigation,
    session_obj,
    db,
):
    from src.db.db_session import add_chat_message
    
    # Dictionary to accumulate messages per agent
    agent_messages = {}
    
    logger.info(f"[RESEARCH SAVE] Starting persistence wrapper for thread {thread_id}, session: {session_obj.id if session_obj else 'None'}")
    
    async for event in _astream_workflow_generator(
        messages,
        thread_id,
        max_plan_iterations,
        max_step_num,
        auto_accepted_plan,
        interrupt_feedback,
        mcp_settings,
        enable_background_investigation,
    ):
        # Log all events for debugging
        if "message_chunk" in event:
            logger.debug(f"[RESEARCH SAVE] Received event: {event[:200]}...")
        
        # Extract event data to check for complete messages
        if event.startswith("event: message_chunk\ndata: "):
            try:
                data_str = event[len("event: message_chunk\ndata: "):-2]  # Remove trailing \n\n
                data = json.loads(data_str)
                
                agent = data.get("agent", "coordinator")
                msg_id = data.get("id")
                content = data.get("content", "")
                finish_reason = data.get("finish_reason")
                
                logger.debug(f"[RESEARCH SAVE] Processing chunk - Agent: {agent}, ID: {msg_id}, Content length: {len(content)}, Finish: {finish_reason}")
                
                # Accumulate message content per agent/message
                msg_key = f"{agent}:{msg_id}"
                if msg_key not in agent_messages:
                    agent_messages[msg_key] = {
                        "agent": agent,
                        "content": "",
                        "id": msg_id
                    }
                    logger.info(f"[RESEARCH SAVE] Started accumulating message for {msg_key}")
                
                agent_messages[msg_key]["content"] += content
                
                # Save complete message when finished
                if finish_reason and session_obj:
                    complete_content = agent_messages[msg_key]["content"]
                    logger.info(f"[RESEARCH SAVE] Message complete for {agent} (ID: {msg_id}), content length: {len(complete_content)}")
                    
                    if complete_content.strip():  # Only save non-empty messages
                        # Save message (the agent info is already in the content for planner/reporter)
                        try:
                            msg = add_chat_message(
                                db, 
                                session_obj, 
                                "assistant", 
                                complete_content
                            )
                            logger.info(f"[RESEARCH SAVE] Successfully saved {agent} message to chat history (msg id: {msg.id}): {complete_content[:100]}...")
                        except Exception as save_error:
                            logger.error(f"[RESEARCH SAVE] Failed to save message: {save_error}")
                    else:
                        logger.warning(f"[RESEARCH SAVE] Skipping empty message for {agent}")
                    
                    # Clean up accumulated message
                    del agent_messages[msg_key]
                elif finish_reason and not session_obj:
                    logger.warning(f"[RESEARCH SAVE] No session object, cannot save {agent} message")
                    
            except Exception as e:
                logger.error(f"[RESEARCH SAVE] Error processing message for persistence: {e}", exc_info=True)
        
        # Always yield the original event
        yield event
    
    logger.info(f"[RESEARCH SAVE] Completed persistence wrapper, pending messages: {list(agent_messages.keys())}")

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
        # add the last message to the resume message only if it has content
        if messages and messages[-1].get('content'):
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
        # Debug all event data
        if isinstance(event_data, dict) and "__interrupt__" in event_data:
            logger.info(f"[DEBUG] Event with interrupt - agent: {agent}, event_data keys: {list(event_data.keys())}")
        
        if isinstance(event_data, dict):
            if "__interrupt__" in event_data:
                # First check if __interrupt__ is a valid list/tuple before accessing [0]
                interrupt_list = event_data["__interrupt__"]
                logger.info(f"[DEBUG] Interrupt data: type={type(interrupt_list)}, len={len(interrupt_list) if hasattr(interrupt_list, '__len__') else 'N/A'}, content={interrupt_list}")
                # Handle empty interrupt (which means we just need to pause)
                if not isinstance(interrupt_list, (list, tuple)) or len(interrupt_list) == 0:
                    logger.info("Empty interrupt detected - creating interrupt event")
                    # Create a simple interrupt event
                    yield _make_event(
                        "interrupt",
                        {
                            "thread_id": thread_id,
                            "id": str(uuid.uuid4()),
                            "role": "assistant",
                            "content": "Please Review the Plan.",
                            "finish_reason": "interrupt",
                            "options": [
                                {"text": "Edit plan", "value": "edit_plan"},
                                {"text": "Start research", "value": "accepted"},
                            ],
                        },
                    )
                    continue
                
                interrupt_data = interrupt_list[0]
                # Handle different interrupt data structures
                interrupt_id = str(uuid.uuid4())  # Generate a unique ID for the interrupt
                if hasattr(interrupt_data, 'ns'):
                    # If ns is a tuple/list, get the first element
                    if isinstance(interrupt_data.ns, (list, tuple)) and len(interrupt_data.ns) > 0:
                        interrupt_id = interrupt_data.ns[0]
                    # If ns is a string, use it directly
                    elif isinstance(interrupt_data.ns, str):
                        interrupt_id = interrupt_data.ns
                
                yield _make_event(
                    "interrupt",
                    {
                        "thread_id": thread_id,
                        "id": interrupt_id,
                        "role": "assistant",
                        "content": interrupt_data.value,
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


@app.get("/api/mcp/backend-servers")
async def get_backend_mcp_servers():
    """Get MCP servers configured in the backend."""
    try:
        servers = mcp_server_config.get_servers_for_frontend()
        return {"servers": servers}
    except Exception as e:
        logger.exception(f"Error getting backend MCP servers: {str(e)}")
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


# Mock authentication endpoints for running without database
@app.post("/api/register")
async def mock_register(request: Request):
    """Mock registration endpoint that always succeeds."""
    # Handle both JSON and FormData
    try:
        # Try to parse as form data
        form_data = await request.form()
        email = form_data.get("email", "user@example.com")
    except:
        # Fall back to JSON
        try:
            json_data = await request.json()
            email = json_data.get("email", "user@example.com")
        except:
            email = "user@example.com"
    
    return {
        "message": "Registration successful (mock)",
        "user": {
            "id": "mock-user-123",
            "email": email,
            "username": "mockuser"
        }
    }


@app.post("/api/token")
async def mock_login(request: Request):
    """Mock login endpoint that returns a fake token."""
    # Handle both JSON and FormData
    try:
        # Try to parse as form data
        form_data = await request.form()
        username = form_data.get("username", "user@example.com")
    except:
        # Fall back to JSON
        try:
            json_data = await request.json()
            username = json_data.get("username", "user@example.com")
        except:
            username = "user@example.com"
    
    return {
        "access_token": "mock-jwt-token-123456789",
        "token_type": "bearer",
        "user": {
            "id": "mock-user-123",
            "email": username if "@" in str(username) else "user@example.com",
            "username": "mockuser"
        }
    }


@app.get("/api/users/me")
async def mock_get_current_user():
    """Mock endpoint to get current user."""
    return {
        "id": "mock-user-123",
        "email": "user@example.com",
        "username": "mockuser",
        "is_active": True
    }


@app.get("/api/verify")
async def mock_verify():
    """Mock verification endpoint."""
    return {"verified": True}


# NOTE: This endpoint has been moved to documents_routes.py with proper authentication
# @app.get("/api/documents")
# async def get_documents(
#     page: int = 1,
#     per_page: int = 20,
#     status_filter: str = None
# ):
#     """Get documents from S3 with pagination."""
#     try:
#         from src.server.s3_utils import s3_manager
#         
#         # Get all files for the user
#         all_files = s3_manager.list_user_files("mock-user-123")
#         
#         # Convert S3 files to document format
#         documents = []
#         for file in all_files:
#             # Generate presigned URL
#             try:
#                 download_url = s3_manager.generate_presigned_url(file['key'])
#             except:
#                 download_url = None
#             
#             documents.append({
#                 "id": file['file_id'],
#                 "filename": file['key'],
#                 "original_filename": file['original_filename'],
#                 "file_size": file['size'],
#                 "content_type": file['content_type'],
#                 "processing_status": "completed",  # S3 files are always available
#                 "vectors_created": 0,  # Not applicable for S3
#                 "chunks_created": 0,  # Not applicable for S3
#                 "created_at": file['upload_time'],
#                 "download_url": download_url,
#                 "s3_key": file['key']  # Store key for deletion
#             })
#         
#         # Apply pagination
#         start_idx = (page - 1) * per_page
#         end_idx = start_idx + per_page
#         paginated_docs = documents[start_idx:end_idx]
#         
#         return {
#             "documents": paginated_docs,
#             "total": len(documents),
#             "page": page,
#             "per_page": per_page
#         }
#     except Exception as e:
#         logger.error(f"Error fetching documents: {e}")
#         # Return empty list on error
#         return {
#             "documents": [],
#             "total": 0,
#             "page": page,
#             "per_page": per_page
#         }


# NOTE: This endpoint has been moved to documents_routes.py with proper authentication
# @app.post("/api/documents/upload")
# async def upload_document(
#     file: UploadFile = File(...)
# ):
#     """Upload a document to S3 and process for RAG."""
#     try:
#         from src.server.s3_utils import s3_manager
#         from src.server.document_processor import document_processor
from src.server.document_processor_enhanced import enhanced_document_processor
#         
#         # Read file content
#         content = await file.read()
#         
#         # Upload to S3
#         result = s3_manager.upload_file(
#             file_content=content,
#             filename=file.filename,
#             content_type=file.content_type or "application/octet-stream",
#             user_id="mock-user-123"
#         )
#         
#         # Process document for RAG (async)
#         processing_result = await document_processor.process_document(
#             file_content=content,
#             filename=file.filename,
#             content_type=file.content_type or "application/octet-stream",
#             document_id=result['file_id']
#         )
#         
#         return {
#             "success": True,
#             "message": "File uploaded and processed successfully",
#             "document": {
#                 "id": result['file_id'],
#                 "filename": result['filename'],
#                 "size": result['size'],
#                 "upload_time": result['upload_time'],
#                 "chunks_created": processing_result.get('chunks_created', 0),
#                 "vectors_created": processing_result.get('vectors_created', 0)
#             }
#         }
#     except Exception as e:
#         logger.error(f"Error uploading document: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# NOTE: This endpoint has been moved to documents_routes.py with proper authentication
# @app.delete("/api/documents/{document_id}")
# async def delete_document(document_id: str):
#     """Delete a document from S3."""
#     try:
#         from src.server.s3_utils import s3_manager
#         
#         # Get all files to find the one with matching file_id
#         files = s3_manager.list_user_files("mock-user-123")
#         file_to_delete = None
#         
#         for file in files:
#             if file['file_id'] == document_id:
#                 file_to_delete = file
#                 break
#         
#         if not file_to_delete:
#             raise HTTPException(status_code=404, detail="Document not found")
#         
#         # Delete from S3
#         s3_manager.delete_file(file_to_delete['key'])
#         
#         return {"success": True, "message": "Document deleted successfully"}
#     except Exception as e:
#         logger.error(f"Error deleting document: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# NOTE: This endpoint has been moved to documents_routes.py with proper authentication
# @app.get("/api/documents/{document_id}/download-url")
# async def get_document_download_url(document_id: str):
#     """Get a presigned download URL for a document."""
#     try:
#         from src.server.s3_utils import s3_manager
#         
#         # Get all files to find the one with matching file_id
#         files = s3_manager.list_user_files("mock-user-123")
#         file_to_download = None
#         
#         for file in files:
#             if file['file_id'] == document_id:
#                 file_to_download = file
#                 break
#         
#         if not file_to_download:
#             raise HTTPException(status_code=404, detail="Document not found")
#         
#         # Generate presigned URL
#         download_url = s3_manager.generate_presigned_url(file_to_download['key'])
#         
#         return {
#             "download_url": download_url,
#             "filename": file_to_download['original_filename']
#         }
#     except Exception as e:
#         logger.error(f"Error generating download URL: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# NOTE: This endpoint has been moved to documents_routes.py with proper authentication
# @app.post("/api/documents/search")
# async def search_documents(
#     query: str = Form(...),
#     top_k: int = Form(5)
# ):
#     """Search across all uploaded documents."""
#     try:
#         from src.server.document_processor import document_processor
from src.server.document_processor_enhanced import enhanced_document_processor
#         
#         # Search documents
#         results = document_processor.search_documents(
#             query=query,
#             top_k=top_k
#         )
#         
#         return {
#             "query": query,
#             "results": results,
#             "total_results": len(results)
#         }
#     except Exception as e:
#         logger.error(f"Error searching documents: {e}")
#         raise HTTPException(status_code=500, detail=str(e))
