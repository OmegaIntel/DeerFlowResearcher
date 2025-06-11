from fastapi import APIRouter, HTTPException, File, UploadFile
from typing import List
import tempfile
import os
import logging
from .pinecone_upload import pinecone_upload_queue

logger = logging.getLogger(__name__)
router = APIRouter()

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