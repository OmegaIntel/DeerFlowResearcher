import React, { useState, useRef, useEffect } from 'react';
import { Send, Database, Bot, Loader2, AlertCircle, ChevronDown, Check, Copy, Download, Settings } from 'lucide-react';
import { mindsdbService, INTEGRATION_OPTIONS } from '../../services/mindsdbService';
import type { ChatMessage, IntegrationOption } from '../../services/mindsdbService';
import IntegrationSetup from './IntegrationSetup';
import classNames from 'classnames';

const MindsDBPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Welcome to MindsDB Integration! You can execute SQL queries, analyze financial data, or interact with AI agents. Select an integration from the dropdown to get started.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('postgresql');
  const [isConnected, setIsConnected] = useState(false);
  const [showIntegrationDropdown, setShowIntegrationDropdown] = useState(false);
  const [showIntegrationSetup, setShowIntegrationSetup] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkConnection = async () => {
    try {
      const status = await mindsdbService.checkStatus();
      setIsConnected(status.connected);
    } catch (error) {
      setIsConnected(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
      queryType: selectedIntegration
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const result = await mindsdbService.processNaturalLanguageQuery(input.trim(), selectedIntegration);
      
      let responseContent = '';
      if (typeof result === 'string') {
        responseContent = result;
      } else if (result.type === 'table' && result.data) {
        responseContent = formatTableResult(result);
      } else if (result.type === 'error') {
        responseContent = `Error: ${result.error_message}`;
      } else {
        responseContent = JSON.stringify(result, null, 2);
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process query'}`,
        timestamp: new Date(),
        error: error.message
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTableResult = (result: any): string => {
    if (!result.data || result.data.length === 0) {
      return 'No results found.';
    }

    const columns = result.column_names || [];
    const rows = result.data;

    // Create markdown table
    let table = '| ' + columns.join(' | ') + ' |\n';
    table += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
    
    rows.forEach((row: any[]) => {
      table += '| ' + row.map(cell => cell ?? 'NULL').join(' | ') + ' |\n';
    });

    return table;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadChat = () => {
    const chatContent = messages
      .map(msg => `[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleString()}\n${msg.content}\n`)
      .join('\n---\n\n');
    
    const blob = new Blob([chatContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindsdb-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedIntegrationInfo = INTEGRATION_OPTIONS.find(opt => opt.id === selectedIntegration);

  const exampleQueries = {
    postgresql: [
      'SHOW DATABASES',
      'SELECT * FROM users LIMIT 10',
      'CREATE MODEL price_predictor FROM (SELECT * FROM stock_prices) PREDICT price'
    ],
    mysql: [
      'SHOW TABLES',
      'DESCRIBE customers',
      'SELECT COUNT(*) FROM orders WHERE status = "completed"'
    ],
    mongodb: [
      'SHOW COLLECTIONS',
      'db.users.find().limit(5)',
      'db.orders.aggregate([{$group: {_id: "$status", count: {$sum: 1}}}])'
    ],
    snowflake: [
      'SHOW DATABASES',
      'SELECT * FROM sales_data WHERE region = "US"',
      'CREATE MODEL sales_forecast FROM (SELECT * FROM historical_sales) PREDICT revenue'
    ],
    bigquery: [
      'SELECT * FROM dataset.table LIMIT 100',
      'Analyze customer behavior patterns',
      'Show revenue trends by region'
    ],
    salesforce: [
      'SELECT * FROM salesforce.opportunities WHERE stage = "Closed Won"',
      'Show top 10 accounts by revenue',
      'Analyze lead conversion rates',
      'Predict deal closing probability'
    ],
    gmail: [
      'SELECT * FROM gmail.messages WHERE subject LIKE "%invoice%"',
      'Analyze email sentiment from customers',
      'Show unread messages from last week',
      'Extract order information from emails'
    ],
    google_drive: [
      'SELECT * FROM google_drive.files WHERE type = "spreadsheet"',
      'Find all financial reports from 2024',
      'Analyze document sharing patterns',
      'Show recently modified files'
    ],
    google_sheets: [
      'SELECT * FROM sheets.sales_data',
      'Analyze data from specific sheet',
      'Create predictions based on spreadsheet data',
      'Show summary statistics'
    ],
    slack: [
      'SELECT * FROM slack.messages WHERE channel = "sales"',
      'Analyze team sentiment in channels',
      'Show most active users',
      'Extract action items from conversations'
    ],
    github: [
      'SELECT * FROM github.issues WHERE state = "open"',
      'Show pull request metrics',
      'Analyze code commit patterns',
      'Find security vulnerabilities'
    ],
    stripe: [
      'SELECT * FROM stripe.payments WHERE status = "succeeded"',
      'Show revenue by customer',
      'Analyze payment failure reasons',
      'Predict customer churn'
    ],
    shopify: [
      'SELECT * FROM shopify.orders WHERE fulfillment_status = "fulfilled"',
      'Show best selling products',
      'Analyze customer purchase patterns',
      'Predict inventory needs'
    ],
    openai: [
      'Create a sentiment analysis model',
      'Analyze the sentiment of recent news',
      'Generate a financial report summary'
    ],
    binance: [
      'SELECT * FROM crypto_prices WHERE symbol = "BTCUSDT"',
      'Show latest Bitcoin price',
      'Analyze crypto market trends'
    ],
    plaid: [
      'SELECT * FROM plaid.transactions WHERE category = "Food and Drink"',
      'Analyze spending patterns',
      'Show account balances',
      'Detect unusual transactions'
    ],
    s3: [
      'SELECT * FROM s3.files WHERE bucket = "data-lake"',
      'Analyze CSV files in bucket',
      'Show large files over 1GB',
      'Process log files'
    ],
    file: [
      'Upload sales_data.csv',
      'SELECT * FROM sales_data WHERE revenue > 1000',
      'Create visualization from uploaded data'
    ],
    financial_analyst: [
      'Analyze AAPL stock performance',
      'What are the key risks for Microsoft?',
      'Compare Tesla vs traditional automakers',
      'Generate investment report for NVDA'
    ]
  };

  const currentExamples = exampleQueries[selectedIntegration as keyof typeof exampleQueries] || [];

  return (
    <div className="flex flex-col h-full bg-openbb-bg-primary">
      {/* Header */}
      <div className="border-b border-openbb-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Database className="text-openbb-accent" size={24} />
            <h1 className="text-xl font-semibold text-openbb-text-primary">MindsDB Integration</h1>
            <div className={classNames(
              'px-3 py-1 rounded-full text-xs font-medium',
              isConnected 
                ? 'bg-green-500/20 text-green-500' 
                : 'bg-red-500/20 text-red-500'
            )}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </div>
          </div>
          
          {/* Integration Selector */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowIntegrationDropdown(!showIntegrationDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-openbb-bg-widget border border-openbb-border rounded-lg hover:bg-openbb-bg-hover transition-colors"
              >
                {selectedIntegrationInfo && (
                  <>
                    <Bot size={16} className="text-openbb-accent" />
                    <span className="text-sm text-openbb-text-primary">{selectedIntegrationInfo.name}</span>
                    <ChevronDown size={16} className="text-openbb-text-secondary" />
                  </>
                )}
              </button>
            
            {showIntegrationDropdown && (
              <div className="absolute right-0 mt-2 w-72 bg-openbb-bg-widget border border-openbb-border rounded-lg shadow-lg z-50">
                <div className="py-2">
                  {['database', 'api', 'ml', 'agent'].map(category => (
                    <div key={category} className="mb-2">
                      <div className="px-4 py-1 text-xs text-openbb-text-muted uppercase">
                        {category}
                      </div>
                      {INTEGRATION_OPTIONS.filter(opt => opt.category === category).map(option => (
                        <button
                          key={option.id}
                          onClick={() => {
                            setSelectedIntegration(option.id);
                            setShowIntegrationDropdown(false);
                          }}
                          className={classNames(
                            'w-full px-4 py-2 text-left hover:bg-openbb-bg-hover transition-colors flex items-center justify-between',
                            selectedIntegration === option.id && 'bg-openbb-bg-hover'
                          )}
                        >
                          <div>
                            <div className="text-sm text-openbb-text-primary">{option.name}</div>
                            <div className="text-xs text-openbb-text-secondary">{option.description}</div>
                          </div>
                          {selectedIntegration === option.id && (
                            <Check size={16} className="text-openbb-accent" />
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
            
            {/* Setup Connection Button */}
            <button
              onClick={() => setShowIntegrationSetup(true)}
              className="flex items-center gap-2 px-4 py-2 bg-openbb-bg-widget border border-openbb-border rounded-lg hover:bg-openbb-bg-hover transition-colors"
              title="Setup integration connection"
            >
              <Settings size={16} className="text-openbb-accent" />
              <span className="text-sm text-openbb-text-primary">Setup</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={classNames(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={classNames(
                    'max-w-[70%] rounded-lg p-4',
                    message.role === 'user'
                      ? 'bg-openbb-accent text-white'
                      : message.role === 'system'
                      ? 'bg-openbb-bg-widget border border-openbb-border'
                      : message.error
                      ? 'bg-red-500/10 border border-red-500/50'
                      : 'bg-openbb-bg-widget border border-openbb-border'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs opacity-70">
                      {message.role === 'user' ? 'You' : message.role === 'system' ? 'System' : 'MindsDB'}
                    </span>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="text-xs opacity-70 hover:opacity-100 transition-opacity"
                        title="Copy to clipboard"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className={classNames(
                    'prose prose-sm max-w-none',
                    message.role === 'user' ? 'prose-invert' : 'prose-dark'
                  )}>
                    {message.content.includes('|') && message.content.includes('---') ? (
                      <div className="overflow-x-auto">
                        <pre className="text-xs bg-openbb-bg-primary p-2 rounded">
                          <code>{message.content}</code>
                        </pre>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </pre>
                    )}
                  </div>
                  
                  <div className="text-xs opacity-50 mt-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-openbb-bg-widget border border-openbb-border rounded-lg p-4">
                  <Loader2 className="animate-spin text-openbb-accent" size={20} />
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-6 border-t border-openbb-border">
            <div className="flex gap-4">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={`Ask MindsDB... (using ${selectedIntegrationInfo?.name})`}
                className="flex-1 resize-none bg-openbb-bg-widget border border-openbb-border rounded-lg px-4 py-3 text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent"
                rows={3}
                disabled={!isConnected || isLoading}
              />
              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={!isConnected || isLoading || !input.trim()}
                  className={classNames(
                    'px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-2',
                    !isConnected || isLoading || !input.trim()
                      ? 'bg-openbb-bg-hover text-openbb-text-muted cursor-not-allowed'
                      : 'bg-openbb-accent text-white hover:bg-openbb-accent/90'
                  )}
                >
                  <Send size={18} />
                  Send
                </button>
                <button
                  type="button"
                  onClick={downloadChat}
                  className="px-4 py-2 rounded-lg bg-openbb-bg-widget border border-openbb-border hover:bg-openbb-bg-hover transition-colors text-openbb-text-secondary"
                  title="Download chat history"
                >
                  <Download size={18} />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Sidebar with Examples */}
        <div className="w-80 border-l border-openbb-border p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-openbb-text-primary mb-4">Example Queries</h3>
          <div className="space-y-2">
            {currentExamples.map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="w-full text-left p-3 bg-openbb-bg-widget hover:bg-openbb-bg-hover rounded-lg transition-colors text-xs text-openbb-text-secondary hover:text-openbb-text-primary"
              >
                {example}
              </button>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-openbb-text-primary mb-2">Integration Info</h3>
            <div className="p-3 bg-openbb-bg-widget rounded-lg text-xs text-openbb-text-secondary">
              <p className="mb-2">
                <span className="font-medium">Engine:</span> {selectedIntegrationInfo?.engine}
              </p>
              <p className="mb-2">
                <span className="font-medium">Category:</span> {selectedIntegrationInfo?.category}
              </p>
              {selectedIntegrationInfo?.requiredParams.length > 0 && (
                <div>
                  <span className="font-medium">Required Parameters:</span>
                  <ul className="mt-1 space-y-1">
                    {selectedIntegrationInfo.requiredParams.map(param => (
                      <li key={param} className="ml-2">• {param}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {!isConnected && (
            <div className="mt-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="text-red-500 mt-0.5" size={16} />
                <div className="text-xs text-red-500">
                  <p className="font-medium mb-1">Connection Error</p>
                  <p>MindsDB is not connected. Please ensure the service is running.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Integration Setup Modal */}
      <IntegrationSetup
        isOpen={showIntegrationSetup}
        onClose={() => setShowIntegrationSetup(false)}
        selectedIntegration={selectedIntegrationInfo}
      />
    </div>
  );
};

export default MindsDBPage;