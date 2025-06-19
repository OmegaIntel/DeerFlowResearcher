import { resolveServiceURL } from "./resolve-service-url";
import { getAuthToken } from "~/services/auth";

export async function updateDocumentSessions(
  documentIds: string[],
  threadId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const url = resolveServiceURL('documents/update-session');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_ids: documentIds,
        thread_id: threadId
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update document sessions: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating document sessions:', error);
    throw error;
  }
}