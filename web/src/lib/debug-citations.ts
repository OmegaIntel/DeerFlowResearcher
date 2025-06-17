// Debug utility for citation issues

export function debugCitations(context: string, data: any) {
  console.log(`[CITATION-DEBUG][${context}]`, data);
  
  // Check for document-viewer links in any string
  if (typeof data === 'string' && data.includes('document-viewer')) {
    console.error(`[CITATION-DEBUG][${context}] Found document-viewer link in string:`, data);
    console.trace();
  }
  
  // Check objects recursively
  if (typeof data === 'object' && data !== null) {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string' && value.includes('document-viewer')) {
        console.error(`[CITATION-DEBUG][${context}] Found document-viewer link in ${key}:`, value);
        console.trace();
      }
    });
  }
}