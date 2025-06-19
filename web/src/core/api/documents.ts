import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";
import { uploadDocumentBase64 } from "./documents-base64";
import { uploadDocumentChunked } from "./documents-chunked";

export interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  processing_status: string;
  vectors_created: number;
  chunks_created: number;
  pinecone_index?: string;
  created_at: string;
  download_url?: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
}

export interface DocumentUploadResponse {
  success: boolean;
  message: string;
  document_id?: string;
  job_id?: string;
}

export interface DownloadUrlResponse {
  download_url: string;
  expires_in: number;
  filename: string;
}

export async function getDocuments(params?: {
  page?: number;
  per_page?: number;
  status_filter?: string;
}): Promise<DocumentListResponse> {
  const searchParams = new URLSearchParams();
  
  if (params?.page) searchParams.append('page', params.page.toString());
  if (params?.per_page) searchParams.append('per_page', params.per_page.toString());
  if (params?.status_filter) searchParams.append('status_filter', params.status_filter);

  const url = resolveServiceURL(`documents?${searchParams.toString()}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`);
  }

  return response.json();
}

export async function getDocument(documentId: string): Promise<Document> {
  const url = resolveServiceURL(`documents/${documentId}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.statusText}`);
  }

  return response.json();
}

export async function uploadDocuments(files: File[], sessionId?: string): Promise<DocumentUploadResponse[]> {
  // Upload files one by one since the backend expects individual files
  const uploadPromises = files.map(async (file) => {
    const fileSizeMB = file.size / (1024 * 1024);
    
    // For files larger than 5MB, use chunked upload directly
    if (fileSizeMB > 5) {
      console.log(`File ${file.name} is ${fileSizeMB.toFixed(1)}MB, using chunked upload`);
      try {
        const chunkedResult = await uploadDocumentChunked(file, sessionId, (progress) => {
          console.log(`Upload progress for ${file.name}: ${progress.toFixed(1)}%`);
        });
        return {
          success: chunkedResult.success,
          message: chunkedResult.message,
          document_id: chunkedResult.document_id,
          job_id: undefined
        };
      } catch (chunkedError) {
        console.error(`Chunked upload failed for ${file.name}:`, chunkedError);
        throw chunkedError;
      }
    }
    
    try {
      // First try regular upload for smaller files
      const url = resolveServiceURL(`documents/upload${sessionId ? `?session_id=${sessionId}` : ''}`);
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // If we get 413 (Entity Too Large), try chunked upload
        if (response.status === 413) {
          console.log(`File ${file.name} too large for regular upload, trying chunked upload...`);
          const chunkedResult = await uploadDocumentChunked(file, sessionId, (progress) => {
            console.log(`Upload progress for ${file.name}: ${progress.toFixed(1)}%`);
          });
          return {
            success: chunkedResult.success,
            message: chunkedResult.message,
            document_id: chunkedResult.document_id,
            job_id: undefined
          };
        }
        throw new Error(`Failed to upload document ${file.name}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform the response to match DocumentUploadResponse interface
      return {
        success: data.success,
        message: data.message,
        document_id: data.document?.id,  // Extract document.id to document_id
        job_id: data.job_id
      };
    } catch (error) {
      // If regular upload fails with network error, try chunked upload
      console.log(`Error uploading ${file.name}, trying chunked upload fallback:`, error);
      try {
        const chunkedResult = await uploadDocumentChunked(file, sessionId, (progress) => {
          console.log(`Upload progress for ${file.name}: ${progress.toFixed(1)}%`);
        });
        return {
          success: chunkedResult.success,
          message: chunkedResult.message,
          document_id: chunkedResult.document_id,
          job_id: undefined
        };
      } catch (chunkedError) {
        console.error(`Chunked upload also failed for ${file.name}:`, chunkedError);
        throw error; // Throw the original error
      }
    }
  });

  return Promise.all(uploadPromises);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const url = resolveServiceURL(`documents/${documentId}`);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete document: ${response.statusText}`);
  }
}

export async function getDocumentDownloadUrl(
  documentId: string, 
  expiration?: number
): Promise<DownloadUrlResponse> {
  const searchParams = new URLSearchParams();
  if (expiration) searchParams.append('expiration', expiration.toString());

  const url = resolveServiceURL(`documents/${documentId}/download-url?${searchParams.toString()}`);
  console.log('[getDocumentDownloadUrl] Document ID:', documentId);
  console.log('[getDocumentDownloadUrl] Fetching from URL:', url);
  console.log('[getDocumentDownloadUrl] Auth token exists:', !!getAuthToken());
  console.log('[getDocumentDownloadUrl] Full auth header:', `Bearer ${getAuthToken()}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    });

    console.log('[getDocumentDownloadUrl] Response status:', response.status);
    console.log('[getDocumentDownloadUrl] Response status text:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getDocumentDownloadUrl] Error response:', errorText);
      console.error('[getDocumentDownloadUrl] Full URL was:', url);
      throw new Error(`Failed to get download URL: ${response.status}`);
    }

    const data = await response.json();
    console.log('[getDocumentDownloadUrl] Response data:', data);
    return data;
  } catch (error) {
    console.error('[getDocumentDownloadUrl] Fetch error:', error);
    throw error;
  }
}

export async function reprocessDocument(documentId: string): Promise<{ message: string }> {
  const url = resolveServiceURL(`documents/${documentId}/reprocess`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to reprocess document: ${response.statusText}`);
  }

  return response.json();
}

