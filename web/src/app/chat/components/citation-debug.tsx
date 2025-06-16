import React, { useEffect } from 'react';

export function CitationDebugger() {
  useEffect(() => {
    // Monitor all clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        const href = (target as HTMLAnchorElement).href;
        const text = target.textContent;
        console.debug('[CITATION-CLICK]', {
          href,
          text,
          tagName: target.tagName,
          className: target.className,
          parentElement: target.parentElement?.tagName,
          fullElement: target.outerHTML
        });
        
        if (href.includes('document-viewer')) {
          console.warn('[CITATION-CLICK] DOCUMENT-VIEWER LINK CLICKED!');
          console.trace();
          e.preventDefault();
          e.stopPropagation();
          alert(`Blocked navigation to: ${href}\nThis link should not exist!`);
        }
      }
    };
    
    // Monitor all links on the page
    const checkLinks = () => {
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        if (link.href.includes('document-viewer')) {
          console.debug('[CITATION-DEBUG] Found document-viewer link:', {
            href: link.href,
            text: link.textContent,
            parent: link.parentElement?.className,
            html: link.outerHTML
          });
        }
      });
    };
    
    document.addEventListener('click', handleClick, true);
    
    // Check periodically
    const interval = setInterval(checkLinks, 2000);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
      clearInterval(interval);
    };
  }, []);
  
  return null;
}