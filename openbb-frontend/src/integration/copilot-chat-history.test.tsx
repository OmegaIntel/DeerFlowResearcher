import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopilotProvider } from '../contexts/CopilotContext';
import CopilotEnhanced from '../components/copilot/CopilotEnhanced';

describe('CopilotEnhanced - Chat History Feature', () => {
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <CopilotProvider>{children}</CopilotProvider>
  );

  it('should display chat selector dropdown', async () => {
    const { container } = render(
      <TestWrapper>
        <CopilotEnhanced selectedTicker="AAPL" />
      </TestWrapper>
    );

    // Wait for the component to initialize
    await waitFor(() => {
      // Check if chat selector bar is present
      const chatSelector = container.querySelector('[ref="chatDropdownRef"]');
      expect(chatSelector).toBeTruthy();
    });
  });

  it('should show current chat date and name', async () => {
    render(
      <TestWrapper>
        <CopilotEnhanced selectedTicker="AAPL" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for date format (YYYY/MM/DD)
      const dateElement = screen.queryByText(/\d{4}\/\d{2}\/\d{2}/);
      expect(dateElement).toBeTruthy();
      
      // Check for chat name
      const chatName = screen.queryByText(/New Chat/);
      expect(chatName).toBeTruthy();
    });
  });

  it('should toggle chat dropdown when clicked', async () => {
    const { container } = render(
      <TestWrapper>
        <CopilotEnhanced selectedTicker="AAPL" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Find the chat selector button
      const chatButton = container.querySelector('.bg-\\[\\#0f0f0f\\]');
      expect(chatButton).toBeTruthy();
      
      // Click to open dropdown
      fireEvent.click(chatButton!);
      
      // Check if dropdown is visible
      const dropdown = container.querySelector('.max-h-\\[400px\\]');
      expect(dropdown).toBeTruthy();
    });
  });

  it('should create new chat when new chat button is clicked', async () => {
    render(
      <TestWrapper>
        <CopilotEnhanced selectedTicker="AAPL" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Find new chat button (Plus icon)
      const newChatButton = screen.getByTitle('New Chat');
      expect(newChatButton).toBeTruthy();
      
      // Click new chat button
      fireEvent.click(newChatButton);
    });
  });

  it('should show edit and delete buttons on hover', async () => {
    const { container } = render(
      <TestWrapper>
        <CopilotEnhanced selectedTicker="AAPL" />
      </TestWrapper>
    );

    await waitFor(() => {
      // Open chat dropdown
      const chatButton = container.querySelector('.bg-\\[\\#0f0f0f\\]');
      fireEvent.click(chatButton!);
      
      // Find a chat item
      const chatItem = container.querySelector('.group');
      expect(chatItem).toBeTruthy();
      
      // Check for edit and delete buttons
      const editButton = chatItem?.querySelector('.p-1');
      expect(editButton).toBeTruthy();
    });
  });
});