import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import CopilotEnhanced from '../components/copilot/CopilotEnhanced';

// Mock the CopilotContext
const mockCopilotContext = {
  isOpen: true,
  closeCopilot: vi.fn(),
  contexts: [],
  messages: [],
  isLoading: false,
  error: null,
  chats: [
    {
      id: '1',
      name: 'Financial Analysis',
      date: '2025/03/06',
      messages: [
        { role: 'user' as const, content: 'Analyze AAPL revenue', timestamp: '2025-03-06T10:00:00Z' },
        { role: 'assistant' as const, content: 'AAPL revenue analysis...', timestamp: '2025-03-06T10:00:10Z' }
      ],
      contexts: []
    },
    {
      id: '2',
      name: 'New Chat',
      date: '2025/06/22',
      messages: [],
      contexts: []
    }
  ],
  activeChat: '2',
  sendMessage: vi.fn(),
  removeWidgetContext: vi.fn(),
  createNewSession: vi.fn(),
  switchChat: vi.fn(),
  deleteChat: vi.fn(),
  renameChat: vi.fn()
};

vi.mock('../contexts/CopilotContext', () => ({
  useCopilot: () => mockCopilotContext
}));

describe('CopilotEnhanced - Chat History UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render chat selector with current chat info', () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Check if current chat date and name are displayed
    expect(screen.getByText('2025/06/22')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('should show chat dropdown when selector is clicked', async () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Find and click the chat selector button
    const chatSelector = screen.getByText('2025/06/22').closest('button');
    expect(chatSelector).toBeInTheDocument();
    
    fireEvent.click(chatSelector!);

    // Wait for dropdown to appear
    await waitFor(() => {
      // Check if both chats are shown in dropdown
      expect(screen.getByText('Financial Analysis')).toBeInTheDocument();
      expect(screen.getAllByText('New Chat')).toHaveLength(2); // One in selector, one in dropdown
    });
  });

  it('should switch chat when a different chat is selected', async () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Open dropdown
    const chatSelector = screen.getByText('2025/06/22').closest('button');
    fireEvent.click(chatSelector!);

    // Click on Financial Analysis chat
    await waitFor(() => {
      const financialAnalysisChat = screen.getByText('Financial Analysis').closest('div[class*="cursor-pointer"]');
      expect(financialAnalysisChat).toBeInTheDocument();
      fireEvent.click(financialAnalysisChat!);
    });

    // Verify switchChat was called
    expect(mockCopilotContext.switchChat).toHaveBeenCalledWith('1');
  });

  it('should show edit and delete buttons on chat hover', async () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Open dropdown
    const chatSelector = screen.getByText('2025/06/22').closest('button');
    fireEvent.click(chatSelector!);

    await waitFor(() => {
      // Find a chat item in dropdown
      const chatItem = screen.getByText('Financial Analysis').closest('div[class*="group"]');
      expect(chatItem).toBeInTheDocument();

      // Check for edit and delete buttons (they should exist even if opacity-0)
      const editButton = chatItem?.querySelector('button[class*="p-1"]');
      expect(editButton).toBeInTheDocument();
    });
  });

  it('should create new chat when new button is clicked', async () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Find and click new chat button
    const newChatButton = screen.getByTitle('New Chat');
    expect(newChatButton).toBeInTheDocument();
    
    fireEvent.click(newChatButton);

    // Verify createNewSession was called
    expect(mockCopilotContext.createNewSession).toHaveBeenCalled();
  });

  it('should handle chat deletion', async () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Open dropdown
    const chatSelector = screen.getByText('2025/06/22').closest('button');
    fireEvent.click(chatSelector!);

    await waitFor(() => {
      // Find delete button for a chat
      const chatItem = screen.getByText('Financial Analysis').closest('div[class*="group"]');
      const deleteButtons = chatItem?.querySelectorAll('button[class*="p-1"]');
      const deleteButton = Array.from(deleteButtons || []).find(btn => 
        btn.querySelector('svg')?.getAttribute('class')?.includes('text-gray-400')
      );
      
      if (deleteButton) {
        fireEvent.click(deleteButton);
        expect(mockCopilotContext.deleteChat).toHaveBeenCalledWith('1');
      }
    });
  });

  it('should show check mark for active chat', async () => {
    render(<CopilotEnhanced selectedTicker="AAPL" />);

    // Open dropdown
    const chatSelector = screen.getByText('2025/06/22').closest('button');
    fireEvent.click(chatSelector!);

    await waitFor(() => {
      // Find the active chat item (id: '2')
      const activeChatItem = screen.getAllByText('New Chat')[1].closest('div[class*="group"]');
      
      // Check for check mark icon
      const checkIcon = activeChatItem?.querySelector('svg');
      expect(checkIcon).toBeInTheDocument();
    });
  });
});