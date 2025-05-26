import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from src.podcast.graph.builder import build_graph
from src.server.chat_request import GeneratePodcastRequest

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/podcast/generate")
async def generate_podcast(request: GeneratePodcastRequest):
    try:
        workflow = build_graph()
        final_state = workflow.invoke({"input": request.content})
        return Response(content=final_state["output"], media_type="audio/mp3")
    except Exception as e:
        logger.exception(f"Podcast error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
