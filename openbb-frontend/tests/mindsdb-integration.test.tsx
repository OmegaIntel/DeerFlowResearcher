import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MindsDBPage from '../src/components/mindsdb/MindsDBPage';
import { mindsdbService } from '../src/services/mindsdbService';

// Mock the service
vi.mock('../src/services/mindsdbService', () => ({
  mindsdbService: {
    checkStatus: vi.fn(),
    executeQuery: vi.fn(),
    processNaturalLanguageQuery: vi.fn(),
    listDataSources: vi.fn(),
    queryAgent: vi.fn(),
    getFinancialInsights: vi.fn(),
  },
  INTEGRATION_OPTIONS: [
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      description: 'Connect to PostgreSQL database',
      engine: 'postgres',
      requiredParams: ['host', 'port', 'database', 'user', 'password'],
      category: 'database'
    },
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'Use OpenAI models for predictions',
      engine: 'openai',
      requiredParams: ['api_key'],
      category: 'ml'
    },
    {
      id: 'financial_analyst',
      name: 'Financial Analyst Agent',
      description: 'AI agent for financial analysis',
      engine: 'agent',
      requiredParams: ['model'],
      category: 'agent'
    }
  ]
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderComponent = () => {
  // Mock scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <MindsDBPage />
    </QueryClientProvider>
  );
};

describe('MindsDB Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock - connected
    vi.mocked(mindsdbService.checkStatus).mockResolvedValue({
      connected: true,
      service: 'MindsDB'
    });
  });

  it('should render MindsDB page with chat interface', async () => {
    renderComponent();
    
    // Check main elements
    expect(screen.getByText('MindsDB Integration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ask MindsDB/)).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('should show disconnected status when MindsDB is not available', async () => {
    vi.mocked(mindsdbService.checkStatus).mockRejectedValue(new Error('Connection failed'));
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });
  });

  it('should allow switching between integrations', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click on integration dropdown
    const dropdownButton = screen.getByText('PostgreSQL');
    await user.click(dropdownButton);
    
    // Select OpenAI
    const openaiOption = screen.getByText('OpenAI');
    await user.click(openaiOption);
    
    // Verify selection changed
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
  });

  it('should execute SQL query and display results', async () => {
    const mockResult = {
      type: 'table',
      data: [['mindsdb'], ['information_schema']],
      column_names: ['Database']
    };
    
    vi.mocked(mindsdbService.processNaturalLanguageQuery).mockResolvedValue(mockResult);
    
    const user = userEvent.setup();
    renderComponent();
    
    // Type query
    const input = screen.getByPlaceholderText(/Ask MindsDB/);
    await user.type(input, 'SHOW DATABASES');
    
    // Submit
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);
    
    // Check query was processed
    await waitFor(() => {
      expect(mindsdbService.processNaturalLanguageQuery).toHaveBeenCalledWith('SHOW DATABASES', 'postgresql');
    });
    
    // Check result is displayed
    await waitFor(() => {
      expect(screen.getByText(/Database/)).toBeInTheDocument();
      expect(screen.getByText(/mindsdb/)).toBeInTheDocument();
    });
  });

  it('should handle agent queries for financial analysis', async () => {
    const mockInsight = 'AAPL shows strong fundamentals with revenue growth of 8% YoY...';
    
    vi.mocked(mindsdbService.processNaturalLanguageQuery).mockResolvedValue(mockInsight);
    
    const user = userEvent.setup();
    renderComponent();
    
    // Switch to Financial Analyst
    const dropdownButton = screen.getByText('PostgreSQL');
    await user.click(dropdownButton);
    
    const agentOption = screen.getByText('Financial Analyst Agent');
    await user.click(agentOption);
    
    // Type financial query
    const input = screen.getByPlaceholderText(/Ask MindsDB/);
    await user.type(input, 'Analyze AAPL stock performance');
    
    // Submit
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);
    
    // Check agent was queried
    await waitFor(() => {
      expect(mindsdbService.processNaturalLanguageQuery).toHaveBeenCalledWith(
        'Analyze AAPL stock performance',
        'financial_analyst'
      );
    });
    
    // Check result
    await waitFor(() => {
      expect(screen.getByText(/strong fundamentals/)).toBeInTheDocument();
    });
  });

  it('should display error messages properly', async () => {
    vi.mocked(mindsdbService.processNaturalLanguageQuery).mockRejectedValue(
      new Error('Invalid SQL syntax')
    );
    
    const user = userEvent.setup();
    renderComponent();
    
    // Type invalid query
    const input = screen.getByPlaceholderText(/Ask MindsDB/);
    await user.type(input, 'INVALID QUERY');
    
    // Submit
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);
    
    // Check error is displayed
    await waitFor(() => {
      expect(screen.getByText(/Error: Invalid SQL syntax/)).toBeInTheDocument();
    });
  });

  it('should copy message content to clipboard', async () => {
    const mockResult = 'Test result content';
    vi.mocked(mindsdbService.processNaturalLanguageQuery).mockResolvedValue(mockResult);
    
    // Mock clipboard API
    const writeTextMock = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock
      },
      writable: true
    });
    
    const user = userEvent.setup();
    renderComponent();
    
    // Execute a query
    const input = screen.getByPlaceholderText(/Ask MindsDB/);
    await user.type(input, 'Test query');
    
    const sendButton = screen.getByText('Send');
    await user.click(sendButton);
    
    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Test result content')).toBeInTheDocument();
    });
    
    // Click copy button
    const copyButtons = screen.getAllByTitle('Copy to clipboard');
    await user.click(copyButtons[0]);
    
    expect(writeTextMock).toHaveBeenCalledWith('Test result content');
  });

  it('should populate input with example queries', async () => {
    const user = userEvent.setup();
    renderComponent();
    
    // Click on an example query
    const exampleQuery = screen.getByText('SHOW DATABASES');
    await user.click(exampleQuery);
    
    // Check input is populated
    const input = screen.getByPlaceholderText(/Ask MindsDB/) as HTMLTextAreaElement;
    expect(input.value).toBe('SHOW DATABASES');
  });

  it('should download chat history', async () => {
    // Mock URL and link click
    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi.fn();
    
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;
    
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = clickMock;
      }
      return element;
    });
    
    const user = userEvent.setup();
    renderComponent();
    
    // Click download button
    const downloadButton = screen.getByTitle('Download chat history');
    await user.click(downloadButton);
    
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should handle keyboard shortcuts (Enter to send)', async () => {
    vi.mocked(mindsdbService.processNaturalLanguageQuery).mockResolvedValue('Query executed');
    
    const user = userEvent.setup();
    renderComponent();
    
    // Type and press Enter
    const input = screen.getByPlaceholderText(/Ask MindsDB/);
    await user.type(input, 'SELECT * FROM users{Enter}');
    
    // Check query was sent
    await waitFor(() => {
      expect(mindsdbService.processNaturalLanguageQuery).toHaveBeenCalledWith(
        'SELECT * FROM users',
        'postgresql'
      );
    });
  });
});