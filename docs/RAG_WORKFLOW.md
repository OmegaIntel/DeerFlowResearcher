# RAG (Retrieval-Augmented Generation) Workflow Documentation

## Overview
The application implements a comprehensive RAG system that allows users to upload documents and have AI-powered conversations with context from those documents.

## Architecture Components

### 1. Document Storage (S3)
- **Service**: Amazon S3
- **Structure**: `uploads/{user_id}/{file_id}/{filename}`
- **Purpose**: Long-term storage of original documents
- **Access**: Pre-signed URLs for secure downloads

### 2. Database (MySQL)
- **Table**: `documents`
- **Key Fields**:
  - `id`: Unique document identifier
  - `user_id`: Document owner
  - `session_id`: Optional session association
  - `s3_bucket`, `s3_key`: S3 location
  - `processing_status`: tracks processing state
  - `chunks_created`, `vectors_created`: processing metrics
  - `pinecone_index`: vector index name

### 3. Vector Database (Pinecone)
- **Service**: Pinecone
- **Index**: "omegaintel-docs" or "df-06122343-209b21"
- **Embedding Model**: OpenAI text-embedding-ada-002
- **Dimension**: 1536
- **Metadata**: document_id, session_id, user_id, chunk_index

### 4. Document Processing Pipeline
- **Queue System**: Asynchronous processing queue
- **Processor**: `DocumentProcessor` class
- **Loaders**: PyPDFLoader, CSVLoader, TextLoader, UnstructuredFileLoader
- **Text Splitter**: RecursiveCharacterTextSplitter (1000 chars, 200 overlap)

## Detailed Workflow

### Step 1: Document Upload
```python
# Frontend uploads file
POST /api/documents/upload
Content-Type: multipart/form-data
```

### Step 2: S3 Storage & Database Entry
```python
# Backend process:
1. Generate unique file_id
2. Upload to S3: uploads/{user_id}/{file_id}/{filename}
3. Create database record with status='pending'
4. Add to processing queue
```

### Step 3: Asynchronous Processing
```python
# Document processor workflow:
1. Download from S3
2. Load document based on file type
3. Split into chunks (1000 chars, 200 overlap)
4. Generate embeddings for each chunk
5. Store in Pinecone with metadata
6. Update database: status='completed'
```

### Step 4: Chat with RAG
```python
# When user sends a message:
1. Check if session has documents
2. Query Pinecone for similar chunks:
   - Filter by session_id and user_id
   - Retrieve top 3 most relevant chunks
3. Format context from retrieved chunks
4. Enhance user message with context
5. Send to LLM for response
```

## Key Features

### Session Isolation
- Documents uploaded to a session are only accessible within that session
- Implemented via session_id filtering in Pinecone queries

### User Access Control
- Users can only access their own documents
- Enforced by user_id filtering in all queries

### Supported File Types
- PDF files (PyPDFLoader)
- CSV files (CSVLoader)
- Text files (TextLoader)
- Other formats (UnstructuredFileLoader)

### Processing Status Tracking
- `pending`: Document uploaded, awaiting processing
- `processing`: Currently being processed
- `completed`: Successfully processed and indexed
- `failed`: Processing failed

## API Endpoints

### Upload Document
```
POST /api/documents/upload
Body: multipart/form-data with file
Optional: session_id query parameter
```

### List Documents
```
GET /api/documents
Query params: page, per_page, session_id
```

### Delete Document
```
DELETE /api/documents/{document_id}
```

### Get Download URL
```
GET /api/documents/{document_id}/download-url
```

## Configuration

### Environment Variables
```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your_bucket

PINECONE_API_KEY=your_key
PINECONE_ENVIRONMENT=your_env

OPENAI_API_KEY=your_key
```

### Processing Parameters
- Chunk size: 1000 characters
- Chunk overlap: 200 characters
- Embedding model: text-embedding-ada-002
- Top-K retrieval: 3 chunks
- Max context length: 500 chars per chunk

## Example Usage

### Upload and Chat Flow
1. User uploads "product_manual.pdf" to a chat session
2. System stores in S3 and processes into chunks
3. User asks: "What are the warranty terms?"
4. System retrieves relevant chunks about warranty
5. LLM responds with context-aware answer

### Context Enhancement Example
```
Original message: "What are the warranty terms?"

Enhanced message:
"Relevant information from your documents:
[Document 1]: The standard warranty period is 2 years from purchase date...
[Document 2]: Warranty covers manufacturing defects but excludes...

User question: What are the warranty terms?"
```

## Monitoring and Debugging

### Database Queries
```sql
-- Check document processing status
SELECT filename, processing_status, chunks_created, vectors_created 
FROM documents 
WHERE user_id = ? AND session_id = ?;

-- Find failed documents
SELECT * FROM documents 
WHERE processing_status = 'failed';
```

### Pinecone Debugging
```python
# Check vectors for a document
vectors = pinecone_index.query(
    filter={"document_id": doc_id},
    top_k=100,
    include_metadata=True
)
```

## Limitations and Considerations

1. **File Size**: Large files may take longer to process
2. **Session Scope**: Documents are session-specific by default
3. **Vector Limits**: Pinecone has limits on vector counts per index
4. **Embedding Costs**: OpenAI charges per token for embeddings
5. **Context Window**: Only top 3 chunks are used for context

## Future Improvements

1. Support for more file formats
2. Adjustable chunk sizes based on document type
3. Hybrid search (keyword + semantic)
4. Document version control
5. Cross-session document sharing
6. Real-time processing status updates