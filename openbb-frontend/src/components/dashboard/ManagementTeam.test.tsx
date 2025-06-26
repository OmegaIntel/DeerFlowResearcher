import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ManagementTeam from './ManagementTeam';
import { AllTheProviders } from '../../test-utils/testProviders';

// Mock the useRealTimeDataExtended hooks
vi.mock('../../hooks/useRealTimeDataExtended', () => ({
  useManagementTeamRealTime: vi.fn(),
}));

import { useManagementTeamRealTime } from '../../hooks/useRealTimeDataExtended';

const mockUseManagementTeamRealTime = vi.mocked(useManagementTeamRealTime);

describe('ManagementTeam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders management team data correctly', () => {
    // Mock management team data
    mockUseManagementTeamRealTime.mockReturnValue({
      data: [
        { name: 'Tim Cook', title: 'CEO', compensation: 99000000, currency: 'USD' },
        { name: 'Luca Maestri', title: 'CFO', compensation: 28000000, currency: 'USD' },
      ],
      isLoading: false,
      error: null,
    } as any);

    render(<ManagementTeam ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check if title is displayed
    expect(screen.getByText('Management Team')).toBeInTheDocument();
    
    // Check if team members are displayed
    expect(screen.getByText('Tim Cook')).toBeInTheDocument();
    expect(screen.getByText('CEO')).toBeInTheDocument();
    expect(screen.getByText('$99,000,000')).toBeInTheDocument();
    
    expect(screen.getByText('Luca Maestri')).toBeInTheDocument();
    expect(screen.getByText('CFO')).toBeInTheDocument();
    expect(screen.getByText('$28,000,000')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseManagementTeamRealTime.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as any);
    
    render(<ManagementTeam ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for loading animation - look for the specific loading div structure
    const loadingContainer = screen.getByTestId('management-team-loading');
    expect(loadingContainer).toBeInTheDocument();
    expect(loadingContainer).toHaveClass('animate-pulse');
  });

  it('shows error state', () => {
    mockUseManagementTeamRealTime.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);
    
    render(<ManagementTeam ticker="AAPL" />, { wrapper: AllTheProviders });
    
    // Check for error message
    expect(screen.getByText('No management data available')).toBeInTheDocument();
  });
});