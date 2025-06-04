import logging
from fastapi import APIRouter, HTTPException
from src.server.mcp_utils import load_mcp_tools
from src.server.mcp_request import MCPServerMetadataRequest, MCPServerMetadataResponse

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/api/mcp/server/metadata", response_model=MCPServerMetadataResponse)
async def mcp_server_metadata(request: MCPServerMetadataRequest):
    try:
        timeout = request.timeout_seconds or 300
        tools = await load_mcp_tools(
            server_type=request.transport,
            command=request.command,
            args=request.args,
            url=request.url,
            env=request.env,
            timeout_seconds=timeout,
        )
        return MCPServerMetadataResponse(
            transport=request.transport,
            command=request.command,
            args=request.args,
            url=request.url,
            env=request.env,
            tools=tools,
        )
    except Exception as e:
        if not isinstance(e, HTTPException):
            logger.exception(f"MCP error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
        raise
