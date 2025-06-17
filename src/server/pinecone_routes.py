print("DEBUG: Starting pinecone_routes.py import")

from fastapi import APIRouter, HTTPException, File, UploadFile
from typing import List, Optional
from pydantic import BaseModel
import tempfile
import os
import logging
from .pinecone_upload import pinecone_upload_queue

print("DEBUG: Imports completed")

logger = logging.getLogger(__name__)
router = APIRouter()

print("DEBUG: Router created")


class QueryRequest(BaseModel):
    question: str
    index_name: Optional[str] = None
    context_chunks: int = 3


class SearchRequest(BaseModel):
    query: str
    index_name: Optional[str] = None
    top_k: int = 5

@router.post("/upload")
async def upload_files_to_pinecone(files: List[UploadFile] = File(...)):
    """Upload files to Pinecone for vector storage and search"""
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        # Save uploaded files temporarily
        saved_files = []
        for file in files:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{file.filename}")
            try:
                content = await file.read()
                temp_file.write(content)
                temp_file.close()
                saved_files.append(temp_file.name)
                logger.info(f"Saved temporary file: {file.filename} -> {temp_file.name}")
            except Exception as e:
                logger.error(f"Error saving file {file.filename}: {e}")
                # Clean up any files we've saved so far
                for saved_file in saved_files:
                    try:
                        os.unlink(saved_file)
                    except:
                        pass
                raise HTTPException(status_code=500, detail=f"Error saving file {file.filename}: {str(e)}")
        
        # Add job to background queue
        job_id = await pinecone_upload_queue.add_upload_job(saved_files)
        
        return {
            "success": True,
            "job_id": job_id,
            "message": f"Upload job created with {len(files)} files. Processing in background...",
            "files_uploaded": [file.filename for file in files],
            "status_url": f"/api/pinecone/status/{job_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in upload endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/status/{job_id}")
async def get_upload_status(job_id: str):
    """Get the status of a specific upload job"""
    try:
        status = pinecone_upload_queue.get_job_status(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting job status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error getting status: {str(e)}")

@router.get("/jobs")
async def list_upload_jobs(limit: int = 50):
    """List recent upload jobs"""
    try:
        jobs = pinecone_upload_queue.list_jobs(limit=limit)
        return {"jobs": jobs}
    except Exception as e:
        logger.error(f"Error listing jobs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing jobs: {str(e)}")

@router.get("/indices")
async def list_pinecone_indices():
    """List available Pinecone indices"""
    try:
        from pinecone import Pinecone
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="PINECONE_API_KEY not configured")
        
        pc = Pinecone(api_key=api_key)
        indices = pc.list_indexes()
        
        result = []
        for index_info in indices:
            result.append({
                "name": index_info.name,
                "dimension": index_info.dimension,
                "metric": index_info.metric,
                "host": index_info.host,
                "status": index_info.status.get("ready", False) if index_info.status else False
            })
        
        return {"indices": result}
    except Exception as e:
        logger.error(f"Error listing Pinecone indices: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error listing indices: {str(e)}")

@router.post("/search")
async def search_vectors(query: str, index_name: str, top_k: int = 5):
    """Search vectors in a Pinecone index"""
    try:
        from pinecone import Pinecone
        from openai import OpenAI
        
        # Get API keys
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not pinecone_api_key:
            raise HTTPException(status_code=500, detail="PINECONE_API_KEY not configured")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        
        # Generate embedding for query
        openai_client = OpenAI(api_key=openai_api_key)
        embedding_response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=query
        )
        query_embedding = embedding_response.data[0].embedding
        
        # Search in Pinecone
        pc = Pinecone(api_key=pinecone_api_key)
        index = pc.Index(index_name)
        
        search_results = index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True
        )
        
        # Format results
        results = []
        for match in search_results.matches:
            results.append({
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata
            })
        
        return {
            "query": query,
            "index_name": index_name,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error searching vectors: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

print("DEBUG: After /search route")

print("DEBUG: About to register /query route")

@router.post("/query")
async def query_knowledge_base(request: QueryRequest):
    """Answer questions using RAG over documents stored in Pinecone"""
    try:
        from pinecone import Pinecone
        from openai import OpenAI
        import numpy as np
        
        # Get API keys
        pinecone_api_key = os.getenv("PINECONE_API_KEY")
        openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if not pinecone_api_key:
            raise HTTPException(status_code=500, detail="PINECONE_API_KEY not configured")
        if not openai_api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
        
        # Initialize clients
        pc = Pinecone(api_key=pinecone_api_key)
        openai_client = OpenAI(api_key=openai_api_key)
        
        # Generate embedding for question
        embedding_response = openai_client.embeddings.create(
            model="text-embedding-ada-002",
            input=request.question
        )
        query_embedding = embedding_response.data[0].embedding
        
        # Search across indices
        all_results = []
        indices_to_search = []
        
        if request.index_name:
            indices_to_search = [request.index_name]
        else:
            # Get all available indices
            indices_info = pc.list_indexes()
            indices_to_search = [idx.name for idx in indices_info]
        
        for index_name in indices_to_search:
            try:
                index = pc.Index(index_name)
                search_results = index.query(
                    vector=query_embedding,
                    top_k=request.context_chunks * 2,  # Get more results for better context
                    include_metadata=True,
                    include_values=False
                )
                
                for match in search_results.matches:
                    metadata = match.metadata or {}
                    all_results.append({
                        "text": metadata.get("text", ""),
                        "score": match.score,
                        "source": f"{index_name}/{metadata.get('filename', 'unknown')}",
                        "metadata": metadata
                    })
            except Exception as e:
                logger.warning(f"Error searching index {index_name}: {e}")
                continue
        
        if not all_results:
            return {
                "question": request.question,
                "answer": "I couldn't find any relevant information in the knowledge base to answer your question.",
                "sources": [],
                "confidence": 0.0,
                "chunks_used": 0
            }
        
        # Sort by score and take top results
        all_results.sort(key=lambda x: x["score"], reverse=True)
        relevant_chunks = all_results[:request.context_chunks]
        
        # Build context from relevant chunks
        context_parts = []
        sources = []
        
        for i, result in enumerate(relevant_chunks):
            context_parts.append(f"[Source {i+1}]: {result['text']}")
            sources.append({
                "source": result["source"],
                "score": result["score"],
                "metadata": result["metadata"]
            })
        
        context = "\n\n".join(context_parts)
        
        # Generate answer using OpenAI
        prompt = f"""Based on the following context from the knowledge base, please answer the question.
If the context doesn't contain enough information to answer the question, say so.

Context:
{context}

Question: {request.question}

Answer:"""
        
        response = openai_client.chat.completions.create(
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
        avg_score = float(np.mean([r["score"] for r in relevant_chunks]))
        
        return {
            "question": request.question,
            "answer": answer,
            "sources": sources,
            "confidence": avg_score,
            "chunks_used": len(relevant_chunks)
        }
        
    except Exception as e:
        logger.error(f"Error querying knowledge base: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Query failed: {str(e)}")

print("DEBUG: Successfully registered /query route")