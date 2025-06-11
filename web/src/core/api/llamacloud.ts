import { resolveServiceURL } from "./resolve-service-url";

export interface UploadResponse {
  success: boolean;
  job_id?: string;
  index_name?: string;
  index_id?: string;
  document_count?: number;
  files_uploaded?: string[];
  message: string;
  error?: string;
  status_url?: string;
}

export interface UploadJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  files: string[];
  index_name?: string;
  index_id?: string;
  result?: {
    index_name?: string;
    index_id?: string;
    files_processed?: number;
    upload_count?: number;
    pipeline_created?: boolean;
  };
  error?: string;
}

export interface LlamaCloudIndex {
  id: string;
  name: string;
  created_at?: string;
  status: string;
}

export async function uploadFilesToLlamaCloud(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append("files", file);
  });

  const response = await fetch(resolveServiceURL("llamacloud/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getUploadJobStatus(jobId: string): Promise<UploadJobStatus> {
  const response = await fetch(resolveServiceURL(`llamacloud/status/${jobId}`));
  
  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return response.json();
}

export async function listUploadJobs(): Promise<{ jobs: UploadJobStatus[] }> {
  const response = await fetch(resolveServiceURL("llamacloud/jobs"));
  
  if (!response.ok) {
    throw new Error(`Failed to list jobs: ${response.statusText}`);
  }

  return response.json();
}

export async function listLlamaCloudIndices(): Promise<{ indices: LlamaCloudIndex[] }> {
  const response = await fetch(resolveServiceURL("llamacloud/indices"));
  
  if (!response.ok) {
    throw new Error(`Failed to list indices: ${response.statusText}`);
  }

  return response.json();
}