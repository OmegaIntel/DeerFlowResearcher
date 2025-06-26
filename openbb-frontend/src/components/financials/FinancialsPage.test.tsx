import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import FinancialsPage from './FinancialsPage';
import { CopilotProvider } from '../../contexts/CopilotContext';
import * as api from '../../services/api';

// Mock the API
vi.mock('../../services/api');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <CopilotProvider>
      {children}
    </CopilotProvider>
  </QueryClientProvider>
);

describe('FinancialsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with annual view by default', () => {
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    expect(screen.getByText('Financial Statements')).toBeInTheDocument();
    expect(screen.getByText('FY')).toHaveClass('bg-openbb-accent');
    expect(screen.getByText('Income Statement')).toHaveClass('bg-openbb-accent');
  });

  it('should show different headers for FY vs QTR view', async () => {
    // Mock the API to return empty data so it uses mock data
    (api.api.getIncomeStatement as any).mockResolvedValue([]);
    
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading financial data...')).not.toBeInTheDocument();
    });
    
    // Initially in FY view - should show years
    expect(screen.getByText('2024')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    
    // Switch to QTR view
    fireEvent.click(screen.getByText('QTR'));
    
    // Should show quarterly headers
    await waitFor(() => {
      expect(screen.getByText('Q3 2024')).toBeInTheDocument();
      expect(screen.getByText('Q2 2024')).toBeInTheDocument();
    });
  });

  it('should show different data for FY vs QTR view', async () => {
    // Mock the API to return empty data so it uses mock data
    (api.api.getIncomeStatement as any).mockResolvedValue([]);
    
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading financial data...')).not.toBeInTheDocument();
    });
    
    // Check annual revenue value
    const revenueRow = screen.getByText('Revenue').closest('tr');
    expect(revenueRow).toHaveTextContent('391,035');
    
    // Switch to QTR view
    fireEvent.click(screen.getByText('QTR'));
    
    // Should show quarterly revenue values (different from annual)
    await waitFor(() => {
      const quarterlyRevenueRow = screen.getByText('Revenue').closest('tr');
      expect(quarterlyRevenueRow).toHaveTextContent('94,372');
    });
  });

  it('should have sticky index column with proper styling', () => {
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    const indexHeader = screen.getByText('Index');
    expect(indexHeader).toHaveClass('sticky', 'left-0', 'z-20');
    
    const revenueCell = screen.getByText('Revenue');
    expect(revenueCell.parentElement).toHaveClass('sticky', 'left-0', 'z-20');
  });

  it('should switch between financial statements', async () => {
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    // Initially shows income statement
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    
    // Switch to balance sheet
    fireEvent.click(screen.getByText('Balance Sheet'));
    
    await waitFor(() => {
      expect(screen.getByText('Total Assets')).toBeInTheDocument();
      expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    });
    
    // Switch to cash flow
    fireEvent.click(screen.getByText('Cash Flow Statement'));
    
    await waitFor(() => {
      expect(screen.getByText('Operating Cash Flow')).toBeInTheDocument();
      expect(screen.queryByText('Total Assets')).not.toBeInTheDocument();
    });
  });

  it('should highlight important rows', () => {
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    const importantRows = ['Revenue', 'Gross Profit', 'Operating Income', 'Net Income'];
    
    importantRows.forEach(rowName => {
      const cell = screen.getByText(rowName);
      expect(cell).toHaveClass('text-openbb-accent', 'font-semibold');
    });
  });

  it('should handle API data when available', async () => {
    const mockIncomeData = [
      {
        date: '2024-09-28',
        period: 'FY',
        revenue: 500000000000,
        costOfRevenue: 250000000000,
        grossProfit: 250000000000,
        grossProfitRatio: 0.5,
      },
      {
        date: '2023-09-30',
        period: 'FY',
        revenue: 450000000000,
        costOfRevenue: 225000000000,
        grossProfit: 225000000000,
        grossProfitRatio: 0.5,
      },
    ];
    
    (api.api.getIncomeStatement as any).mockResolvedValue(mockIncomeData);
    
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeInTheDocument();
      expect(screen.getByText('500,000,000,000')).toBeInTheDocument();
    });
  });

  it('should handle quarterly API data with proper headers', async () => {
    const mockQuarterlyData = [
      {
        date: '2024-06-30',
        period: 'Q2',
        revenue: 125000000000,
        costOfRevenue: 62500000000,
        grossProfit: 62500000000,
        grossProfitRatio: 0.5,
      },
      {
        date: '2024-03-31',
        period: 'Q1',
        revenue: 120000000000,
        costOfRevenue: 60000000000,
        grossProfit: 60000000000,
        grossProfitRatio: 0.5,
      },
    ];
    
    (api.api.getIncomeStatement as any).mockResolvedValue(mockQuarterlyData);
    
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    // Switch to QTR view
    fireEvent.click(screen.getByText('QTR'));
    
    await waitFor(() => {
      expect(screen.getByText('Q2 2024')).toBeInTheDocument();
      expect(screen.getByText('Q1 2024')).toBeInTheDocument();
      expect(screen.getByText('125,000,000,000')).toBeInTheDocument();
    });
  });

  it('should apply alternating row colors and proper background to sticky columns', () => {
    render(<FinancialsPage ticker="AAPL" />, { wrapper });
    
    const rows = screen.getAllByRole('row').slice(1); // Skip header row
    
    rows.forEach((row, index) => {
      const stickyCell = row.querySelector('td:first-child');
      if (stickyCell) {
        if (index % 2 === 0) {
          expect(stickyCell).toHaveClass('bg-openbb-bg-widget');
        } else {
          expect(stickyCell).toHaveClass('bg-openbb-bg-secondary');
        }
      }
    });
  });
});