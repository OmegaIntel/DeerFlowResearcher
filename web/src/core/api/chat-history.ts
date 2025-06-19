import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

export interface ProjectInfo {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

export interface ChatSession {
  id: string;
  thread_id: string;
  title?: string;
  mode: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  project?: ProjectInfo;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatSessionDetail {
  id: string;
  title?: string;
  mode: string;
  created_at: string;
  messages: ChatMessage[];
}

export interface CreateChatSessionRequest {
  title?: string;
  mode?: string;
  project_id?: string;
}

export interface UpdateChatSessionRequest {
  title?: string;
}

export async function getChatSessions(params?: {
  skip?: number;
  limit?: number;
  mode?: string;
}): Promise<ChatSession[]> {
  const searchParams = new URLSearchParams();
  
  if (params?.skip) searchParams.append('skip', params.skip.toString());
  if (params?.limit) searchParams.append('limit', params.limit.toString());
  if (params?.mode) searchParams.append('mode', params.mode);

  const url = resolveServiceURL(`chat/sessions?${searchParams.toString()}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat sessions: ${response.statusText}`);
  }

  return response.json();
}

export async function getChatSession(sessionId: string): Promise<ChatSessionDetail> {
  const url = resolveServiceURL(`chat/sessions/${sessionId}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat session: ${response.statusText}`);
  }

  return response.json();
}

export async function getChatSessionByThread(threadId: string): Promise<ChatSessionDetail> {
  const url = resolveServiceURL(`chat/sessions/by-thread/${threadId}`);
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch chat session by thread: ${response.statusText}`);
  }

  return response.json();
}

export async function createChatSession(data: CreateChatSessionRequest): Promise<ChatSession> {
  const url = resolveServiceURL('chat/sessions');
  const token = getAuthToken();
  
  console.log('[createChatSession] URL:', url);
  console.log('[createChatSession] Token exists:', !!token);
  console.log('[createChatSession] Request data:', data);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  console.log('[createChatSession] Response status:', response.status);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[createChatSession] Error response:', errorText);
    throw new Error(`Failed to create chat session: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const result = await response.json();
  console.log('[createChatSession] Success response:', result);
  return result;
}

export async function updateChatSession(
  sessionId: string, 
  data: UpdateChatSessionRequest
): Promise<ChatSession> {
  const url = resolveServiceURL(`chat/sessions/${sessionId}`);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update chat session: ${response.statusText}`);
  }

  return response.json();
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const url = resolveServiceURL(`chat/sessions/${sessionId}`);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete chat session: ${response.statusText}`);
  }
}

