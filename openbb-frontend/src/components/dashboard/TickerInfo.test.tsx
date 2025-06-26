import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import TickerInfo from './TickerInfo';
import { AllTheProviders } from '../../test-utils/testProviders';

// Mock the useOpenBBData hooks
vi.mock('../../hooks/useOpenBBData', () => ({
  useHistoricalPrice: vi.fn(),
  useFundamentalOverview: vi.fn(),
}));

import { useHistoricalPrice, useFundamentalOverview } from '../../hooks/useOpenBBData';

const mockUseHistoricalPrice = vi.mocked(useHistoricalPrice);
const mockUseFundamentalOverview = vi.mocked(useFundamentalOverview);

describe('TickerInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stock information correctly', () => {
    // Mock historical price data
    mockUseHistoricalPrice.mockReturnValue({
      data: {
        data: [
          { close: 198.50, open: 197.00, high: 199.00, low: 196.50, volume: 8000000 },
          { close: 197.65, open: 198.00, high: 198.50, low: 196.25, volume: 9184000 },
        ],
      },
      isLoading: false,
      error: null,
    } as any);
    
    // Mock fundamental data
    mockUseFundamentalOverview.mockReturnValue({
      data: {
        name: 'Apple Inc.',
        industry: 'Consumer Electronics',
        exchange: 'NASDAQ',
      },
      isLoading: false,
      error: null,
    } as any);

    render(<TickerInfo ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check if symbol is displayed in the main content (not in the ticker dropdown)
    const symbolElements = screen.getAllByText('AAPL');
    expect(symbolElements.length).toBeGreaterThan(0);
    
    // Check if company name is displayed
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    
    // Check if price is displayed
    expect(screen.getByText('$197.65')).toBeInTheDocument();
    
    // Check if change is displayed (negative)
    expect(screen.getByText('-0.85')).toBeInTheDocument();
    expect(screen.getByText('(-0.43%)')).toBeInTheDocument();
    
    // Check if volume is displayed
    expect(screen.getByText('Volume: 9.184M')).toBeInTheDocument();
    
    // Check if industry and exchange are displayed
    expect(screen.getByText('Consumer Electronics | US | NASDAQ')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseHistoricalPrice.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);
    
    mockUseFundamentalOverview.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);
    
    render(<TickerInfo ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for loading animation
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseHistoricalPrice.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);
    
    mockUseFundamentalOverview.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    } as any);
    
    render(<TickerInfo ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for error message
    expect(screen.getByText('Error loading stock data')).toBeInTheDocument();
  });
});