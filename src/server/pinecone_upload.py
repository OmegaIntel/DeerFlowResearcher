import asyncio
import uuid
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import tempfile
import PyPDF2
import docx
from io import BytesIO

logger = logging.getLogger(__name__)

class UploadStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class PineconeUploadJob:
    def __init__(self, job_id: str, files: List[str], user_id: Optional[str] = None):
        self.job_id = job_id
        self.files = files
        self.user_id = user_id
        self.status = UploadStatus.PENDING
        self.created_at = datetime.now()
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.progress = 0
        self.message = "Upload queued"
        self.result: Optional[Dict[str, Any]] = None
        self.error: Optional[str] = None
        self.index_name: Optional[str] = None
        self.index_host: Optional[str] = None
        self.vectors_upserted: int = 0

class PineconeUploadQueue:
    def __init__(self):
        self.jobs: Dict[str, PineconeUploadJob] = {}
        self.queue: asyncio.Queue = asyncio.Queue()
        self.workers: List[asyncio.Task] = []
        self.running = False
        self._pinecone_client = None
        self._openai_client = None
        
    def _get_pinecone_client(self):
        """Initialize Pinecone client"""
        if self._pinecone_client is None:
            try:
                from pinecone import Pinecone
                api_key = os.getenv("PINECONE_API_KEY")
                if not api_key:
                    raise Exception("PINECONE_API_KEY not found in environment variables")
                self._pinecone_client = Pinecone(api_key=api_key)
                logger.info("Pinecone client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Pinecone client: {e}")
                raise
        return self._pinecone_client
    
    def _get_openai_client(self):
        """Initialize OpenAI client for embeddings"""
        if self._openai_client is None:
            try:
                from openai import OpenAI
                api_key = os.getenv("OPENAI_API_KEY")
                if not api_key:
                    raise Exception("OPENAI_API_KEY not found in environment variables")
                self._openai_client = OpenAI(api_key=api_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                raise
        return self._openai_client
    
    async def start_workers(self, num_workers: int = 2):
        """Start background worker tasks"""
        if self.running:
            return
            
        self.running = True
        for i in range(num_workers):
            worker = asyncio.create_task(self._worker(f"pinecone-worker-{i}"))
            self.workers.append(worker)
        logger.info(f"Started {num_workers} Pinecone upload workers")
    
    async def stop_workers(self):
        """Stop all background workers"""
        self.running = False
        for worker in self.workers:
            worker.cancel()
        await asyncio.gather(*self.workers, return_exceptions=True)
        self.workers.clear()
        logger.info("Stopped all Pinecone upload workers")
    
    async def add_upload_job(self, files: List[str], user_id: Optional[str] = None) -> str:
        """Add a new upload job to the queue"""
        job_id = str(uuid.uuid4())
        job = PineconeUploadJob(job_id, files, user_id)
        self.jobs[job_id] = job
        await self.queue.put(job)
        logger.info(f"Added Pinecone upload job {job_id} with {len(files)} files")
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific job"""
        job = self.jobs.get(job_id)
        if not job:
            return None
            
        return {
            "job_id": job.job_id,
            "status": job.status.value,
            "progress": job.progress,
            "message": job.message,
            "created_at": job.created_at.isoformat(),
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "files": job.files,
            "index_name": job.index_name,
            "index_host": job.index_host,
            "vectors_upserted": job.vectors_upserted,
            "result": job.result,
            "error": job.error
        }
    
    def list_jobs(self, user_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """List recent jobs, optionally filtered by user"""
        jobs = list(self.jobs.values())
        if user_id:
            jobs = [job for job in jobs if job.user_id == user_id]
        
        # Sort by creation time, most recent first
        jobs.sort(key=lambda x: x.created_at, reverse=True)
        return [self.get_job_status(job.job_id) for job in jobs[:limit]]
    
    def _extract_text_from_file(self, file_path: str) -> str:
        """Extract text content from various file types"""
        filename = os.path.basename(file_path).lower()
        text = ""
        
        try:
            if filename.endswith('.pdf'):
                with open(file_path, 'rb') as file:
                    pdf_reader = PyPDF2.PdfReader(file)
                    for page in pdf_reader.pages:
                        text += page.extract_text() + "\n"
                        
            elif filename.endswith('.docx'):
                doc = docx.Document(file_path)
                for paragraph in doc.paragraphs:
                    text += paragraph.text + "\n"
                    
            elif filename.endswith(('.txt', '.md')):
                with open(file_path, 'r', encoding='utf-8') as file:
                    text = file.read()
                    
            else:
                # Try to read as text file
                with open(file_path, 'r', encoding='utf-8') as file:
                    text = file.read()
                    
        except Exception as e:
            logger.error(f"Error extracting text from {filename}: {e}")
            text = f"Error extracting text from {filename}"
            
        return text.strip()
    
    def _chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            
            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk.rfind('.')
                last_newline = chunk.rfind('\n')
                break_point = max(last_period, last_newline)
                
                if break_point > start + chunk_size // 2:
                    chunk = text[start:start + break_point + 1]
                    end = start + break_point + 1
            
            chunks.append(chunk.strip())
            start = end - overlap
            
        return [chunk for chunk in chunks if chunk.strip()]
    
    async def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for text chunks using OpenAI"""
        client = self._get_openai_client()
        
        # Process in batches to avoid rate limits
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                response = client.embeddings.create(
                    model="text-embedding-ada-002",
                    input=batch
                )
                
                batch_embeddings = [data.embedding for data in response.data]
                all_embeddings.extend(batch_embeddings)
                
            except Exception as e:
                logger.error(f"Error generating embeddings for batch {i//batch_size + 1}: {e}")
                # Add zero vectors as fallback
                zero_vector = [0.0] * 1536  # text-embedding-ada-002 dimension
                all_embeddings.extend([zero_vector] * len(batch))
        
        return all_embeddings
    
    async def _worker(self, worker_name: str):
        """Background worker that processes upload jobs"""
        logger.info(f"Pinecone upload worker {worker_name} started")
        
        while self.running:
            try:
                # Wait for a job with timeout
                job = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                await self._process_job(job, worker_name)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Worker {worker_name} error: {e}", exc_info=True)
                
        logger.info(f"Pinecone upload worker {worker_name} stopped")
    
    async def _process_job(self, job: PineconeUploadJob, worker_name: str):
        """Process a single upload job"""
        logger.info(f"Worker {worker_name} processing Pinecone job {job.job_id}")
        
        try:
            job.status = UploadStatus.PROCESSING
            job.started_at = datetime.now()
            job.message = "Processing files..."
            job.progress = 10
            
            # Generate unique index name with Pinecone naming requirements
            # Must be lowercase alphanumeric or dashes only, max 45 chars
            timestamp = datetime.now().strftime("%m%d%H%M")  # Shorter timestamp
            unique_suffix = str(uuid.uuid4()).replace('-', '')[:6]  # Shorter suffix
            index_name = f"df-{timestamp}-{unique_suffix}".lower()  # Shorter prefix
            job.index_name = index_name
            job.progress = 20
            
            print(f"DEBUG: Generated index name: '{index_name}' (length: {len(index_name)})")
            logger.info(f"Generated index name: '{index_name}' (length: {len(index_name)})")
            
            # Validate the name meets Pinecone requirements
            if not index_name.replace('-', '').isalnum() or len(index_name) > 45:
                print(f"DEBUG: Invalid index name: {index_name}")
                logger.error(f"Invalid index name: {index_name}")
                raise Exception(f"Generated invalid index name: {index_name}")
            
            # Initialize Pinecone client
            pc = self._get_pinecone_client()
            job.message = "Creating Pinecone index..."
            job.progress = 30
            
            # Create index with OpenAI embedding dimensions
            try:
                print(f"DEBUG: About to create Pinecone index with name: '{index_name}'")
                print(f"DEBUG: Index name validation: alphanumeric+dash only: {index_name.replace('-', '').isalnum()}, length: {len(index_name)}")
                logger.info(f"About to create Pinecone index with name: '{index_name}'")
                logger.info(f"Index name validation: alphanumeric+dash only: {index_name.replace('-', '').isalnum()}, length: {len(index_name)}")
                
                # Try different index creation approaches
                try:
                    # First try serverless spec
                    from pinecone import ServerlessSpec
                    pc.create_index(
                        name=index_name,
                        dimension=1536,
                        metric="cosine",
                        spec=ServerlessSpec(
                            cloud="aws",
                            region="us-east-1"
                        )
                    )
                except Exception as spec_error:
                    logger.warning(f"Serverless spec failed: {spec_error}")
                    # Try pod-based spec as fallback
                    from pinecone import PodSpec
                    pc.create_index(
                        name=index_name,
                        dimension=1536,
                        metric="cosine",
                        spec=PodSpec(
                            environment="us-east-1-aws",
                            pod_type="p1.x1"
                        )
                    )
                logger.info(f"Successfully created Pinecone index: {index_name}")
                
                # Wait for index to be ready
                import time
                time.sleep(10)
                
            except Exception as e:
                if "already exists" in str(e).lower():
                    logger.info(f"Index {index_name} already exists, continuing...")
                else:
                    raise e
            
            # Get index connection
            index = pc.Index(index_name)
            job.index_host = str(index._config.host)
            job.progress = 40
            
            # Process each file
            job.message = "Extracting text and generating embeddings..."
            all_vectors = []
            
            for i, file_path in enumerate(job.files):
                try:
                    filename = os.path.basename(file_path)
                    logger.info(f"Processing file: {filename}")
                    
                    # Extract text
                    text = self._extract_text_from_file(file_path)
                    if not text:
                        logger.warning(f"No text extracted from {filename}")
                        continue
                    
                    # Chunk text
                    chunks = self._chunk_text(text)
                    logger.info(f"Split {filename} into {len(chunks)} chunks")
                    
                    # Generate embeddings
                    embeddings = await self._get_embeddings(chunks)
                    
                    # Create vectors for upsert
                    for j, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                        vector_id = f"{filename}_{j}_{uuid.uuid4().hex[:8]}"
                        vector = {
                            "id": vector_id,
                            "values": embedding,
                            "metadata": {
                                "filename": filename,
                                "chunk_index": j,
                                "text": chunk,
                                "job_id": job.job_id,
                                "upload_time": datetime.now().isoformat()
                            }
                        }
                        all_vectors.append(vector)
                    
                    # Update progress
                    progress = 40 + (40 * (i + 1) / len(job.files))
                    job.progress = int(progress)
                    
                except Exception as file_error:
                    logger.error(f"Error processing {filename}: {file_error}")
                    continue
            
            # Upsert vectors to Pinecone
            if all_vectors:
                job.message = f"Uploading {len(all_vectors)} vectors to Pinecone..."
                job.progress = 80
                
                # Upsert in batches
                batch_size = 100
                for i in range(0, len(all_vectors), batch_size):
                    batch = all_vectors[i:i + batch_size]
                    try:
                        index.upsert(vectors=batch)
                        logger.info(f"Upserted batch {i//batch_size + 1}/{(len(all_vectors) + batch_size - 1)//batch_size}")
                    except Exception as e:
                        logger.error(f"Error upserting batch {i//batch_size + 1}: {e}")
                
                job.vectors_upserted = len(all_vectors)
                logger.info(f"Successfully upserted {len(all_vectors)} vectors to index {index_name}")
            
            # Job completed successfully
            job.status = UploadStatus.COMPLETED
            job.completed_at = datetime.now()
            job.progress = 100
            job.message = f"Successfully created Pinecone index: {index_name}\nUploaded {len(job.files)} files, {job.vectors_upserted} vectors"
            
            job.result = {
                "index_name": job.index_name,
                "index_host": job.index_host,
                "files_processed": len(job.files),
                "vectors_upserted": job.vectors_upserted,
                "chunks_created": len(all_vectors)
            }
            
            logger.info(f"Job {job.job_id} completed successfully - Index: {index_name}, Vectors: {job.vectors_upserted}")
            
        except Exception as e:
            # Job failed
            job.status = UploadStatus.FAILED
            job.completed_at = datetime.now()
            job.progress = 0
            job.error = str(e)
            job.message = f"Upload failed: {str(e)}"
            logger.error(f"Job {job.job_id} failed: {e}", exc_info=True)

# Global upload queue instance
pinecone_upload_queue = PineconeUploadQueue()