import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import WidgetSettings from './WidgetSettings';
import { useWidgets } from '../../contexts/WidgetContext';

// Mock the WidgetContext
vi.mock('../../contexts/WidgetContext', () => ({
  useWidgets: vi.fn(),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Settings: () => <div data-testid="settings-icon" />,
  X: () => <div data-testid="x-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
}));

describe('WidgetSettings', () => {
  const mockUpdateWidgetProvider = vi.fn();
  
  const defaultProps = {
    widgetId: 'test-widget-1',
    widgetType: 'ticker-info',
    currentProvider: 'auto',
  };

  beforeEach(() => {
    (useWidgets as any).mockReturnValue({
      updateWidgetProvider: mockUpdateWidgetProvider,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('renders settings button', () => {
    render(<WidgetSettings {...defaultProps} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    expect(settingsButton).toBeInTheDocument();
  });

  test('opens settings modal when settings button is clicked', async () => {
    render(<WidgetSettings {...defaultProps} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Widget Settings')).toBeInTheDocument();
    });
  });

  test('displays current provider selection', async () => {
    render(<WidgetSettings {...defaultProps} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Data Provider')).toBeInTheDocument();
      expect(screen.getByText('Auto-select best provider')).toBeInTheDocument();
    });
  });

  test('shows available providers based on widget type', async () => {
    const providers = {
      'ticker-info': ['polygon', 'alpha_vantage', 'fmp'],
      'company-news': ['benzinga', 'polygon', 'fmp'],
      'options-flow': ['polygon', 'benzinga'],
    };

    render(<WidgetSettings {...defaultProps} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /data provider/i });
      fireEvent.click(select);
    });

    // Check that appropriate providers are shown
    expect(screen.getByText('Polygon')).toBeInTheDocument();
    expect(screen.getByText('Alpha Vantage')).toBeInTheDocument();
    expect(screen.getByText('Financial Modeling Prep')).toBeInTheDocument();
  });

  test('updates provider when selection changes', async () => {
    render(<WidgetSettings {...defaultProps} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    // First open the dropdown
    await waitFor(() => {
      const dropdownButton = screen.getByRole('combobox', { name: /data provider/i });
      fireEvent.click(dropdownButton);
    });

    // Then click on Polygon option
    await waitFor(() => {
      const polygonOption = screen.getByText('Polygon');
      fireEvent.click(polygonOption);
    });

    expect(mockUpdateWidgetProvider).toHaveBeenCalledWith('test-widget-1', 'polygon');
  });

  test('closes modal when close button is clicked', async () => {
    render(<WidgetSettings {...defaultProps} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Widget Settings')).toBeInTheDocument();
    });

    const closeButton = screen.getByTestId('x-icon').parentElement;
    fireEvent.click(closeButton!);

    await waitFor(() => {
      expect(screen.queryByText('Widget Settings')).not.toBeInTheDocument();
    });
  });

  test('shows provider-specific options when applicable', async () => {
    render(<WidgetSettings {...defaultProps} widgetType="price-chart" currentProvider="alpha_vantage" />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Alpha Vantage Settings')).toBeInTheDocument();
      expect(screen.getByText('Interval')).toBeInTheDocument();
    });
  });

  test('displays provider status indicators', async () => {
    render(<WidgetSettings {...defaultProps} currentProvider="alpha_vantage" />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      // Check for provider info section
      expect(screen.getByText('Alpha Vantage Settings')).toBeInTheDocument();
      expect(screen.getByText('Rate Limit:')).toBeInTheDocument();
      expect(screen.getByText('5/min')).toBeInTheDocument();
      expect(screen.getByText('Status:')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });
  });

  test('saves settings when Save button is clicked', async () => {
    const mockOnSave = vi.fn();
    render(<WidgetSettings {...defaultProps} onSave={mockOnSave} />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    // Open dropdown and select polygon
    await waitFor(() => {
      const dropdownButton = screen.getByRole('combobox', { name: /data provider/i });
      fireEvent.click(dropdownButton);
    });

    await waitFor(() => {
      const polygonOption = screen.getByText('Polygon');
      fireEvent.click(polygonOption);
    });

    const saveButton = screen.getByText('Save Settings');
    fireEvent.click(saveButton);

    expect(mockOnSave).toHaveBeenCalled();
    expect(mockUpdateWidgetProvider).toHaveBeenCalledWith('test-widget-1', 'polygon');
  });

  test('shows loading state while fetching provider info', async () => {
    render(<WidgetSettings {...defaultProps} isLoadingProviderInfo />);
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      expect(screen.getByText('Loading provider information...')).toBeInTheDocument();
    });
  });
});

describe('WidgetSettings - Provider Availability', () => {
  const mockUpdateWidgetProvider = vi.fn();
  
  const defaultProps = {
    widgetId: 'test-widget-1',
    widgetType: 'ticker-info',
    currentProvider: 'auto',
  };

  beforeEach(() => {
    (useWidgets as any).mockReturnValue({
      updateWidgetProvider: mockUpdateWidgetProvider,
    });
  });

  test('disables unavailable providers', async () => {
    const mockProviderStatus = {
      polygon: { available: true, reason: null },
      alpha_vantage: { available: false, reason: 'No API key configured' },
      fmp: { available: true, reason: null },
    };

    render(
      <WidgetSettings 
        {...defaultProps} 
        providerStatus={mockProviderStatus}
      />
    );
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      const select = screen.getByRole('combobox', { name: /data provider/i });
      fireEvent.click(select);
    });

    const alphaVantageOption = screen.getByText('Alpha Vantage (Unavailable)');
    expect(alphaVantageOption).toBeInTheDocument();
    expect(alphaVantageOption).toHaveAttribute('disabled');
  });

  test('shows unavailable status for providers without API key', async () => {
    const mockProviderStatus = {
      polygon: { available: true, reason: null },
      alpha_vantage: { available: false, reason: 'API rate limit exceeded' },
      fmp: { available: true, reason: null },
    };

    render(
      <WidgetSettings 
        {...defaultProps} 
        providerStatus={mockProviderStatus}
      />
    );
    
    const settingsButton = screen.getByTestId('settings-icon').parentElement;
    fireEvent.click(settingsButton!);
    
    await waitFor(() => {
      const dropdownButton = screen.getByRole('combobox', { name: /data provider/i });
      fireEvent.click(dropdownButton);
    });

    expect(screen.getByText('Alpha Vantage (Unavailable)')).toBeInTheDocument();
  });
});