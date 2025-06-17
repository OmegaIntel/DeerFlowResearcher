import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

export interface S3UploadResponse {
  success: boolean;
  message: string;
  document?: {
    id: string;
    filename: string;
    size: number;
    upload_time: string;
  };
}

export interface S3Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  processing_status: string;
  created_at: string;
  download_url?: string;
  s3_key?: string;
}

export interface S3DocumentsResponse {
  documents: S3Document[];
  total: number;
  page: number;
  per_page: number;
}

export async function uploadFileToS3(file: File, sessionId?: string): Promise<S3UploadResponse> {
  console.log('[S3 Upload] Starting upload for file:', file.name, 'size:', file.size, 'sessionId:', sessionId);
  
  const formData = new FormData();
  formData.append("file", file);

  const token = getAuthToken();
  console.log('[S3 Upload] Auth token retrieved:', {
    exists: !!token,
    length: token?.length || 0,
    preview: token ? `${token.substring(0, 20)}...` : 'null'
  });
  
  let uploadUrl = resolveServiceURL("documents/upload");
  // Add session_id as query parameter if provided
  if (sessionId) {
    uploadUrl += `?session_id=${encodeURIComponent(sessionId)}`;
  }
  console.log('[S3 Upload] Upload URL:', uploadUrl);
  
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };
  console.log('[S3 Upload] Request headers:', headers);
  
  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      headers,
      credentials: 'include'
    });

    console.log('[S3 Upload] Response received:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[S3 Upload] Failed with status:', response.status);
      console.error('[S3 Upload] Error details:', error);
      console.error('[S3 Upload] Response headers:', Object.fromEntries(response.headers.entries()));
      throw new Error(`Upload failed: ${error}`);
    }

    const result = await response.json();
    console.log('[S3 Upload] Success response:', result);
    return result;
  } catch (error) {
    console.error('[S3 Upload] Fetch error:', error);
    throw error;
  }
}

export async function deleteS3Document(documentId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(resolveServiceURL(`documents/${documentId}`), {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Delete failed: ${error}`);
  }

  return response.json();
}

export async function getS3DocumentDownloadUrl(documentId: string): Promise<{ download_url: string; filename: string }> {
  const response = await fetch(resolveServiceURL(`documents/${documentId}/download-url`), {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get download URL: ${error}`);
  }

  return response.json();
}