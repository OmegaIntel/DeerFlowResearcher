/**
 * OnlyOffice Integration Service
 * Provides fast Excel editing with full Excel compatibility
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface OnlyOfficeConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      comment: boolean;
      download: boolean;
      edit: boolean;
      fillForms: boolean;
      modifyFilter: boolean;
      modifyContentControl: boolean;
      review: boolean;
      chat: boolean;
    };
  };
  documentType: string;
  editorConfig: {
    mode: string;
    lang: string;
    callbackUrl: string;
    user: {
      id: string;
      name: string;
    };
    customization: any;
    plugins: any;
  };
  height: string;
  width: string;
  type: string;
}

interface SessionResponse {
  success: boolean;
  doc_key?: string;
  config?: OnlyOfficeConfig;
  editor_url?: string;
  error?: string;
}

class OnlyOfficeService {
  private baseUrl: string;
  private sessions: Map<string, any> = new Map();

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/excel/onlyoffice`;
  }

  /**
   * Create OnlyOffice editing session
   */
  async createSession(fileContent: ArrayBuffer, filename: string, userId: string = 'default'): Promise<SessionResponse> {
    try {
      // Convert ArrayBuffer to base64
      const base64Data = btoa(
        new Uint8Array(fileContent).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      const response = await fetch(`${this.baseUrl}/create-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_data: base64Data,
          filename: filename,
          user_id: userId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.sessions.set(result.doc_key, result);
      }
      
      return result;
    } catch (error) {
      console.error('Error creating OnlyOffice session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Initialize OnlyOffice editor in the DOM
   */
  initializeEditor(containerId: string, config: OnlyOfficeConfig): void {
    // Load OnlyOffice API script if not already loaded
    if (!window.DocsAPI) {
      const script = document.createElement('script');
      // Use the proxy path for OnlyOffice API
      script.src = '/onlyoffice/web-apps/apps/api/documents/api.js';
      script.onload = () => {
        this.createEditor(containerId, config);
      };
      script.onerror = () => {
        console.error('Failed to load OnlyOffice API script');
      };
      document.head.appendChild(script);
    } else {
      this.createEditor(containerId, config);
    }
  }

  /**
   * Create the OnlyOffice editor
   */
  private createEditor(containerId: string, config: OnlyOfficeConfig): void {
    try {
      new window.DocsAPI.DocEditor(containerId, config);
    } catch (error) {
      console.error('Error creating OnlyOffice editor:', error);
    }
  }

  /**
   * Check if OnlyOffice server is available
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      // First check if OnlyOffice is directly accessible via proxy
      const directCheck = await fetch('/onlyoffice/healthcheck', {
        method: 'GET',
      }).catch(() => null);
      
      if (directCheck && directCheck.ok) {
        return true;
      }
      
      // Fallback to backend API check
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      }).catch(() => null);
      
      if (response && response.ok) {
        const data = await response.json();
        return data.onlyoffice_available;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get session info
   */
  getSession(docKey: string): any {
    return this.sessions.get(docKey);
  }

  /**
   * Close session
   */
  closeSession(docKey: string): void {
    this.sessions.delete(docKey);
  }
}

// Extend Window interface for OnlyOffice API
declare global {
  interface Window {
    DocsAPI: {
      DocEditor: new (id: string, config: OnlyOfficeConfig) => any;
    };
  }
}

// Create singleton instance
const onlyOfficeService = new OnlyOfficeService();

export default onlyOfficeService;
export type { OnlyOfficeConfig, SessionResponse };