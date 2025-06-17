#!/usr/bin/env python3
"""
Pinecone MCP Server
A Model Context Protocol server for document search and Q&A using Pinecone vector database.
"""

import asyncio
import json
import os
import sys
import logging
from typing import Any, Dict, List, Optional

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import (
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
    TextContent,
    Tool,
)

# Import Pinecone tools directly to avoid dependency issues
try:
    # Import individual modules needed for Pinecone
    import pinecone
    import openai
    import numpy as np
    from typing import List, Dict, Any
    from pydantic import BaseModel
    
    # Define SearchResult model locally
    class SearchResult(BaseModel):
        text: str
        score: float
        metadata: Dict[str, Any]
        source: str
    
    # Import only the PineconeSearchTool class
    class PineconeSearchTool:
        def __init__(self):
            self._pinecone_client = None
            self._openai_client = None
            
        def _get_pinecone_client(self):
            if self._pinecone_client is None:
                api_key = os.getenv("PINECONE_API_KEY")
                if not api_key:
                    raise ValueError("PINECONE_API_KEY environment variable not set")
                self._pinecone_client = pinecone.Pinecone(api_key=api_key)
            return self._pinecone_client
        
        def _get_openai_client(self):
            if self._openai_client is None:
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise ValueError("OPENAI_API_KEY environment variable not set")
                self._openai_client = openai.OpenAI(api_key=api_key)
            return self._openai_client
        
        def _generate_embedding(self, text: str) -> List[float]:
            client = self._get_openai_client()
            response = client.embeddings.create(
                model="text-embedding-ada-002",
                input=text
            )
            return response.data[0].embedding
        
        def list_indices(self) -> List[Dict[str, Any]]:
            try:
                pc = self._get_pinecone_client()
                indices = pc.list_indexes()
                
                result = []
                for index_info in indices:
                    try:
                        index = pc.Index(index_info.name)
                        stats = index.describe_index_stats()
                        
                        result.append({
                            "name": index_info.name,
                            "dimension": index_info.dimension,
                            "metric": index_info.metric,
                            "host": index_info.host,
                            "total_vectors": stats.total_vector_count,
                            "namespaces": len(stats.namespaces) if stats.namespaces else 0
                        })
                    except Exception as e:
                        logger.warning(f"Could not get stats for index {index_info.name}: {e}")
                        result.append({
                            "name": index_info.name,
                            "dimension": index_info.dimension,
                            "metric": index_info.metric,
                            "host": index_info.host,
                            "total_vectors": 0,
                            "namespaces": 0
                        })
                
                return result
            except Exception as e:
                logger.error(f"Error listing indices: {e}")
                return []
        
        def search_documents(self, query: str, index_name: Optional[str] = None, top_k: int = 5) -> List[SearchResult]:
            try:
                pc = self._get_pinecone_client()
                query_embedding = self._generate_embedding(query)
                
                if not index_name:
                    indices = self.list_indices()
                    if not indices:
                        return []
                    
                    all_results = []
                    for index_info in indices:
                        results = self._search_single_index(
                            index_info["name"], 
                            query_embedding, 
                            top_k
                        )
                        all_results.extend(results)
                    
                    all_results.sort(key=lambda x: x.score, reverse=True)
                    return all_results[:top_k]
                else:
                    return self._search_single_index(index_name, query_embedding, top_k)
                    
            except Exception as e:
                logger.error(f"Error searching documents: {e}")
                return []
        
        def _search_single_index(self, index_name: str, query_embedding: List[float], top_k: int) -> List[SearchResult]:
            try:
                pc = self._get_pinecone_client()
                index = pc.Index(index_name)
                
                results = index.query(
                    vector=query_embedding,
                    top_k=top_k,
                    include_metadata=True,
                    include_values=False
                )
                
                search_results = []
                for match in results.matches:
                    metadata = match.metadata or {}
                    search_results.append(SearchResult(
                        text=metadata.get("text", ""),
                        score=match.score,
                        metadata=metadata,
                        source=f"{index_name}/{metadata.get('filename', 'unknown')}"
                    ))
                
                return search_results
                
            except Exception as e:
                logger.error(f"Error searching index {index_name}: {e}")
                return []
        
        def query_knowledge_base(self, question: str, indices: Optional[List[str]] = None, context_window: int = 3) -> Dict[str, Any]:
            try:
                search_results = self.search_documents(
                    query=question,
                    index_name=indices[0] if indices and len(indices) == 1 else None,
                    top_k=context_window * 2
                )
                
                if not search_results:
                    return {
                        "answer": "I couldn't find any relevant information in the knowledge base to answer your question.",
                        "sources": [],
                        "confidence": 0.0
                    }
                
                relevant_chunks = search_results[:context_window]
                
                context_parts = []
                sources = []
                
                for i, result in enumerate(relevant_chunks):
                    context_parts.append(f"[Source {i+1}]: {result.text}")
                    sources.append({
                        "source": result.source,
                        "score": result.score,
                        "metadata": result.metadata
                    })
                
                context = "\n\n".join(context_parts)
                
                client = self._get_openai_client()
                
                prompt = f"""Based on the following context from the knowledge base, please answer the question.
If the context doesn't contain enough information to answer the question, say so.

Context:
{context}

Question: {question}

Answer:"""
                
                response = client.chat.completions.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that answers questions based on the provided context. Be accurate and cite sources when possible."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=500
                )
                
                answer = response.choices[0].message.content
                avg_score = float(np.mean([r.score for r in relevant_chunks]))
                
                return {
                    "answer": answer,
                    "sources": sources,
                    "confidence": avg_score,
                    "chunks_used": len(relevant_chunks)
                }
                
            except Exception as e:
                logger.error(f"Error querying knowledge base: {e}")
                return {
                    "answer": f"An error occurred while querying the knowledge base: {str(e)}",
                    "sources": [],
                    "confidence": 0.0
                }
    
