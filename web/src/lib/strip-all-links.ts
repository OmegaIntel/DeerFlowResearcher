// Strip ALL links from content to ensure citations remain as plain text

export function stripAllLinks(content: string): string {
  if (!content) return content;
  
  let processed = content;
  
  // Remove ALL markdown links - aggressive approach
  // Pattern: [anything](anything)
  processed = processed.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Log if we found and removed links
  if (processed !== content) {
    console.warn('[StripLinks] Removed links from content');
    console.warn('[StripLinks] Original:', content.substring(0, 200));
    console.warn('[StripLinks] Cleaned:', processed.substring(0, 200));
  }
  
  return processed;
}