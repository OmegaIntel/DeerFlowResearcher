/**
 * LibreOffice Online Integration Service
 * 
 * This service handles the integration with LibreOffice Online (LOOL) or Collabora Online
 * for viewing and editing Excel files within the browser.
 * 
 * LibreOffice supports:
 * - Full Excel functionality including formulas, charts, pivot tables
 * - VBA macro support through LibreOffice Basic
 * - Real-time collaboration
 * - All Excel keyboard shortcuts
 */

interface LibreOfficeConfig {
  serverUrl: string;
  accessToken?: string;
  language?: string;
  theme?: 'light' | 'dark';
}

interface FileSession {
  id: string;
  fileId: string;
  fileName: string;
  sessionToken: string;
  editUrl: string;
  downloadUrl: string;
  lastModified: Date;
}

class LibreOfficeService {
  private config: LibreOfficeConfig;
  private sessions: Map<string, FileSession> = new Map();

  constructor(config?: Partial<LibreOfficeConfig>) {
    this.config = {
      serverUrl: import.meta.env.VITE_LIBREOFFICE_URL || 'http://localhost:9980',
      theme: 'dark',
      language: 'en',
      ...config
    };
  }

  /**
   * Initialize a LibreOffice session for a file
   */
  async createSession(fileId: string, fileName: string, fileContent: ArrayBuffer): Promise<FileSession> {
    try {
      // Convert ArrayBuffer to Blob
      const blob = new Blob([fileContent], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });

      // Create form data
      const formData = new FormData();
      formData.append('file', blob, fileName);
      formData.append('format', 'xlsx');
      formData.append('lang', this.config.language || 'en');

      // Upload file to LibreOffice server
      const uploadResponse = await fetch(`${this.config.serverUrl}/lool/upload`, {
        method: 'POST',
        body: formData,
        headers: this.config.accessToken ? {
          'Authorization': `Bearer ${this.config.accessToken}`
        } : {}
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      const uploadData = await uploadResponse.json();

      // Create edit session
      const sessionResponse = await fetch(`${this.config.serverUrl}/lool/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.accessToken ? { 'Authorization': `Bearer ${this.config.accessToken}` } : {})
        },
        body: JSON.stringify({
          fileId: uploadData.fileId,
          permissions: {
            edit: true,
            download: true,
            print: true,
            export: true
          },
          uiOptions: {
            theme: this.config.theme,
            toolbar: true,
            statusbar: true,
            ruler: true,
            formulabar: true,
            header: true,
            saveButton: true
          }
        })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();

      const session: FileSession = {
        id: sessionData.sessionId,
        fileId: uploadData.fileId,
        fileName,
        sessionToken: sessionData.token,
        editUrl: `${this.config.serverUrl}/loleaflet/${sessionData.sessionId}/loleaflet.html?WOPISrc=${encodeURIComponent(uploadData.wopiSrc)}&access_token=${sessionData.token}`,
        downloadUrl: `${this.config.serverUrl}/lool/download/${uploadData.fileId}`,
        lastModified: new Date()
      };

      this.sessions.set(fileId, session);
      return session;
    } catch (error) {
      console.error('Error creating LibreOffice session:', error);
      // Fallback to local iframe solution
      return this.createLocalSession(fileId, fileName, fileContent);
    }
  }

  /**
   * Create a local session using iframe postMessage API
   * This is a fallback when LibreOffice server is not available
   */
  private createLocalSession(fileId: string, fileName: string, fileContent: ArrayBuffer): FileSession {
    // Convert to base64 for embedding
    const base64 = btoa(
      new Uint8Array(fileContent).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );

    const session: FileSession = {
      id: `local-${fileId}`,
      fileId,
      fileName,
      sessionToken: 'local',
      editUrl: `/simple-excel-viewer.html?data=${encodeURIComponent(base64)}&filename=${encodeURIComponent(fileName)}`,
      downloadUrl: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`,
      lastModified: new Date()
    };

    this.sessions.set(fileId, session);
    return session;
  }

  /**
   * Get the edit URL for a file
   */
  getEditUrl(fileId: string): string | null {
    const session = this.sessions.get(fileId);
    return session?.editUrl || null;
  }

  /**
   * Download the modified file
   */
  async downloadFile(fileId: string): Promise<Blob | null> {
    const session = this.sessions.get(fileId);
    if (!session) return null;

    try {
      const response = await fetch(session.downloadUrl, {
        headers: this.config.accessToken ? {
          'Authorization': `Bearer ${this.config.accessToken}`
        } : {}
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  /**
   * Close a session
   */
  async closeSession(fileId: string): Promise<void> {
    const session = this.sessions.get(fileId);
    if (!session) return;

    try {
      await fetch(`${this.config.serverUrl}/lool/session/${session.id}`, {
        method: 'DELETE',
        headers: this.config.accessToken ? {
          'Authorization': `Bearer ${this.config.accessToken}`
        } : {}
      });
    } catch (error) {
      console.error('Error closing session:', error);
    }

    this.sessions.delete(fileId);
  }

  /**
   * Check if LibreOffice server is available
   */
  async checkServerStatus(): Promise<boolean> {
    try {
      // For now, always return false to use local mode
      // In production, uncomment the actual check
      return false;
      
      /*
      const response = await fetch(`${this.config.serverUrl}/hosting/discovery`, {
        method: 'GET'
      });
      return response.ok;
      */
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const libreOfficeService = new LibreOfficeService();

export default libreOfficeService;
export type { FileSession, LibreOfficeConfig };