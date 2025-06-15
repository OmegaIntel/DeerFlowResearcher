// Replace citation markers with proper links

export function replaceCitationMarkersWithLinks(
  content: string, 
  citations: Array<{id: string; document_id: string; filename: string; page_number: number}> | undefined
): string {
  if (!citations || citations.length === 0) {
    return content;
  }
  
  let processed = content;
  
  // For each citation, replace the marker with a clickable element
  citations.forEach(citation => {
    // Extract just the number from citation.id (e.g., "[1]" -> "1")
    const citationNumber = citation.id.replace(/\[|\]/g, '');
    
    // Replace all occurrences of [1], [2], etc. with a special marker
    // We'll handle the click in the CitationDisplay component
    const marker = `[${citationNumber}]`;
    
    // Don't create links - just ensure the markers remain as plain text
    // The actual clickable citations are in the References section below
    processed = processed.replace(
      new RegExp(`\\[${citationNumber}\\](?!\\()`, 'g'), 
      marker
    );
  });
  
  return processed;
}

export function ensureNoCitationLinks(content: string): string {
  let processed = content;
  
  // Remove any citation links that might exist
  // Pattern: [number](any-url)
  processed = processed.replace(/\[(\d+)\]\([^)]+\)/g, '[$1]');
  
  // Remove any document-viewer links
  processed = processed.replace(/\[([^\]]+)\]\(\/?(document-viewer\/[^)]+)\)/gi, '[$1]');
  
  // Remove any links with document IDs
  processed = processed.replace(/\[([^\]]+)\]\([^)]*[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}[^)]*\)/gi, '[$1]');
  
  return processed;
}