except ImportError as e:
    print(f"Error importing dependencies: {e}", file=sys.stderr)
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the MCP server
server = Server("pinecone-mcp")

# Global Pinecone tool instance
pinecone_tool: Optional[PineconeSearchTool] = None


def initialize_pinecone_tool():
    """Initialize the Pinecone search tool"""
    global pinecone_tool
    
    try:
        # Check for required environment variables
        if not os.getenv("PINECONE_API_KEY"):
            logger.error("PINECONE_API_KEY environment variable not set")
            return False
            
        if not os.getenv("OPENAI_API_KEY"):
            logger.error("OPENAI_API_KEY environment variable not set")
            return False
        
        pinecone_tool = PineconeSearchTool()
        logger.info("Pinecone tool initialized successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Pinecone tool: {e}")
        return False


@server.list_tools()
async def handle_list_tools() -> ListToolsResult:
    """List available Pinecone tools"""
    
    tools = [
        Tool(
            name="search_documents",
            description="Search through uploaded documents using semantic similarity. Returns relevant document chunks with sources and scores.",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural language search query"
                    },
                    "index_name": {
                        "type": "string",
                        "description": "Optional: specific index to search. If not provided, searches all indices"
                    },
                    "top_k": {
                        "type": "integer",
                        "description": "Number of results to return (default: 5)",
                        "default": 5
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="query_knowledge_base", 
            description="Answer questions using RAG (Retrieval-Augmented Generation) over uploaded documents. Provides comprehensive answers with sources and confidence scores.",
            inputSchema={
                "type": "object",
                "properties": {
                    "question": {
                        "type": "string",
                        "description": "Question to answer based on uploaded documents"
                    },
                    "index_name": {
                        "type": "string",
                        "description": "Optional: specific index to search. If not provided, searches all indices"
                    },
                    "context_chunks": {
                        "type": "integer",
                        "description": "Number of relevant chunks to use as context (default: 3)",
                        "default": 3
                    }
                },
                "required": ["question"]
            }
        ),
        Tool(
            name="list_indices",
            description="List all available document indices/collections with statistics like vector counts and metadata.",
            inputSchema={
                "type": "object",
                "properties": {},
                "required": []
            }
        )
    ]
    
    return ListToolsResult(tools=tools)


