import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WidgetProvider } from './contexts/WidgetContext';
import { DashboardProvider } from './contexts/DashboardContext';
import { CopilotProvider } from './contexts/CopilotContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
// import DebugInfo from './components/debug/DebugInfo'; // Removed for production
import './utils/chartConfig'; // Register Chart.js components
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchInterval: 30 * 1000, // 30 seconds
    },
  },
});

function App() {
  console.log('App component rendering...');
  
  // Add global error handler to catch date errors
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.message, event.error);
      if (event.message.toLowerCase().includes('invalid') && event.message.toLowerCase().includes('date')) {
        console.error('Date error stack:', event.error?.stack);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WidgetProvider>
            <DashboardProvider>
              <CopilotProvider>
                <Router>
                  <Layout />
                </Router>
              </CopilotProvider>
            </DashboardProvider>
          </WidgetProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;