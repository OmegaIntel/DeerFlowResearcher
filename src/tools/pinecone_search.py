"""
Pinecone search tool for querying documents stored in Pinecone vector database.
"""

import os
import logging
from typing import List, Dict, Any, Optional, Union
from pydantic import BaseModel, Field
from langchain_core.tools import tool
from pinecone import Pinecone
from openai import OpenAI
import numpy as np

logger = logging.getLogger(__name__)


class SearchResult(BaseModel):
    """Represents a search result from Pinecone"""
    text: str
    score: float
    metadata: Dict[str, Any]
    source: str


class PineconeSearchTool:
    """Tool for searching documents in Pinecone vector database"""
    
    def __init__(self):
        self._pinecone_client = None
        self._openai_client = None
        
    def _get_pinecone_client(self):
        """Initialize Pinecone client"""
        if self._pinecone_client is None:
            api_key = os.getenv("PINECONE_API_KEY")
            if not api_key:
                raise ValueError("PINECONE_API_KEY environment variable not set")
            self._pinecone_client = Pinecone(api_key=api_key)
        return self._pinecone_client
    
    def _get_openai_client(self):
        """Initialize OpenAI client for embeddings"""
        if self._openai_client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            self._openai_client = OpenAI(api_key=api_key)
        return self._openai_client
    
    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for text using OpenAI"""
        client = self._get_openai_client()
        response = client.embeddings.create(
            model="text-embedding-ada-002",
            input=text
        )
        return response.data[0].embedding
    
    def list_indices(self) -> List[Dict[str, Any]]:
        """List all available Pinecone indices"""
        try:
            pc = self._get_pinecone_client()
            indices = pc.list_indexes()
            
            result = []
            for index_info in indices:
                # Get detailed stats for each index
                index = pc.Index(index_info.name)
                stats = index.describe_index_stats()
                
                result.append({
                    "name": index_info.name,
                    "dimension": index_info.dimension,
                    "metric": index_info.metric,
                    "host": index_info.host,
                    "total_vectors": stats.total_vector_count,
                    "namespaces": stats.namespaces
                })
            
            return result
        except Exception as e:
            logger.error(f"Error listing indices: {e}")
            return []
    
    def search_documents(
        self, 
        query: str, 
        index_name: Optional[str] = None, 
        top_k: int = 5,
        filter: Optional[Dict[str, Any]] = None,
        include_metadata: bool = True
    ) -> List[SearchResult]:
        """
        Search for documents in Pinecone using natural language query
        
        Args:
            query: Natural language query
            index_name: Specific index to search (if None, searches all available indices)
            top_k: Number of results to return
            filter: Metadata filter for search
            include_metadata: Whether to include metadata in results
            
        Returns:
            List of search results with text, score, and metadata
        """
        try:
            pc = self._get_pinecone_client()
            
            # Generate embedding for query
            query_embedding = self._generate_embedding(query)
            
            # If no index specified, search all indices
            if not index_name:
                indices = self.list_indices()
                if not indices:
                    return []
                
                # Search across all indices and combine results
                all_results = []
                for index_info in indices:
                    results = self._search_single_index(
                        index_info["name"], 
                        query_embedding, 
                        top_k, 
                        filter,
                        include_metadata
                    )
                    all_results.extend(results)
                
                # Sort by score and return top k
                all_results.sort(key=lambda x: x.score, reverse=True)
                return all_results[:top_k]
            else:
                # Search specific index
                return self._search_single_index(
                    index_name, 
                    query_embedding, 
                    top_k, 
                    filter,
                    include_metadata
                )
                
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    def _search_single_index(
        self, 
        index_name: str, 
        query_embedding: List[float], 
        top_k: int,
        filter: Optional[Dict[str, Any]],
        include_metadata: bool
    ) -> List[SearchResult]:
        """Search a single Pinecone index"""
        try:
            pc = self._get_pinecone_client()
            index = pc.Index(index_name)
            
            # Perform search
            results = index.query(
                vector=query_embedding,
                top_k=top_k,
                filter=filter,
                include_metadata=include_metadata,
                include_values=False
            )
            
            # Convert results to SearchResult objects
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
    
    def query_knowledge_base(
        self, 
        question: str, 
        indices: Optional[List[str]] = None,
        context_window: int = 3
    ) -> Dict[str, Any]:
        """
        Answer a question using knowledge from Pinecone indices
        
        Args:
            question: The question to answer
            indices: Specific indices to search (if None, searches all)
            context_window: Number of relevant chunks to use for context
            
        Returns:
            Dict containing answer, sources, and confidence
        """
        try:
            # Search for relevant documents
            search_results = self.search_documents(
                query=question,
                index_name=indices[0] if indices and len(indices) == 1 else None,
                top_k=context_window * 2  # Get more results for better context
            )
            
            if not search_results:
                return {
                    "answer": "I couldn't find any relevant information in the knowledge base to answer your question.",
                    "sources": [],
                    "confidence": 0.0
                }
            
            # Take top results based on context window
            relevant_chunks = search_results[:context_window]
            
            # Build context from relevant chunks
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
            
            # Generate answer using OpenAI
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
            
            # Calculate confidence based on search scores
            avg_score = np.mean([r.score for r in relevant_chunks])
            confidence = float(avg_score)
            
            return {
                "answer": answer,
                "sources": sources,
                "confidence": confidence,
                "chunks_used": len(relevant_chunks)
            }
            
        except Exception as e:
            logger.error(f"Error querying knowledge base: {e}")
            return {
                "answer": f"An error occurred while querying the knowledge base: {str(e)}",
                "sources": [],
                "confidence": 0.0
            }


# Create tool instances
pinecone_tool = PineconeSearchTool()


@tool
def search_pinecone_documents(
    query: str,
    index_name: Optional[str] = None,
    top_k: int = 5
) -> str:
    """
    Search for documents in Pinecone vector database using natural language.
    
    Args:
        query: Natural language search query
        index_name: Optional - specific index to search. If not provided, searches all indices
        top_k: Number of results to return (default: 5)
    
    Returns:
        Formatted search results with relevant document chunks and metadata
    """
    results = pinecone_tool.search_documents(query, index_name, top_k)
    
    if not results:
        return "No relevant documents found for your query."
    
    output = f"Found {len(results)} relevant documents:\n\n"
    
    for i, result in enumerate(results, 1):
        output += f"{i}. Source: {result.source} (Score: {result.score:.3f})\n"
        output += f"   {result.text[:200]}...\n\n"
    
    return output


@tool
def list_pinecone_indices() -> str:
    """
    List all available Pinecone indices and their statistics.
    
    Returns:
        Information about available indices including vector counts and metadata
    """
    indices = pinecone_tool.list_indices()
    
    if not indices:
        return "No Pinecone indices found or unable to connect to Pinecone."
    
    output = f"Available Pinecone indices ({len(indices)} total):\n\n"
    
    for index in indices:
        output += f"• {index['name']}\n"
        output += f"  - Dimension: {index['dimension']}\n"
        output += f"  - Total vectors: {index['total_vectors']}\n"
        output += f"  - Host: {index['host']}\n\n"
    
    return output


@tool
def answer_from_knowledge_base(
    question: str,
    index_name: Optional[str] = None,
    context_chunks: int = 3
) -> str:
    """
    Answer a question using documents stored in Pinecone knowledge base.
    Uses RAG (Retrieval-Augmented Generation) to provide accurate answers.
    
    Args:
        question: The question to answer
        index_name: Optional - specific index to search. If not provided, searches all indices
        context_chunks: Number of relevant document chunks to use as context (default: 3)
    
    Returns:
        Answer to the question with sources and confidence level
    """
    indices = [index_name] if index_name else None
    result = pinecone_tool.query_knowledge_base(question, indices, context_chunks)
    
    output = f"Answer: {result['answer']}\n\n"
    
    if result['sources']:
        output += f"Sources (used {result['chunks_used']} chunks):\n"
        for i, source in enumerate(result['sources'], 1):
            output += f"{i}. {source['source']} (relevance: {source['score']:.3f})\n"
    
    output += f"\nConfidence: {result['confidence']:.2%}"
    
    return output


# Export tools for use by agents
__all__ = [
    'search_pinecone_documents',
    'list_pinecone_indices', 
    'answer_from_knowledge_base',
    'PineconeSearchTool'
]