@server.call_tool()
async def handle_call_tool(request: CallToolRequest) -> CallToolResult:
    """Handle tool execution requests"""
    
    if not pinecone_tool:
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text="Error: Pinecone tool not initialized. Please check API keys."
                )
            ],
            isError=True
        )
    
    try:
        tool_name = request.params.name
        arguments = request.params.arguments or {}
        
        logger.info(f"Executing tool: {tool_name} with arguments: {arguments}")
        
        if tool_name == "search_documents":
            # Extract parameters
            query = arguments.get("query")
            if not query:
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text", 
                            text="Error: 'query' parameter is required"
                        )
                    ],
                    isError=True
                )
            
            index_name = arguments.get("index_name")
            top_k = arguments.get("top_k", 5)
            
            # Perform search
            results = pinecone_tool.search_documents(
                query=query,
                index_name=index_name,
                top_k=top_k
            )
            
            if not results:
                response_text = f"No relevant documents found for query: '{query}'"
            else:
                response_parts = [f"Found {len(results)} relevant documents for: '{query}'\n"]
                
                for i, result in enumerate(results, 1):
                    response_parts.append(f"{i}. **Source**: {result.source}")
                    response_parts.append(f"   **Relevance Score**: {result.score:.3f}")
                    response_parts.append(f"   **Content**: {result.text[:200]}...")
                    response_parts.append("")
                
                response_text = "\n".join(response_parts)
            
            return CallToolResult(
                content=[TextContent(type="text", text=response_text)]
            )
        
        elif tool_name == "query_knowledge_base":
            # Extract parameters
            question = arguments.get("question")
            if not question:
                return CallToolResult(
                    content=[
                        TextContent(
                            type="text",
                            text="Error: 'question' parameter is required"
                        )
                    ],
                    isError=True
                )
            
            index_name = arguments.get("index_name")
            context_chunks = arguments.get("context_chunks", 3)
            
            # Perform Q&A
            indices = [index_name] if index_name else None
            result = pinecone_tool.query_knowledge_base(
                question=question,
                indices=indices,
                context_window=context_chunks
            )
            
            # Format response
            response_parts = [
                f"**Question**: {question}\n",
                f"**Answer**: {result['answer']}\n"
            ]
            
            if result['sources']:
                response_parts.append("**Sources**:")
                for i, source in enumerate(result['sources'], 1):
                    response_parts.append(f"{i}. {source['source']} (relevance: {source['score']:.3f})")
                response_parts.append("")
            
            response_parts.append(f"**Confidence**: {result['confidence']:.2%}")
            response_parts.append(f"**Chunks Used**: {result.get('chunks_used', 0)}")
            
            response_text = "\n".join(response_parts)
            
            return CallToolResult(
                content=[TextContent(type="text", text=response_text)]
            )
        
        elif tool_name == "list_indices":
            # List available indices
            indices = pinecone_tool.list_indices()
            
            if not indices:
                response_text = "No document indices found. Upload some documents first."
            else:
                response_parts = [f"Available Document Collections ({len(indices)} total):\n"]
                
                for i, index in enumerate(indices, 1):
                    response_parts.append(f"{i}. **{index['name']}**")
                    response_parts.append(f"   - Vectors: {index['total_vectors']:,}")
                    response_parts.append(f"   - Dimension: {index['dimension']}")
                    response_parts.append(f"   - Metric: {index['metric']}")
                    response_parts.append("")
                
                response_text = "\n".join(response_parts)
            
            return CallToolResult(
                content=[TextContent(type="text", text=response_text)]
            )
        
        else:
            return CallToolResult(
                content=[
                    TextContent(
                        type="text",
                        text=f"Error: Unknown tool '{tool_name}'"
                    )
                ],
                isError=True
            )
    
    except Exception as e:
        logger.error(f"Error executing tool {request.params.name}: {e}")
        return CallToolResult(
            content=[
                TextContent(
                    type="text",
                    text=f"Error executing tool: {str(e)}"
                )
            ],
            isError=True
        )


async def main():
    """Main entry point for the MCP server"""
    
    logger.info("Starting Pinecone MCP Server...")
    
    # Initialize Pinecone tool
    if not initialize_pinecone_tool():
        logger.error("Failed to initialize Pinecone tool. Exiting.")
        sys.exit(1)
    
    logger.info("Pinecone MCP Server started successfully")
    
    # Run the server using stdio transport
    from mcp.server.stdio import stdio_server
    
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream=read_stream,
            write_stream=write_stream,
            initialization_options=InitializationOptions(
                server_name="pinecone-mcp",
                server_version="1.0.0",
                capabilities={
                    "tools": {}
                }
            )
        )


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)