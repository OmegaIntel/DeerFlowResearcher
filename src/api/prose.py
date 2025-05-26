import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from src.prose.graph.builder import build_graph
from src.server.chat_request import GenerateProseRequest

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/prose/generate")
async def generate_prose(request: GenerateProseRequest):
    try:
        workflow = build_graph()
        events = workflow.astream(
            {"content": request.prompt, "option": request.option, "command": request.command},
            stream_mode="messages",
            subgraphs=True,
        )
        return StreamingResponse(
            (f"data: {event[0].content}\n\n" async for _, event in events),
            media_type="text/event-stream",
        )
    except Exception as e:
        logger.exception(f"Prose error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
