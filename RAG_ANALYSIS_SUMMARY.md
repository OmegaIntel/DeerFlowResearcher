# Document Upload and RAG Functionality Analysis

## Issues Identified

### 1. **Session ID Not Being Sent During Document Upload**
- **Problem**: Documents were uploaded without a session_id, then the session was updated AFTER upload
- **Impact**: Pinecone vectors had no session_id in metadata, making session-based filtering impossible
- **Evidence**: Log message `WARNING - [METADATA] No session_id provided for document`

### 2. **Session Update API Only Updates Database**
- **Problem**: The `/api/documents/update-session` endpoint only updated the database record, NOT the Pinecone vectors
- **Impact**: Even after associating a document with a session, searches would fail because Pinecone metadata wasn't updated

### 3. **UUID Format Inconsistency**
- **Problem**: Mix of UUID formats with and without dashes throughout the codebase
- **Impact**: Filter mismatches when searching, as session IDs didn't match between database and Pinecone

### 4. **Document Search Filter Not Matching**
- **Problem**: Search was using normalized (no dash) format while Pinecone might have dashed format
- **Impact**: Documents wouldn't be found even when they existed

## Fixes Applied

### 1. **Enhanced Session Update API** (`documents_session_update.py`)
- Added Pinecone metadata update functionality
- When updating document session, also updates all associated vectors in Pinecone
- Handles multiple vector ID formats for backward compatibility
- Returns count of vectors updated for verification

### 2. **UUID Format Standardization**
- Standardized on UUID format WITH dashes throughout
- Updated search logic to use consistent format
- Added backward compatibility for existing data

### 3. **Improved Document Search** (`app.py`)
- Fixed session ID format in RAG search
- Ensures consistent UUID format when filtering
- Added proper logging for debugging

### 4. **Enhanced Validation** (`document_processor_with_validation.py`)
- Better UUID format handling in validation
- Support for both UUID formats during transition

## How the Flow Works Now

1. **Document Upload**
   - User uploads document (may or may not have session_id)
   - Document is processed and vectors stored in Pinecone
   - If no session_id, vectors have no session metadata

2. **Session Association**
   - Frontend calls `/api/documents/update-session` with document IDs and thread_id
   - Backend:
     - Updates database record with session_id
     - Updates all Pinecone vectors with session_id metadata
     - Returns count of updated vectors

3. **Document Search (RAG)**
   - When user asks a question:
     - System checks if session has documents
     - Searches Pinecone with user_id AND session_id filters
     - Returns only documents from current session
     - Includes results in LLM context

## Testing Instructions

See `test_ui_upload.md` for detailed manual testing steps.

## Key Code Changes

1. **`src/server/documents_session_update.py`**
   - Added Pinecone client initialization
   - Added vector metadata update logic
   - Enhanced logging for debugging

2. **`src/server/app.py`**
   - Fixed UUID format in document search
   - Consistent use of dashed UUID format

3. **`src/server/document_processor_with_validation.py`**
   - Better UUID format handling
   - Support for both formats during validation

## Monitoring

Watch backend logs for key events:
```bash
docker logs -f deer-flow-backend 2>&1 | grep -E "(DOC-SESSION-UPDATE|METADATA|SEARCH|RAG)"
```

Key log messages to look for:
- `[DOC-SESSION-UPDATE] Updated X Pinecone vectors for document`
- `[METADATA] Added session_id: <uuid>`
- `[RAG] Found X documents for session`
- `[SEARCH] Found X results`