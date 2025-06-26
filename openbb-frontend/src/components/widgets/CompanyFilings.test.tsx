import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CompanyFilings from './CompanyFilings';
import { AllTheProviders } from '../../test-utils/testProviders';

// Mock the useRealTimeDataExtended hooks
vi.mock('../../hooks/useRealTimeDataExtended', () => ({
  useSecFilingsRealTime: vi.fn(),
}));

import { useSecFilingsRealTime } from '../../hooks/useRealTimeDataExtended';

const mockUseSecFilingsRealTime = vi.mocked(useSecFilingsRealTime);

describe('CompanyFilings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders SEC filings data correctly', () => {
    // Mock filings data
    mockUseSecFilingsRealTime.mockReturnValue({
      data: [
        { date: '2024-02-02', cik: '0000320193', type: '10-K', url: 'https://example.com/filing1', provider: 'fmp' },
        { date: '2024-01-31', cik: '0000320193', type: '8-K', url: 'https://example.com/filing2', provider: 'fmp' },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<CompanyFilings ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check if title is displayed
    expect(screen.getByText('Company Filings')).toBeInTheDocument();
    
    // Check if filings are displayed
    expect(screen.getByText('10-K')).toBeInTheDocument();
    expect(screen.getByText('8-K')).toBeInTheDocument();
    expect(screen.getByText('2024-02-02')).toBeInTheDocument();
    expect(screen.getByText('2024-01-31')).toBeInTheDocument();
    
    // Check for LIVE indicator when data is from FMP
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSecFilingsRealTime.mockReturnValue({
      data: [],
      isLoading: true,
      error: null,
    } as any);
    
    render(<CompanyFilings ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for loading message
    expect(screen.getByText('Loading SEC filings...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    mockUseSecFilingsRealTime.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);
    
    render(<CompanyFilings ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for empty message
    expect(screen.getByText('No SEC filings available for AAPL')).toBeInTheDocument();
  });
});