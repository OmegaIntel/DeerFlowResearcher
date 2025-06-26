import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import EarningsTranscripts from './EarningsTranscripts';
import { AllTheProviders } from '../../test-utils/testProviders';

// Mock the useRealTimeDataExtended hooks
vi.mock('../../hooks/useRealTimeDataExtended', () => ({
  useEarningsTranscriptRealTime: vi.fn(),
  useEarningsTranscriptDatesRealTime: vi.fn(),
}));

import { useEarningsTranscriptRealTime, useEarningsTranscriptDatesRealTime } from '../../hooks/useRealTimeDataExtended';

const mockUseEarningsTranscriptRealTime = vi.mocked(useEarningsTranscriptRealTime);
const mockUseEarningsTranscriptDatesRealTime = vi.mocked(useEarningsTranscriptDatesRealTime);

describe('EarningsTranscripts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders earnings transcript data correctly', () => {
    // Mock available dates
    mockUseEarningsTranscriptDatesRealTime.mockReturnValue({
      data: [
        { year: 2024, quarter: 2 },
        { year: 2024, quarter: 1 },
        { year: 2023, quarter: 4 },
      ],
      isLoading: false,
    } as any);

    // Mock transcript data
    mockUseEarningsTranscriptRealTime.mockReturnValue({
      data: {
        symbol: 'AAPL',
        quarter: 2,
        year: 2024,
        date: '2024-05-02T16:30:00',
        content: 'Tim Cook: Good afternoon and welcome to Apple\'s Q2 2024 earnings call.\n\nLuca Maestri: Thank you, Tim. Let me go through our financial results.',
        provider: 'fmp',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    render(<EarningsTranscripts ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check if title is displayed
    expect(screen.getByText('Earnings Transcripts')).toBeInTheDocument();
    
    // Check if transcript content is displayed
    expect(screen.getByText(/Good afternoon and welcome to Apple's Q2 2024 earnings call/)).toBeInTheDocument();
    expect(screen.getByText('Tim Cook:')).toBeInTheDocument();
    expect(screen.getByText('Luca Maestri:')).toBeInTheDocument();
    
    // Check for LIVE indicator when data is available
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseEarningsTranscriptDatesRealTime.mockReturnValue({
      data: [],
      isLoading: true,
    } as any);
    
    mockUseEarningsTranscriptRealTime.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    } as any);
    
    render(<EarningsTranscripts ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for loading message
    expect(screen.getByText('Loading transcript...')).toBeInTheDocument();
  });

  it('shows error state', () => {
    mockUseEarningsTranscriptDatesRealTime.mockReturnValue({
      data: [],
      isLoading: false,
    } as any);
    
    mockUseEarningsTranscriptRealTime.mockReturnValue({
      data: null,
      isLoading: false,
      error: 'No transcript available for this period',
      refetch: vi.fn(),
    } as any);
    
    render(<EarningsTranscripts ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for error message
    expect(screen.getByText('No transcript available for this period')).toBeInTheDocument();
  });
});