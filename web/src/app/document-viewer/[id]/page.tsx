'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getDocumentDownloadUrl } from '~/core/api/documents';

export default function DocumentViewerRedirect() {
  const params = useParams();
  const documentId = params.id as string;

  useEffect(() => {
    async function redirect() {
      try {
        console.log('[DocumentViewer] Document ID from params:', documentId);
        console.log('[DocumentViewer] Full params:', params);
        const response = await getDocumentDownloadUrl(documentId);
        if (response?.download_url) {
          window.location.href = response.download_url;
        } else {
          throw new Error('No download URL received');
        }
      } catch (error) {
        console.error('[DocumentViewer] Error:', error);
        alert('Failed to open document. Please try again.');
        window.history.back();
      }
    }
    
    if (documentId) {
      redirect();
    }
  }, [documentId]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Opening document...</h1>
        <p className="text-gray-600">Please wait while we redirect you to the document.</p>
      </div>
    </div>
  );
}