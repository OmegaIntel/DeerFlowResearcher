from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from llama_index.indices.managed.llama_cloud import LlamaCloudIndex
import os
import asyncio

load_dotenv()

mcp = FastMCP('llama-index-server',port=8000)

@mcp.tool()
def llama_index_documentation(query: str) -> str:
    """Search the llama-index documentation for the given query."""

    index = LlamaCloudIndex(
        name="mcp-demo-2",
        project_name="Rando project",
        organization_id="e793a802-cb91-4e6a-bd49-61d0ba2ac5f9",
        api_key=os.getenv("LLAMA_CLOUD_API_KEY"),
    )

    response = index.as_query_engine().query(query + " Be verbose and include code examples.")

    return str(response)

if __name__ == "__main__":
    asyncio.run(mcp.run_sse_async())
