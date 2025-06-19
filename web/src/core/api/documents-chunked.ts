import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

export interface ChunkedUploadResponse {
  success: boolean;
  message: string;
  document_id?: string;
}

// 50KB chunks to bypass very strict nginx limits (becomes ~67KB in base64)
const CHUNK_SIZE = 50 * 1024; 

export async function uploadDocumentChunked(
  file: File,
  sessionId?: string,
  onProgress?: (progress: number) => void
): Promise<ChunkedUploadResponse> {
  const uploadId = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  console.log(`[Chunked Upload] Starting upload of ${file.name}`);
  console.log(`[Chunked Upload] File size: ${file.size} bytes, Total chunks: ${totalChunks}`);
  console.log(`[Chunked Upload] Session ID: ${sessionId}`);
  
  for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
    const start = chunkNumber * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    
    // Convert chunk to base64
    const chunkBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });
    
    // Upload chunk
    const url = resolveServiceURL('documents/upload-chunk');
    const requestBody = {
      chunk_number: chunkNumber,
      total_chunks: totalChunks,
      chunk_data: chunkBase64,
      filename: file.name,
      content_type: file.type || 'application/octet-stream',
      upload_id: uploadId,
      session_id: sessionId
    };
    
    console.log(`[Chunked Upload] Sending chunk ${chunkNumber} with session_id:`, requestBody.session_id);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload chunk ${chunkNumber + 1}/${totalChunks}: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Update progress
    const progress = ((chunkNumber + 1) / totalChunks) * 100;
    onProgress?.(progress);
    
    console.log(`[Chunked Upload] Uploaded chunk ${chunkNumber + 1}/${totalChunks} (${progress.toFixed(1)}%)`);
    
    // If this was the last chunk, we should have the document ID
    if (result.document_id) {
      return {
        success: true,
        message: 'Document uploaded successfully',
        document_id: result.document_id
      };
    }
  }
  
  // Should not reach here if upload was successful
  throw new Error('Upload completed but no document ID received');
}