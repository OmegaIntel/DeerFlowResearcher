import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Plus, Trash2, Lightbulb, MessageSquare, Globe, Paperclip, Shield, ChevronDown, Check, Edit2, GripVertical } from 'lucide-react';
import OmegaMainLogo from '../icons/OmegaMainLogo';

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTicker: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Chat {
  id: string;
  name: string;
  date: string;
  messages: Message[];
}

const Copilot: React.FC<CopilotProps> = ({ isOpen, onClose, selectedTicker }) => {
  const [message, setMessage] = useState('');
  const [width, setWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [chats, setChats] = useState<Chat[]>([
    {
      id: '1',
      name: '5-Year Income Statement ...',
      date: '2025/03/06',
      messages: [
        { role: 'user', content: '5-Year Income Statement Analysis for AAPL' },
        { role: 'assistant', content: 'I\'ll analyze Apple\'s 5-year income statement trends. Looking at the data:\n\n**Revenue Growth**: Apple has shown consistent revenue growth over the past 5 years, with total revenue increasing from $365.8B in 2021 to $383.3B in 2023.\n\n**Key Observations**:\n- iPhone revenue remains the largest segment at ~52% of total revenue\n- Services segment growing rapidly, now representing ~22% of revenue\n- Gross margins have remained stable around 43-44%\n- Operating expenses well controlled as % of revenue' }
      ]
    },
    {
      id: '2', 
      name: 'New Chat',
      date: '2025/03/06',
      messages: []
    },
    {
      id: '3',
      name: 'New Chat (1)',
      date: '2025/06/19',
      messages: []
    },
    {
      id: '4',
      name: 'New Chat (2)', 
      date: '2025/06/19',
      messages: [
        { role: 'user', content: 'What are the key financial metrics for ' + selectedTicker + '?' },
        { role: 'assistant', content: 'Here are the key financial metrics for ' + selectedTicker + ':\n\n**Valuation Metrics**:\n- P/E Ratio: 28.5\n- P/B Ratio: 45.2\n- EV/EBITDA: 22.1\n\n**Profitability**:\n- Gross Margin: 43.3%\n- Operating Margin: 29.8%\n- Net Margin: 25.3%\n- ROE: 147.3%\n- ROIC: 50.7%' }
      ]
    }
  ]);
  const [activeChat, setActiveChat] = useState('4');
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find(c => c.id === activeChat);

  const sampleQuestions = [
    'Using the financial statements, assess the trend in revenue growth over the past few years. What factors contributed to any significant fluctuations?',
    'Using the financial statements, analyze the gross and net profit margin trend. Has there been any improvement or decline, and what could be the reasons behind it?',
    'Using the financial statements, investigate any significant changes in capital expenditure levels and the impact these changes have on the company\'s growth prospects.'
  ];

  const handleSend = () => {
    if (message.trim() && currentChat) {
      const updatedChats = chats.map(chat => {
        if (chat.id === activeChat) {
          const isFirstMessage = chat.messages.length === 0;
          const updatedChat = {
            ...chat,
            messages: [
              ...chat.messages,
              { role: 'user' as const, content: message },
              { role: 'assistant' as const, content: `I'll analyze ${selectedTicker} for you. Based on the financial data:\n\n**Revenue Analysis**: ${selectedTicker} has shown strong performance with revenue growing at a CAGR of 8.5% over the past 3 years.\n\n**Profitability**: Operating margins have improved from 25.2% to 27.8%, indicating operational efficiency gains.\n\n**Balance Sheet**: The company maintains a healthy balance sheet with a debt-to-equity ratio of 0.35 and strong cash reserves.` }
            ]
          };
          
          // Update chat name to first question if it's a new chat
          if (isFirstMessage && message.trim()) {
            updatedChat.name = message.substring(0, 40) + (message.length > 40 ? '...' : '');
          }
          
          return updatedChat;
        }
        return chat;
      });
      setChats(updatedChats);
      setMessage('');
    }
  };

  const createNewChat = () => {
    const newChatNumber = chats.filter(c => c.name.includes('New Chat')).length + 1;
    const newChat: Chat = {
      id: Date.now().toString(),
      name: newChatNumber === 1 ? 'New Chat' : `New Chat (${newChatNumber - 1})`,
      date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
      messages: []
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
    setShowChatDropdown(false);
  };

  const deleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (chats.length > 1) {
      const newChats = chats.filter(c => c.id !== chatId);
      setChats(newChats);
      if (activeChat === chatId) {
        setActiveChat(newChats[0].id);
      }
    }
  };

  const startEditingChat = (chatId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingName(currentName);
  };

  const saveEditedName = (chatId: string) => {
    if (editingName.trim()) {
      setChats(chats.map(chat => 
        chat.id === chatId ? { ...chat, name: editingName.trim() } : chat
      ));
    }
    setEditingChatId(null);
    setEditingName('');
  };

  const handleQuestionClick = (question: string) => {
    setMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowChatDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth >= 300 && newWidth <= 800) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed right-0 top-[120px] bottom-0 bg-[#1a1a1a] flex"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 h-full w-2 bg-transparent hover:bg-gray-700/50 cursor-col-resize transition-colors group"
        onMouseDown={() => setIsResizing(true)}
      >
        <div className="absolute left-0 top-0 h-full w-0.5 bg-gray-700"></div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-gray-400" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col pl-2">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <OmegaMainLogo size={24} />
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">Omega Copilot</span>
            <ChevronDown size={16} className="text-gray-400" />
            <Shield size={16} className="text-blue-500" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createNewChat}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
          >
            <Plus size={20} className="text-gray-400" />
          </button>
          <button className="p-1.5 hover:bg-gray-800 rounded transition-colors">
            <Trash2 size={20} className="text-gray-400" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-800 rounded transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Chat Selector Bar */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowChatDropdown(!showChatDropdown)}
          className="w-full px-4 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] transition-colors flex items-center justify-between border-b border-gray-800"
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">{currentChat?.date}</span>
            <span className="text-white font-medium">{currentChat?.name}</span>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showChatDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Chat Dropdown */}
        {showChatDropdown && (
          <div className="absolute left-0 right-0 top-full bg-[#0f0f0f] border-x border-b border-gray-800 max-h-[400px] overflow-y-auto z-50">
            {chats.map(chat => (
              <div
                key={chat.id}
                className={`px-4 py-3 hover:bg-[#1a1a1a] cursor-pointer transition-colors border-b border-gray-800 group ${
                  activeChat === chat.id ? 'bg-[#1a1a1a]' : ''
                }`}
                onClick={() => {
                  setActiveChat(chat.id);
                  setShowChatDropdown(false);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {activeChat === chat.id && (
                      <Check size={16} className="text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex items-center gap-2 text-sm flex-1">
                      <span className="text-gray-500 flex-shrink-0">{chat.date}</span>
                      {editingChatId === chat.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveEditedName(chat.id)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              saveEditedName(chat.id);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-gray-800 text-white px-2 py-1 rounded outline-none flex-1"
                          autoFocus
                        />
                      ) : (
                        <span className="text-gray-300 truncate">{chat.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startEditingChat(chat.id, chat.name, e)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                      <Edit2 size={14} className="text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => deleteChat(chat.id, e)}
                      className="p-1 hover:bg-gray-800 rounded transition-colors"
                    >
                      <Trash2 size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentChat && currentChat.messages.length === 0 ? (
          <div className="max-w-3xl mx-auto">
            {/* Welcome Section */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-white mb-4">
                Welcome to Omega Copilot
              </h1>
              <p className="text-gray-400">
                By default, Omega Copilot can access data for all<br />
                widgets on the current dashboard.
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4 mb-8">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MessageSquare size={20} className="text-purple-400 mt-0.5" />
                  <div>
                    <span className="text-purple-400 font-medium">Select context:</span>
                    <span className="text-gray-300 ml-1">
                      click this icon on a widget to add it as explicit context to Omega Copilot.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe size={20} className="text-purple-400 mt-0.5" />
                  <div>
                    <span className="text-purple-400 font-medium">Access tools:</span>
                    <span className="text-gray-300 ml-1">
                      use @web to search the web.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documentation Link */}
            <p className="text-center text-gray-400 mb-8">
              For more information, see our{' '}
              <a href="#" className="text-purple-400 underline hover:text-purple-300">
                Copilot Documentation
              </a>
              .
            </p>

            {/* Sample Questions */}
            <div className="space-y-3">
              {sampleQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuestionClick(question)}
                  className="w-full text-left p-4 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <Lightbulb size={20} className="text-gray-500 group-hover:text-gray-400 mt-0.5" />
                    <p className="text-gray-300 group-hover:text-white">
                      {question}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {currentChat?.messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-800 p-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative bg-gray-800 rounded-lg">
            <div className="absolute left-3 top-3 flex items-center gap-1.5 text-gray-500">
              <div className="p-1.5 hover:bg-gray-700 rounded cursor-pointer transition-colors">
                <Lightbulb size={18} />
              </div>
              <div className="p-1.5 hover:bg-gray-700 rounded cursor-pointer transition-colors">
                <Paperclip size={18} />
              </div>
            </div>
            <div className="absolute left-24 top-4 text-sm text-gray-500">
              Context: Using dashboard widgets
            </div>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question..."
              className="w-full bg-transparent text-white placeholder-gray-500 resize-none outline-none pl-3 pr-24 pt-12 pb-3 min-h-[100px]"
              style={{ maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              className="absolute right-3 bottom-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              Send
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Copilot;