import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Maximize2, Minimize2, AtSign } from 'lucide-react';
import classNames from 'classnames';
import type { CopilotMessage } from '../../types';

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicker: string;
}

const Copilot: React.FC<CopilotProps> = ({ isOpen, onClose, selectedTicker }) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Welcome to OpenBB Copilot\nBy default, OpenBB Copilot can access data for all widgets on the current dashboard.\n\nSelect context: click this icon on a widget to add it as explicit context to OpenBB Copilot.\n@ Access tools: use @web to search the web.\nFor more information, see our Copilot Documentation.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: CopilotMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: input,
        timestamp: new Date(),
      };
      
      setMessages([...messages, newMessage]);
      setInput('');

      // Simulate AI response
      setTimeout(() => {
        const response: CopilotMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I'll analyze the data for ${selectedTicker}. Based on the current information...`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, response]);
      }, 1000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={classNames(
      'fixed right-0 top-0 h-full bg-openbb-bg-widget border-l border-openbb-border flex flex-col transition-all duration-300',
      isExpanded ? 'w-[600px]' : 'w-[400px]'
    )}>
      {/* Header */}
      <div className="bg-openbb-bg-secondary border-b border-openbb-border p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-openbb-accent rounded flex items-center justify-center text-xs font-mono font-bold text-openbb-bg-primary">
            AI
          </div>
          <h2 className="font-mono text-sm font-semibold text-openbb-text-primary">OpenBB Copilot</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-openbb-bg-hover rounded transition-colors text-openbb-text-secondary"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-openbb-bg-hover rounded transition-colors text-openbb-text-secondary"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="px-3 py-2 text-center text-xs text-openbb-text-muted border-b border-openbb-border font-mono">
        {new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit' 
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-openbb-bg-primary">
        {messages.map((message) => (
          <div
            key={message.id}
            className={classNames(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div className={classNames(
              'max-w-[80%] p-2.5 rounded',
              message.role === 'user' 
                ? 'bg-openbb-blue text-white' 
                : 'bg-openbb-bg-secondary text-openbb-text-primary border border-openbb-border'
            )}>
              <p className="whitespace-pre-wrap text-xs font-mono">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Context */}
      <div className="px-3 py-2 border-t border-openbb-border bg-openbb-bg-secondary">
        <p className="text-xs text-openbb-text-muted font-mono">
          Context: Using dashboard widgets for {selectedTicker}
        </p>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-openbb-border bg-openbb-bg-secondary">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 px-3 py-1.5 bg-openbb-bg-widget border border-openbb-border rounded text-xs text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent font-mono"
          />
          <button
            onClick={() => setInput(input + ' @web ')}
            className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover rounded transition-colors"
          >
            <AtSign size={16} />
          </button>
          <button
            onClick={handleSend}
            className="p-1.5 bg-openbb-blue text-white rounded hover:bg-blue-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Copilot;