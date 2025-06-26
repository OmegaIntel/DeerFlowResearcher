/**
 * Excel API Service
 * Handles communication with backend Excel endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ExcelUploadResponse {
  session_id: string;
  filename: string;
  size: number;
  sheets: Array<{
    name: string;
    rows: number;
    columns: number;
    columns_list: string[];
  }>;
}

interface ExcelSessionResponse {
  session_id: string;
  filename: string;
  base64_content: string;
  size: number;
}

class ExcelApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1/excel`;
  }

  /**
   * Upload an Excel file to the backend
   */
  async uploadFile(file: File): Promise<ExcelUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get Excel session data
   */
  async getSession(sessionId: string): Promise<ExcelSessionResponse> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}`);

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Save Excel changes
   */
  async saveChanges(sessionId: string, content: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save changes: ${response.statusText}`);
    }
  }

  /**
   * Download Excel file
   */
  async downloadFile(sessionId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/session/${sessionId}/download`);

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Get Excel data as JSON
   */
  async getExcelData(sessionId: string, sheet?: string): Promise<any> {
    const url = sheet 
      ? `${this.baseUrl}/session/${sessionId}/data?sheet=${encodeURIComponent(sheet)}`
      : `${this.baseUrl}/session/${sessionId}/data`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to get Excel data: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get available templates
   */
  async getTemplates(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/templates`);

    if (!response.ok) {
      throw new Error(`Failed to get templates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.templates;
  }

  /**
   * Download a template
   */
  async downloadTemplate(templateId: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/templates/${templateId}/download`);

    if (!response.ok) {
      throw new Error(`Failed to download template: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Check if backend Excel API is available
   */
  async checkBackendStatus(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/templates`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
const excelApiService = new ExcelApiService();

export default excelApiService;