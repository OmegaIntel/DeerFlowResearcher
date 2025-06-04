# Updated src/server/chat_stream.py (modifications to your existing file)
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from typing import List, cast, Any, Optional
from uuid import uuid4
import json
import logging

from langchain_core.messages import AIMessageChunk, ToolMessage
from langgraph.types import Command

from src.graph.builder import build_graph_with_memory
from src.server.chat_request import ChatMessage, ChatRequest
from src.service.report_service import ReportService
from src.api.api_get_current_user import get_current_user, User  # Import your user auth

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)

chat_router = APIRouter()
graph = build_graph_with_memory()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


@chat_router.post("/api/chat/stream")
async def chat_stream(
    request: ChatRequest, token: Optional[str] = Depends(oauth2_scheme)
):
    thread_id = request.thread_id
    if thread_id == "__default__":
        thread_id = str(uuid4())

    logger.info(f"[chat_stream] New stream request. Thread ID: {thread_id}")
    logger.debug(f"[chat_stream] Request payload: {request.model_dump()}")

    # Get current user if authenticated (optional)
    current_user = None
    if token:
        try:
            # Use your existing get_current_user function with proper database session handling
            from src.db.db_session import get_db

            db_session = next(get_db())
            try:
                current_user = await get_current_user(token, db_session)
                logger.info(f"[chat_stream] Authenticated user: {current_user.email}")
                print(
                    f"DEBUG: Successfully authenticated user: {current_user.email}, ID: {current_user.id}"
                )
            except Exception as auth_error:
                logger.warning(f"[chat_stream] Authentication failed: {auth_error}")
                print(f"DEBUG: Authentication failed: {auth_error}")
                current_user = None
            finally:
                db_session.close()
        except Exception as e:
            logger.warning(
                f"[chat_stream] Failed to create database session for authentication: {e}"
            )
            print(f"DEBUG: Failed to create database session: {e}")
            # Continue without authentication - reports will be saved without user_id

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
            request,  # Pass full request for context
            current_user,  # Pass user for report saving
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


