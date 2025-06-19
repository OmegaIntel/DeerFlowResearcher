import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App Integration Test', () => {
  it('renders the dashboard with all main components', async () => {
    render(<App />);
    
    // Wait for the app to load
    await waitFor(() => {
      // Check if the sidebar is present
      expect(screen.getByText('OpenBB')).toBeInTheDocument();
      
      // Check if navigation items are present
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Financials')).toBeInTheDocument();
      expect(screen.getByText('Technical Analysis')).toBeInTheDocument();
      
      // Check if ticker info is loaded
      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });
  });

  it('can toggle the sidebar', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('OpenBB')).toBeInTheDocument();
    });
    
    // Find the sidebar toggle button (ChevronLeft icon button)
    const toggleButton = screen.getAllByRole('button').find(button => 
      button.querySelector('svg')
    );
    
    if (toggleButton) {
      // Click to collapse sidebar
      await user.click(toggleButton);
      
      // OpenBB text should disappear when sidebar is collapsed
      await waitFor(() => {
        expect(screen.queryByText('Free Tier')).not.toBeInTheDocument();
      });
      
      // Click to expand sidebar
      await user.click(toggleButton);
      
      // OpenBB text should reappear
      await waitFor(() => {
        expect(screen.getByText('Free Tier')).toBeInTheDocument();
      });
    }
  });

  it('can open the copilot', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByText('OpenBB Copilot')).toBeInTheDocument();
    });
    
    // Click the OpenBB Copilot button
    const copilotButton = screen.getByText('OpenBB Copilot');
    await user.click(copilotButton);
    
    // Check if copilot opens with welcome message
    await waitFor(() => {
      expect(screen.getByText(/Welcome to OpenBB Copilot/)).toBeInTheDocument();
    });
  });

  it('can change ticker symbol', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Wait for app to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter ticker...')).toBeInTheDocument();
    });
    
    // Find the ticker input
    const tickerInput = screen.getByPlaceholderText('Enter ticker...') as HTMLInputElement;
    
    // Clear and type new ticker
    await user.clear(tickerInput);
    await user.type(tickerInput, 'MSFT');
    
    // Check if the input value changed
    expect(tickerInput.value).toBe('MSFT');
  });
});