import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from src.ppt.graph.builder import build_graph
from src.server.chat_request import GeneratePPTRequest

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/ppt/generate")
async def generate_ppt(request: GeneratePPTRequest):
    try:
        workflow = build_graph()
        final_state = workflow.invoke({"input": request.content})
        with open(final_state["generated_file_path"], "rb") as f:
            ppt_bytes = f.read()
        return Response(
            content=ppt_bytes,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )
    except Exception as e:
        logger.exception(f"PPT error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
