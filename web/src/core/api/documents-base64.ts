import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

export interface Base64UploadResponse {
  success: boolean;
  message: string;
  document?: {
    id: string;
    filename: string;
    original_filename: string;
    size: number;
    upload_time: string;
    chunks_created: number;
    vectors_created: number;
    processing_status: string;
    session_id?: string;
  };
}

export async function uploadDocumentBase64(
  file: File,
  sessionId?: string
): Promise<Base64UploadResponse> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const base64Content = e.target?.result as string;
        // Remove the data:type/subtype;base64, prefix
        const base64Data = base64Content.split(',')[1];
        
        const url = resolveServiceURL('documents/upload-base64');
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || 'application/octet-stream',
            content_base64: base64Data,
            session_id: sessionId
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to upload: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}