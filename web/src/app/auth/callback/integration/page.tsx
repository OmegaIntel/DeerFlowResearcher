'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function IntegrationCallbackContent() {
  const searchParams = useSearchParams();
  const service = searchParams?.get('service');

  useEffect(() => {
    // Post message to parent window (the iframe opener)
    if (window.parent) {
      window.parent.postMessage(
        {
          type: 'success',
          service,
          message: 'Integration connected successfully'
        },
        '*' // Allow any origin - could be more restrictive in production
      );
    }

    // Close the iframe after a short delay
    setTimeout(() => {
      if (window.parent) {
        window.parent.postMessage(
          {
            type: 'close',
            service
          },
          '*'
        );
      }
    }, 2000);
  }, [service]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="max-w-md mx-auto text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Connection Successful!
        </h1>
        <p className="text-gray-600 mb-4">
          {service ? `Successfully connected to ${service}` : 'Integration connected successfully'}.
        </p>
        <p className="text-sm text-gray-500">
          This window will close automatically...
        </p>
      </div>
    </div>
  );
}

export default function IntegrationCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <IntegrationCallbackContent />
    </Suspense>
  );
}