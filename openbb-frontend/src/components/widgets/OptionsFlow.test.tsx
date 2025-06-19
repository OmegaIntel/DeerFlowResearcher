import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import OptionsFlow from './OptionsFlow';

// Mock the fetch API
global.fetch = vi.fn();

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  TrendingDown: () => <div data-testid="trending-down-icon" />,
  Filter: () => <div data-testid="filter-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronLeft: () => <div data-testid="chevron-left-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  MoreVertical: () => <div data-testid="more-icon" />,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
}));

describe('OptionsFlow', () => {
  const defaultProps = {
    ticker: 'AAPL',
    dataProvider: 'auto',
  };

  const mockOptionsChainData = {
    success: true,
    data: {
      symbol: 'AAPL',
      contracts: [
        {
          contract_type: 'call',
          strike: 150,
          expiration: '2024-07-19',
          last_price: 5.25,
          volume: 10000,
          open_interest: 5200,
          implied_volatility: 0.45,
          delta: 0.65,
          bid: 5.20,
          ask: 5.30,
          volume_ratio: 1.92,
          unusual_score: 2.78,
        },
        {
          contract_type: 'put',
          strike: 150,
          expiration: '2024-07-19',
          last_price: 2.10,
          volume: 3000,
          open_interest: 3100,
          implied_volatility: 0.31,
          delta: -0.35,
          bid: 2.05,
          ask: 2.15,
          volume_ratio: 0.97,
          unusual_score: 1.27,
        },
      ],
      provider: 'polygon',
    },
  };

  const mockOptionsActivityData = {
    success: true,
    data: [
      {
        ticker: 'AAPL',
        date: '2024-06-19',
        time: '10:30:00',
        strike: 150,
        expiration: '2024-07-19',
        option_type: 'CALL',
        volume: 5000,
        open_interest: 2500,
        price: 5.25,
        underlying_price: 152.50,
        sentiment: 'BULLISH',
        unusual_activity: true,
        description: 'Sweep of 5000 AAPL Jul 150 Calls',
        provider: 'benzinga',
      },
    ],
  };

  beforeEach(() => {
    (fetch as any).mockClear();
  });

  test('renders loading state initially', () => {
    render(<OptionsFlow {...defaultProps} />);
    expect(screen.getByText('Loading options flow...')).toBeInTheDocument();
  });

  test('fetches and displays options chain data', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOptionsChainData,
    });

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Options Flow')).toBeInTheDocument();
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Check if data is displayed - look for text content that includes these values
    expect(screen.getByText(/150C/)).toBeInTheDocument();
    expect(screen.getByText('$5.25')).toBeInTheDocument();
    expect(screen.getByText(/10,000/)).toBeInTheDocument(); // Volume might be in a composite element
    expect(screen.getByText('45.0%')).toBeInTheDocument();
  });

  test('handles provider-specific data fetching', async () => {
    const propsWithProvider = { ...defaultProps, dataProvider: 'benzinga' };
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOptionsActivityData,
    });

    render(<OptionsFlow {...propsWithProvider} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/equity/options/activity?symbol=AAPL&provider=benzinga')
      );
    });
  });

  test('filters options by sentiment', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOptionsChainData,
    });

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Options Flow')).toBeInTheDocument();
    });

    // Click filter button
    const filterButton = screen.getByTestId('filter-icon').parentElement;
    fireEvent.click(filterButton!);

    // Select BULLISH filter
    const bullishOption = screen.getByText('Bullish Only');
    fireEvent.click(bullishOption);

    // Check that only calls are shown
    await waitFor(() => {
      expect(screen.getByText(/150C/)).toBeInTheDocument();
      expect(screen.queryByText(/150P/)).not.toBeInTheDocument();
    });
  });

  test('refreshes data when refresh button is clicked', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockOptionsChainData,
    });

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Options Flow')).toBeInTheDocument();
    });

    // Clear mock calls
    (fetch as any).mockClear();

    // Click refresh button
    const refreshButton = screen.getByTestId('refresh-icon').parentElement;
    fireEvent.click(refreshButton!);

    // Check that fetch was called again
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('displays unusual activity badge', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOptionsChainData,
    });

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Unusual')).toBeInTheDocument();
    });
  });

  test('sorts options by volume', async () => {
    const multipleContracts = {
      ...mockOptionsChainData,
      data: {
        ...mockOptionsChainData.data,
        contracts: [
          { ...mockOptionsChainData.data.contracts[0], volume: 5000 },
          { ...mockOptionsChainData.data.contracts[0], strike: 155, volume: 15000 },
          { ...mockOptionsChainData.data.contracts[0], strike: 145, volume: 8000 },
        ],
      },
    };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => multipleContracts,
    });

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      const volumeElements = screen.getAllByText(/,000$/);
      expect(volumeElements[0]).toHaveTextContent('15,000');
      expect(volumeElements[1]).toHaveTextContent('8,000');
      expect(volumeElements[2]).toHaveTextContent('5,000');
    });
  });

  test('handles error state', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load options flow data')).toBeInTheDocument();
    });
  });

  test('displays no data message when empty', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: { contracts: [] } }),
    });

    render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('No unusual options activity detected')).toBeInTheDocument();
    });
  });

  test('updates when ticker prop changes', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockOptionsChainData,
    });

    const { rerender } = render(<OptionsFlow {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    // Change ticker
    (fetch as any).mockClear();
    rerender(<OptionsFlow {...defaultProps} ticker="TSLA" />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('symbol=TSLA')
      );
    });
  });
});