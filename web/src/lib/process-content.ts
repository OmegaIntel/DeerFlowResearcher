// Process content to ensure no document-viewer links exist

export function processMessageContent(content: string): string {
  let processed = content;
  
  // Log original content
  if (content.includes('document-viewer') || content.includes('[') && content.includes('](')) {
    console.warn('[ProcessContent] Original content may contain problematic links:', content.substring(0, 200));
  }
  
  // Remove any markdown links that point to document-viewer
  processed = processed.replace(/\[([^\]]+)\]\(\/?(document-viewer\/[^)]+)\)/gi, '[$1]');
  
  // Remove any markdown links with document IDs
  processed = processed.replace(/\[([^\]]+)\]\([^)]*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[^)]*\)/gi, '[$1]');
  
  // Remove any citation number links
  processed = processed.replace(/\[(\d+)\]\([^)]+\)/gi, '[$1]');
  
  // Check if we made any changes
  if (processed !== content) {
    console.warn('[ProcessContent] Removed links from content');
    console.warn('[ProcessContent] Before:', content.substring(0, 200));
    console.warn('[ProcessContent] After:', processed.substring(0, 200));
  }
  
  return processed;
}