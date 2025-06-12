import { resolveServiceURL } from "./resolve-service-url";

export interface PineconeUploadResponse {
  success: boolean;
  job_id?: string;
  message: string;
  files_uploaded?: string[];
  error?: string;
  status_url?: string;
}

export interface PineconeUploadJobStatus {
  job_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  files: string[];
  index_name?: string;
  index_host?: string;
  vectors_upserted?: number;
  result?: {
    index_name?: string;
    index_host?: string;
    files_processed?: number;
    vectors_upserted?: number;
    chunks_created?: number;
  };
  error?: string;
}

export interface PineconeIndex {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  status: boolean;
}

export interface PineconeSearchResult {
  id: string;
  score: number;
  metadata: {
    filename?: string;
    chunk_index?: number;
    text?: string;
    job_id?: string;
    upload_time?: string;
  };
}

export interface PineconeSearchResponse {
  query: string;
  index_name: string;
  results: PineconeSearchResult[];
}

export interface PineconeEnhancedSearchResult {
  text: string;
  score: number;
  source: string;
  metadata: Record<string, unknown>;
}

export interface PineconeEnhancedSearchResponse {
  query: string;
  index_name?: string;
  results: PineconeEnhancedSearchResult[];
  total_results: number;
}

export interface PineconeQueryRequest {
  question: string;
  index_name?: string;
  context_chunks?: number;
}

export interface PineconeQueryResponse {
  question: string;
  answer: string;
  sources: Array<{
    source: string;
    score: number;
    metadata: Record<string, unknown>;
  }>;
  confidence: number;
  chunks_used: number;
}

export interface DetailedPineconeIndex {
  name: string;
  dimension: number;
  metric: string;
  host: string;
  total_vectors: number;
  namespaces: Record<string, unknown>;
}

export async function uploadFilesToPinecone(files: File[]): Promise<PineconeUploadResponse> {
  const formData = new FormData();
  files.forEach(file => {
    formData.append("files", file);
  });

  const response = await fetch(resolveServiceURL("pinecone/upload"), {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getPineconeUploadJobStatus(jobId: string): Promise<PineconeUploadJobStatus> {
  const response = await fetch(resolveServiceURL(`pinecone/status/${jobId}`));
  
  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return response.json();
}

export async function listPineconeUploadJobs(): Promise<{ jobs: PineconeUploadJobStatus[] }> {
  const response = await fetch(resolveServiceURL("pinecone/jobs"));
  
  if (!response.ok) {
    throw new Error(`Failed to list jobs: ${response.statusText}`);
  }

  return response.json();
}

export async function listPineconeIndices(): Promise<{ indices: PineconeIndex[] }> {
  const response = await fetch(resolveServiceURL("pinecone/indices"));
  
  if (!response.ok) {
    throw new Error(`Failed to list indices: ${response.statusText}`);
  }

  return response.json();
}

export async function searchPineconeIndex(
  query: string, 
  indexName: string, 
  topK = 5
): Promise<PineconeSearchResponse> {
  const response = await fetch(resolveServiceURL("pinecone/search"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      index_name: indexName,
      top_k: topK,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

export async function queryPineconeKnowledgeBase(
  request: PineconeQueryRequest
): Promise<PineconeQueryResponse> {
  const response = await fetch(resolveServiceURL("pinecone/query"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Query failed: ${response.statusText}`);
  }

  return response.json();
}

export async function searchPineconeEnhanced(
  query: string,
  indexName?: string,
  topK = 5
): Promise<PineconeEnhancedSearchResponse> {
  const response = await fetch(resolveServiceURL("pinecone/search/enhanced"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      index_name: indexName,
      top_k: topK,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Enhanced search failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getDetailedPineconeIndices(): Promise<{
  indices: DetailedPineconeIndex[];
  total_indices: number;
}> {
  const response = await fetch(resolveServiceURL("pinecone/indices/detailed"));
  
  if (!response.ok) {
    throw new Error(`Failed to get detailed indices: ${response.statusText}`);
  }

  return response.json();
}