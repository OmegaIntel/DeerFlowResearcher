import { render, screen } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import MainContent from './MainContent';
import { useWidgets } from '../../contexts/WidgetContext';
import { useDashboards } from '../../contexts/DashboardContext';

// Mock the contexts
vi.mock('../../contexts/WidgetContext');
vi.mock('../../contexts/DashboardContext');

// Mock child components
vi.mock('../common/DynamicWidget', () => ({
  default: ({ widgetType, widgetId }: any) => (
    <div data-testid={`widget-${widgetId}`}>{widgetType}</div>
  ),
}));

vi.mock('../financials/FinancialsPage', () => ({
  default: () => <div>Financials Page</div>,
}));

vi.mock('../comparison/ComparisonAnalysis', () => ({
  default: () => <div>Comparison Analysis</div>,
}));

vi.mock('../ownership/OwnershipPage', () => ({
  default: () => <div>Ownership Page</div>,
}));

describe('MainContent', () => {
  const mockProps = {
    selectedTicker: 'AAPL',
    onTickerChange: vi.fn(),
    onToggleCopilot: vi.fn(),
    activeTab: 'overview',
    onTabChange: vi.fn(),
    onOpenPageSettings: vi.fn(),
  };

  const mockPages = [
    { id: 'overview', label: 'Overview', isDefault: true },
    { id: 'financials', label: 'Financials', isDefault: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should filter widgets by active dashboard ID', () => {
    const mockWidgets = [
      { id: 'widget-1', type: 'ticker-info', pageId: 'overview', dashboardId: 'dashboard-1' },
      { id: 'widget-2', type: 'company-profile', pageId: 'overview', dashboardId: 'dashboard-1' },
      { id: 'widget-3', type: 'price-chart', pageId: 'overview', dashboardId: 'dashboard-2' },
      { id: 'widget-4', type: 'key-metrics', pageId: 'overview', dashboardId: 'dashboard-2' },
    ];

    (useWidgets as any).mockReturnValue({
      widgets: mockWidgets,
      pages: mockPages,
      removeWidget: vi.fn(),
    });

    (useDashboards as any).mockReturnValue({
      activeDashboardId: 'dashboard-1',
    });

    render(<MainContent {...mockProps} />);

    // Should only render widgets for dashboard-1
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.getByTestId('widget-widget-2')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-widget-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('widget-widget-4')).not.toBeInTheDocument();
  });

  it('should filter widgets by both page ID and dashboard ID', () => {
    const mockWidgets = [
      { id: 'widget-1', type: 'ticker-info', pageId: 'overview', dashboardId: 'dashboard-1' },
      { id: 'widget-2', type: 'company-profile', pageId: 'financials', dashboardId: 'dashboard-1' },
      { id: 'widget-3', type: 'price-chart', pageId: 'overview', dashboardId: 'dashboard-2' },
    ];

    (useWidgets as any).mockReturnValue({
      widgets: mockWidgets,
      pages: mockPages,
      removeWidget: vi.fn(),
    });

    (useDashboards as any).mockReturnValue({
      activeDashboardId: 'dashboard-1',
    });

    render(<MainContent {...mockProps} />);

    // Should only render widgets for dashboard-1 on overview page
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-widget-2')).not.toBeInTheDocument(); // Different page
    expect(screen.queryByTestId('widget-widget-3')).not.toBeInTheDocument(); // Different dashboard
  });

  it('should show empty state when no widgets match dashboard ID', () => {
    const mockWidgets = [
      { id: 'widget-1', type: 'ticker-info', pageId: 'overview', dashboardId: 'dashboard-2' },
      { id: 'widget-2', type: 'company-profile', pageId: 'overview', dashboardId: 'dashboard-2' },
    ];

    (useWidgets as any).mockReturnValue({
      widgets: mockWidgets,
      pages: mockPages,
      removeWidget: vi.fn(),
    });

    (useDashboards as any).mockReturnValue({
      activeDashboardId: 'dashboard-1', // Different from widgets
    });

    render(<MainContent {...mockProps} activeTab="custom-page" />);

    // Should show empty state
    expect(screen.getByText('No widgets added to this page yet.')).toBeInTheDocument();
  });

  it('should update widgets when dashboard ID changes', () => {
    const mockWidgets = [
      { id: 'widget-1', type: 'ticker-info', pageId: 'overview', dashboardId: 'dashboard-1' },
      { id: 'widget-2', type: 'company-profile', pageId: 'overview', dashboardId: 'dashboard-2' },
    ];

    const { rerender } = render(
      <MainContent {...mockProps} />
    );

    // Initial render with dashboard-1
    (useWidgets as any).mockReturnValue({
      widgets: mockWidgets,
      pages: mockPages,
      removeWidget: vi.fn(),
    });

    (useDashboards as any).mockReturnValue({
      activeDashboardId: 'dashboard-1',
    });

    rerender(<MainContent {...mockProps} />);
    expect(screen.getByTestId('widget-widget-1')).toBeInTheDocument();
    expect(screen.queryByTestId('widget-widget-2')).not.toBeInTheDocument();

    // Change to dashboard-2
    (useDashboards as any).mockReturnValue({
      activeDashboardId: 'dashboard-2',
    });

    rerender(<MainContent {...mockProps} />);
    expect(screen.queryByTestId('widget-widget-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('widget-widget-2')).toBeInTheDocument();
  });
});