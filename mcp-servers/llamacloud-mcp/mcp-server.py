import asyncio
import json
import os
import sys
from typing import Any, Sequence

# Apply patches before importing llama_index
import apply_patches
apply_patches.apply_patches()

from mcp import server, types
from mcp.server import NotificationOptions, Server
from mcp.server.models import InitializationOptions
from llama_index.indices.managed.llama_cloud import LlamaCloudIndex


# Create the server instance
app = Server("llama-index-server")


@app.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    """List available tools."""
    return [
        types.Tool(
            name="llama_index_documentation",
            description="Search the llama-index documentation for the given query.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query",
                    }
                },
                "required": ["query"],
            },
        )
    ]


@app.call_tool()
async def handle_call_tool(
    name: str, arguments: dict[str, Any] | None
) -> list[types.TextContent]:
    """Handle tool calls."""
    if name != "llama_index_documentation":
        raise ValueError(f"Unknown tool: {name}")

    if not arguments or "query" not in arguments:
        raise ValueError("Missing required argument: query")

    query = arguments["query"]
    
    try:
        # Initialize LlamaCloud index
        api_key = os.getenv("LLAMA_CLOUD_API_KEY")
        if not api_key:
            return [
                types.TextContent(
                    type="text",
                    text="Error: LLAMA_CLOUD_API_KEY environment variable is not set",
                )
            ]
        
        # Initialize and query LlamaCloud
        index = LlamaCloudIndex(
            name="electronic-earthworm-2025-06-10",
            project_name="Default",
            organization_id="45babd25-5a3d-4d3b-8bde-6e9cfbab58c5",
            api_key=api_key,
        )
        
        # Query the index
        query_engine = index.as_query_engine()
        response = query_engine.query(query)
        
        return [
            types.TextContent(
                type="text",
                text=str(response),
            )
        ]
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        return [
            types.TextContent(
                type="text",
                text=f"Error querying LlamaCloud: {str(e)}\n\nFull error details:\n{error_details}",
            )
        ]


async def main():
    # Import here to avoid issues with event loop
    from mcp.server.stdio import stdio_server

    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="llama-index-server",
                server_version="0.1.0",
                capabilities=app.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )


if __name__ == "__main__":
    asyncio.run(main())
