import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CopilotProvider } from '../contexts/CopilotContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <CopilotProvider>
        {children}
      </CopilotProvider>
    </QueryClientProvider>
  );
};