async def _astream_workflow_generator(
    messages: List[ChatMessage],
    thread_id: str,
    max_plan_iterations: int,
    max_step_num: int,
    auto_accepted_plan: bool,
    interrupt_feedback: str,
    mcp_settings: dict,
    enable_background_investigation: bool,
    request_context: ChatRequest,  # New parameter
    current_user: Optional[User] = None,  # New parameter
):
    logger.info(f"[stream:{thread_id}] Starting workflow stream.")
    logger.debug(f"[stream:{thread_id}] Messages: {messages}")

    # Variables to capture the report content during streaming
    captured_report_content = ""
    is_reporter_streaming = False

    try:
        if not auto_accepted_plan and interrupt_feedback:
            resume_msg = f"[{interrupt_feedback}]"
            if messages:
                resume_msg += f" {messages[-1].content}"
            input_ = Command(resume=resume_msg)
            logger.debug(f"[stream:{thread_id}] Resuming with: {resume_msg}")
        else:
            input_ = {
                "messages": messages,
                "plan_iterations": 0,
                "final_report": "",
                "current_plan": None,
                "observations": [],
                "auto_accepted_plan": auto_accepted_plan,
                "enable_background_investigation": enable_background_investigation,
            }

        config = {
            "thread_id": thread_id,
            "max_plan_iterations": max_plan_iterations,
            "max_step_num": max_step_num,
            "mcp_settings": mcp_settings,
        }

        async for agent, _, event_data in graph.astream(
            input_,
            config=config,
            stream_mode=["messages", "updates"],
            subgraphs=True,
        ):
            try:
                logger.debug(f"[stream:{thread_id}] Received event_data: {event_data}")

                # Handle interrupt if not bypassed
                if isinstance(event_data, dict) and "__interrupt__" in event_data:
                    if not auto_accepted_plan:
                        interrupt_value = event_data["__interrupt__"][0].value
                        logger.warning(
                            f"[stream:{thread_id}] INTERRUPT triggered: {interrupt_value}"
                        )
                        yield _make_event(
                            "interrupt",
                            {
                                "thread_id": thread_id,
                                "id": event_data["__interrupt__"][0].ns[0],
                                "role": "assistant",
                                "content": interrupt_value,
                                "finish_reason": "interrupt",
                                "options": [
                                    {"text": "Edit plan", "value": "edit_plan"},
                                    {"text": "Start research", "value": "accepted"},
                                ],
                            },
                        )
                    continue

                if isinstance(event_data, tuple):
                    message_chunk, message_metadata = cast(
                        tuple[AIMessageChunk, dict[str, Any]], event_data
                    )

                    logger.debug(f"[stream:{thread_id}] Chunk: {message_chunk}")

                    # Check if this is from the reporter node
                    agent_name = agent[0].split(":")[0] if agent else ""
                    print(
                        f"DEBUG: Agent name: '{agent_name}', message content: '{message_chunk.content[:50] if message_chunk.content else 'None'}'"
                    )

                    if agent_name == "reporter":
                        is_reporter_streaming = True
                        # Capture the report content as it streams
                        if hasattr(message_chunk, "content") and message_chunk.content:
                            captured_report_content += message_chunk.content
                            print(
                                f"DEBUG: Captured report chunk, total length now: {len(captured_report_content)}"
                            )
                    else:
                        # Also try to capture content from any agent that has substantial content
                        # This is a fallback in case the agent name isn't exactly "reporter"
                        if (
                            hasattr(message_chunk, "content")
                            and message_chunk.content
                            and len(message_chunk.content) > 100
                        ):
                            print(
                                f"DEBUG: Found substantial content from agent '{agent_name}', length: {len(message_chunk.content)}"
                            )
                            # If this looks like a report (substantial content), capture it
                            if (
                                not captured_report_content
                            ):  # Only if we haven't captured anything yet
                                captured_report_content += message_chunk.content
                                print(
                                    f"DEBUG: Captured content from '{agent_name}' as fallback, total length: {len(captured_report_content)}"
                                )

                    event_stream_message: dict[str, Any] = {
                        "thread_id": thread_id,
                        "agent": agent_name,
                        "id": message_chunk.id,
                        "role": "assistant",
                        "content": message_chunk.content,
                    }

                    finish_reason = message_chunk.response_metadata.get("finish_reason")
                    if finish_reason:
                        event_stream_message["finish_reason"] = finish_reason
                        logger.debug(
                            f"[stream:{thread_id}] Finish reason: {finish_reason}"
                        )

                    if isinstance(message_chunk, ToolMessage):
                        logger.info(f"[stream:{thread_id}] Streaming Tool Call Result")
                        event_stream_message["tool_call_id"] = (
                            message_chunk.tool_call_id
                        )
                        yield _make_event("tool_call_result", event_stream_message)

                    elif message_chunk.tool_calls:
                        logger.info(f"[stream:{thread_id}] Streaming Tool Calls")
                        event_stream_message["tool_calls"] = message_chunk.tool_calls
                        if hasattr(message_chunk, "tool_call_chunks"):
                            event_stream_message["tool_call_chunks"] = (
                                message_chunk.tool_call_chunks
                            )
                        yield _make_event("tool_calls", event_stream_message)

                    elif isinstance(message_chunk, AIMessageChunk) and getattr(
                        message_chunk, "tool_call_chunks", None
                    ):
                        logger.info(f"[stream:{thread_id}] Streaming Tool Call Chunks")
                        event_stream_message["tool_call_chunks"] = (
                            message_chunk.tool_call_chunks
                        )
                        yield _make_event("tool_call_chunks", event_stream_message)

                    else:
                        logger.info(f"[stream:{thread_id}] Streaming Message Chunk")
                        yield _make_event("message_chunk", event_stream_message)

                else:
                    logger.debug(
                        f"[stream:{thread_id}] Skipping non-interrupt dict: {event_data}"
                    )

            except Exception as e:
                logger.exception(f"[stream:{thread_id}] Error in streaming loop: {e}")
                yield _make_event(
                    "error",
                    {
                        "thread_id": thread_id,
                        "role": "assistant",
                        "content": f"Error processing message: {str(e)}",
                        "error": True,
                    },
                )

    except Exception as e:
        logger.exception(f"[stream:{thread_id}] Fatal stream error: {e}")
        yield _make_event(
            "error",
            {
                "thread_id": thread_id,
                "role": "assistant",
                "content": f"Stream terminated due to error: {str(e)}",
                "error": True,
                "finish_reason": "error",
            },
        )

    finally:
        logger.info(f"[stream:{thread_id}] Stream completed.")

        # NEW: Always save report to database after streaming completes
        try:
            print(f"DEBUG: Starting report save for thread {thread_id}")
            print(
                f"DEBUG: Captured report content length: {len(captured_report_content)}"
            )
            logger.info(f"[stream:{thread_id}] Attempting to save report to database")

            if captured_report_content and captured_report_content.strip():
                # Use the captured report content instead of trying to get it from state
                print(f"DEBUG: Using captured report content")

                # Get basic state info if available (for plan details, etc.)
                final_state = await _get_final_state_from_graph(thread_id, config)
                if not final_state:
                    final_state = {}

                # Override the final_report with our captured content
                final_state["final_report"] = captured_report_content

                user_id = current_user.id if current_user else None
                print(f"DEBUG: current_user object: {current_user}")
                print(f"DEBUG: user_id being passed: {user_id}")
                print(f"DEBUG: user_id type: {type(user_id)}")
                print(
                    f"DEBUG: Calling ReportService.save_report_from_state with user_id: {user_id}"
                )

                report_id = await ReportService.save_report_from_state(
                    thread_id=thread_id,
                    final_state=final_state,
                    request_context=request_context.model_dump(),
                    user_id=user_id,
                )

                print(f"DEBUG: ReportService returned report_id: {report_id}")

                if report_id:
                    logger.info(
                        f"[stream:{thread_id}] Report saved successfully with ID: {report_id}"
                    )
                    # Include report_id in the stream_end event
                    yield _make_event(
                        "stream_end",
                        {
                            "thread_id": thread_id,
                            "finish_reason": "stop",
                            "report_id": report_id,
                        },
                    )
                else:
                    print(f"DEBUG: Report saving failed - no report_id returned")
                    logger.warning(f"[stream:{thread_id}] Failed to save report")
                    yield _make_event(
                        "stream_end", {"thread_id": thread_id, "finish_reason": "stop"}
                    )
            else:
                print(f"DEBUG: No report content captured during streaming")
                logger.warning(
                    f"[stream:{thread_id}] No report content captured during streaming"
                )
                yield _make_event(
                    "stream_end", {"thread_id": thread_id, "finish_reason": "stop"}
                )

        except Exception as e:
            print(f"DEBUG: Exception in report saving: {e}")
            logger.exception(f"[stream:{thread_id}] Error saving report: {e}")
            # Still send stream_end even if report saving fails
            yield _make_event(
                "stream_end",
                {
                    "thread_id": thread_id,
                    "finish_reason": "stop",
                    "report_save_error": str(e),
                },
            )


