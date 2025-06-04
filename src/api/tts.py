import os, base64, logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from src.server.chat_request import TTSRequest
from src.tools import VolcengineTTS

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/tts")
async def text_to_speech(request: TTSRequest):
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

        tts_client = VolcengineTTS(
            appid=app_id,
            access_token=access_token,
            cluster=os.getenv("VOLCENGINE_TTS_CLUSTER", "volcano_tts"),
            voice_type=os.getenv("VOLCENGINE_TTS_VOICE_TYPE", "BV700_V2_streaming"),
        )

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

        audio_data = base64.b64decode(result["audio_data"])
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
        logger.exception(f"TTS error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
