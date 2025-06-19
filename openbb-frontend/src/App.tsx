import { BrowserRouter as Router } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WidgetProvider } from './contexts/WidgetContext';
import { DashboardProvider } from './contexts/DashboardContext';
import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
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
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WidgetProvider>
          <DashboardProvider>
            <Router>
              <Layout />
            </Router>
          </DashboardProvider>
        </WidgetProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;