async def _get_final_state_from_graph(thread_id: str, config: dict) -> Optional[dict]:
    """
    Retrieve the final state from the graph's checkpointer.

    Args:
        thread_id: The conversation thread ID
        config: The graph configuration used during execution

    Returns:
        The final state dictionary if available, None otherwise
    """
    try:
        print(f"DEBUG: _get_final_state_from_graph called for thread {thread_id}")

        # Get the graph's checkpointer (MemorySaver)
        checkpointer = graph.checkpointer
        print(f"DEBUG: Checkpointer type: {type(checkpointer)}")

        if checkpointer:
            # Get the latest checkpoint for this thread
            checkpoint_config = {"configurable": {"thread_id": thread_id}}
            print(f"DEBUG: Getting checkpoint with config: {checkpoint_config}")

            state_snapshot = checkpointer.get(checkpoint_config)
            print(f"DEBUG: State snapshot type: {type(state_snapshot)}")

            if state_snapshot:
                print(
                    f"DEBUG: State snapshot attributes: {[attr for attr in dir(state_snapshot) if not attr.startswith('_')]}"
                )

                # Try different ways to access the state data
                if hasattr(state_snapshot, "values"):
                    print(f"DEBUG: Found values attribute")
                    # Check if values is a method or property
                    if callable(state_snapshot.values):
                        print(f"DEBUG: values is callable, calling it...")
                        try:
                            values = state_snapshot.values()
                            print(f"DEBUG: Values result type: {type(values)}")

                            # Convert dict_values to list to access individual items
                            if hasattr(values, "__iter__"):
                                values_list = list(values)
                                print(f"DEBUG: Values list length: {len(values_list)}")

                                # Look for the state dictionary in the values
                                for i, item in enumerate(values_list):
                                    print(f"DEBUG: Item {i} type: {type(item)}")
                                    if (
                                        isinstance(item, dict)
                                        and "final_report" in item
                                    ):
                                        print(f"DEBUG: Found state dict at index {i}")
                                        print(f"DEBUG: State keys: {list(item.keys())}")
                                        print(
                                            f"DEBUG: final_report length: {len(item['final_report']) if item.get('final_report') else 0}"
                                        )
                                        return item

                                # If no dict with final_report found, return the last dict-like item
                                for item in reversed(values_list):
                                    if isinstance(item, dict):
                                        print(
                                            f"DEBUG: Using last dict item as fallback"
                                        )
                                        print(
                                            f"DEBUG: Fallback keys: {list(item.keys())}"
                                        )
                                        return item

                            print(f"DEBUG: No suitable state dict found in values")
                            return None

                        except Exception as e:
                            print(f"DEBUG: Error calling values(): {e}")
                            return None
                    else:
                        print(f"DEBUG: values is property, accessing directly")
                        return state_snapshot.values

                # Try accessing as dict directly
                elif isinstance(state_snapshot, dict):
                    print(f"DEBUG: State snapshot is dict")
                    return state_snapshot
                else:
                    print(f"DEBUG: Unknown state snapshot structure")
                    return None
            else:
                print(f"DEBUG: No state snapshot found for thread {thread_id}")
                return None
        else:
            print(f"DEBUG: No checkpointer available")
            return None

    except Exception as e:
        print(f"DEBUG: Exception in _get_final_state_from_graph: {e}")
        logger.exception(
            f"[get_final_state] Error retrieving state for thread {thread_id}: {e}"
        )
        return None


def _make_event(event_type: str, data: dict[str, Any]):
    try:
        if data.get("content") == "":
            data.pop("content")

        json_data = json.dumps(data, ensure_ascii=True, separators=(",", ":"))
        return f"event: {event_type}\ndata: {json_data}\n\n"
    except Exception as e:
        logger.error(f"[event] Failed to serialize event: {e}")
        error_data = {"error": True, "message": "Failed to serialize event data"}
        json_data = json.dumps(error_data, ensure_ascii=True)
        return f"event: error\ndata: {json_data}\n\n"
