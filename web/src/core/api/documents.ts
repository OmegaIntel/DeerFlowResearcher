import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

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

export async function uploadDocuments(files: File[]): Promise<DocumentUploadResponse> {
  const url = resolveServiceURL('documents/upload');
  
  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload documents: ${response.statusText}`);
  }

  return response.json();
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
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.statusText}`);
  }

  return response.json();
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

