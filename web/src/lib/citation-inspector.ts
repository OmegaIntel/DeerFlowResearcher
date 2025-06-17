// Citation inspector to find where document-viewer links come from

export function inspectCitations() {
  // Check every 500ms for citation links
  setInterval(() => {
    const allLinks = document.querySelectorAll('a');
    const documentViewerLinks: any[] = [];
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes('document-viewer')) {
        const info = {
          href: href,
          fullHref: link.href,
          text: link.textContent,
          className: link.className,
          parent: link.parentElement?.className,
          grandParent: link.parentElement?.parentElement?.className,
          onclick: link.onclick ? 'has onclick' : 'no onclick',
          html: link.outerHTML
        };
        documentViewerLinks.push(info);
        
        // Mark it visually
        link.style.border = '3px solid red';
        link.style.backgroundColor = 'yellow';
      }
    });
    
    if (documentViewerLinks.length > 0) {
      console.error('[CITATION-INSPECTOR] Found document-viewer links:', documentViewerLinks);
      
      // Send to debug API
      fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'document-viewer-links-found',
          count: documentViewerLinks.length,
          links: documentViewerLinks,
          timestamp: new Date().toISOString()
        })
      });
    }
  }, 500);
  
  // Also intercept all link clicks
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'A') {
      const href = (target as HTMLAnchorElement).href;
      if (href.includes('document-viewer')) {
        console.error('[CITATION-INSPECTOR] document-viewer link clicked!', {
          href,
          preventDefault: 'calling preventDefault',
          element: target
        });
        e.preventDefault();
        e.stopPropagation();
        
        // Extract document ID and open properly
        const match = href.match(/document-viewer\/([a-f0-9-]+)/);
        if (match) {
          const docId = match[1];
          console.log('[CITATION-INSPECTOR] Opening document:', docId);
          
          // Call the API to get download URL
          if (docId) {
            import('~/core/api/documents').then(({ getDocumentDownloadUrl }) => {
              getDocumentDownloadUrl(docId).then(response => {
                if (response?.download_url) {
                  window.open(response.download_url, '_blank');
                }
              });
            });
          }
        }
      }
    }
  }, true);
}