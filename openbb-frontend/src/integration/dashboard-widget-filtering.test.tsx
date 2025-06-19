import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import App from '../App';

// Mock chart.js to avoid canvas errors
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-line-chart">Line Chart</div>,
  Bar: () => <div data-testid="mock-bar-chart">Bar Chart</div>,
  Doughnut: () => <div data-testid="mock-doughnut-chart">Doughnut Chart</div>,
}));

describe('Dashboard Widget Filtering Integration', () => {
  it('should only show widgets for the active dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for the app to load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Barnes Deal')).toBeInTheDocument();
    });

    // The default dashboard should be active and show its widgets
    // Check for specific widgets that should be visible
    await waitFor(() => {
      expect(screen.getByTestId('company-profile-widget')).toBeInTheDocument();
      expect(screen.getByTestId('ticker-info-widget')).toBeInTheDocument();
    });
    
    // Create a new dashboard
    const newDashboardButton = screen.getByTitle('Create New Dashboard');
    await user.click(newDashboardButton);

    // Fill in the new dashboard form (assuming dialog opens)
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Dashboard Name/i);
      expect(nameInput).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Dashboard Name/i);
    const tickerInput = screen.getByLabelText(/Ticker Symbol/i);
    
    await user.clear(nameInput);
    await user.type(nameInput, 'Test Dashboard');
    await user.clear(tickerInput);
    await user.type(tickerInput, 'MSFT');

    // Create the dashboard
    const createButton = screen.getByRole('button', { name: /Create Dashboard/i });
    await user.click(createButton);

    // Wait for the new dashboard to be active
    await waitFor(() => {
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument();
    });

    // The new dashboard should have no widgets initially
    const noWidgetsMessage = screen.queryByText(/No widgets added to this page yet/i);
    expect(noWidgetsMessage).toBeInTheDocument();

    // Add a widget to the new dashboard
    const addWidgetButton = screen.getByTestId('add-widget-button');
    await user.click(addWidgetButton);

    // Select a widget type (assuming dialog opens)
    await waitFor(() => {
      const priceChartOption = screen.getByText(/Price Chart/i);
      expect(priceChartOption).toBeInTheDocument();
    });

    const priceChartOption = screen.getByTestId('widget-option-price-chart');
    await user.click(priceChartOption);

    const addButton = screen.getByTestId('add-selected-widgets-button');
    await user.click(addButton);

    // Verify the widget was added to the new dashboard
    await waitFor(() => {
      expect(screen.getByTestId('price-chart-widget')).toBeInTheDocument();
    });

    // Switch back to the original dashboard
    const originalDashboard = screen.getByText('Dashboard Barnes Deal');
    await user.click(originalDashboard);

    // Verify we see the original widgets again
    await waitFor(() => {
      expect(screen.getByTestId('company-profile-widget')).toBeInTheDocument();
    });

    // The Price Chart widget from the new dashboard should not be visible
    const priceChartWidgets = screen.queryAllByTestId('price-chart-widget');
    expect(priceChartWidgets.length).toBe(0); // Should not see the new dashboard's widget
  });

  it('should maintain separate widget sets for each dashboard', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Dashboard Barnes Deal')).toBeInTheDocument();
    });

    // Count initial widgets for the original dashboard
    const initialWidgets = screen.getAllByTestId(/^widget-/);
    const initialWidgetCount = initialWidgets.length;

    // Create a new dashboard from template
    const templatesSection = screen.getByText('Templates');
    expect(templatesSection).toBeInTheDocument();

    const equityAnalystTemplate = screen.getByText('Equity Analyst');
    await user.click(equityAnalystTemplate);

    // Fill in the template form
    await waitFor(() => {
      const nameInput = screen.getByLabelText(/Dashboard Name/i);
      expect(nameInput).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Dashboard Name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'My Equity Analysis');

    const createButton = screen.getByRole('button', { name: /Create from Template/i });
    await user.click(createButton);

    // Wait for the new dashboard to be active
    await waitFor(() => {
      expect(screen.getByText('My Equity Analysis')).toBeInTheDocument();
    });

    // Wait for widgets to be added from the template
    await waitFor(() => {
      const widgets = screen.queryAllByTestId(/^widget-/);
      expect(widgets.length).toBeGreaterThan(0);
    }, { timeout: 3000 });

    // The new dashboard should have widgets
    const newDashboardWidgets = screen.getAllByTestId(/^widget-/);
    expect(newDashboardWidgets.length).toBeGreaterThan(0); // Should have widgets

    // Store the count of widgets in the new dashboard
    const newDashboardWidgetCount = newDashboardWidgets.length;

    // Switch back to original dashboard
    const originalDashboard = screen.getByText('Dashboard Barnes Deal');
    await user.click(originalDashboard);

    // Verify original dashboard still shows its original widgets
    await waitFor(() => {
      const currentWidgets = screen.getAllByTestId(/^widget-/);
      // When we switch back, we should see a different set of widgets
      expect(currentWidgets.length).not.toBe(newDashboardWidgetCount);
    });
  });
});