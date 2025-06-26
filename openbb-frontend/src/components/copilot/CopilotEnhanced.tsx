import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Plus, Trash2, Lightbulb, MessageSquare, Globe, Paperclip, Shield, ChevronDown, Check, Edit2, GripVertical, AlertCircle, Move } from 'lucide-react';
import OmegaMainLogo from '../icons/OmegaMainLogo';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';

interface CopilotEnhancedProps {
  selectedTicker: string;
}

const CopilotEnhanced: React.FC<CopilotEnhancedProps> = ({ selectedTicker }) => {
  const {
    isOpen,
    closeCopilot,
    contexts,
    messages,
    isLoading,
    error,
    chats,
    activeChat,
    selectedModel,
    sendMessage,
    removeWidgetContext,
    createNewSession,
    switchChat,
    deleteChat,
    renameChat,
    setSelectedModel
  } = useCopilot();

  const [message, setMessage] = useState('');
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem('copilot_dimensions');
    if (saved) {
      try {
        return JSON.parse(saved).width || 400;
      } catch (e) {
        return 400;
      }
    }
    return 400;
  });
  const [height, setHeight] = useState(() => {
    const saved = localStorage.getItem('copilot_dimensions');
    const topOffset = Math.floor(window.innerHeight * 0.07);
    const defaultY = 120 - topOffset;
    
    if (saved) {
      try {
        const savedHeight = JSON.parse(saved).height;
        return savedHeight;
      } catch (e) {
        return window.innerHeight - defaultY;
      }
    }
    return window.innerHeight - defaultY;
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 400, height: window.innerHeight, posX: 0, posY: 0 });
  const [showContextsDropdown, setShowContextsDropdown] = useState(false);
  const [showChatDropdown, setShowChatDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    const savedPos = localStorage.getItem('copilot_position');
    const savedVersion = localStorage.getItem('copilot_version');
    
    // Force reset if version changed
    if (savedVersion !== '9') {
      localStorage.setItem('copilot_version', '9');
      localStorage.removeItem('copilot_position');
      localStorage.removeItem('copilot_dimensions');
      // Default to right side, 7% below navigation tabs
      const topOffset = Math.floor(window.innerHeight * 0.07);
      return { x: window.innerWidth - 400, y: 120 - topOffset };
    }
    
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        // Allow any position
        return { x: parsed.x, y: parsed.y };
      } catch (e) {
        // If parse fails, use default
      }
    }
    // Default to right side, 7% below navigation tabs
    const topOffset = Math.floor(window.innerHeight * 0.07);
    return { x: window.innerWidth - 400, y: 120 - topOffset };
  });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatDropdownRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find(c => c.id === activeChat);

  const modelOptions = [
    { id: 'O4-mini-high', name: 'Omega Copilot', description: 'Optimized for financial analysis' },
    { id: 'o3-mini', name: 'O3-mini', description: 'Fast and efficient' },
    { id: 'o4', name: 'O4', description: 'Latest OpenAI model' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Advanced reasoning' },
    { id: 'gpt-4', name: 'GPT-4', description: 'Powerful general model' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' }
  ];

  const currentModelInfo = modelOptions.find(m => m.id === selectedModel) || modelOptions[0];

  const sampleQuestions = [
    'Using the financial statements, assess the trend in revenue growth over the past few years. What factors contributed to any significant fluctuations?',
    'Using the financial statements, analyze the gross and net profit margin trend. Has there been any improvement or decline, and what could be the reasons behind it?',
    'Using the financial statements, investigate any significant changes in capital expenditure levels and the impact these changes have on the company\'s growth prospects.'
  ];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save position and dimensions to localStorage
  useEffect(() => {
    localStorage.setItem('copilot_position', JSON.stringify(position));
  }, [position]);
  
  useEffect(() => {
    localStorage.setItem('copilot_dimensions', JSON.stringify({ width, height }));
  }, [width, height]);

  // Handle window resize to keep panel in bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => ({
        x: Math.min(prev.x, window.innerWidth - width),
        y: Math.min(prev.y, window.innerHeight - height)
      }));
      setHeight(prev => Math.min(prev, window.innerHeight));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width, height]);

  const handleSend = async () => {
    if (message.trim() && !isLoading) {
      console.log('Sending message:', message);
      try {
        await sendMessage(message);
        setMessage('');
      } catch (err) {
        console.error('Error in handleSend:', err);
      }
    }
  };

  const handleQuestionClick = (question: string) => {
    setMessage(question);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleNewChat = async () => {
    await createNewSession();
    setShowChatDropdown(false);
  };

  const handleDeleteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteChat(chatId);
  };

  const resetPosition = () => {
    const topOffset = Math.floor(window.innerHeight * 0.07);
    const newPos = { x: window.innerWidth - width, y: 120 - topOffset };
    setPosition(newPos);
    setHeight(window.innerHeight - (120 - topOffset));
  };

  const startEditingChat = (chatId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingName(currentName);
  };

  const saveEditedName = (chatId: string) => {
    if (editingName.trim()) {
      renameChat(chatId, editingName.trim());
    }
    setEditingChatId(null);
    setEditingName('');
  };

  const formatWidgetType = (type: string): string => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowContextsDropdown(false);
      }
      if (chatDropdownRef.current && !chatDropdownRef.current.contains(event.target as Node)) {
        setShowChatDropdown(false);
      }
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeDirection) return;
      
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.posX;
      let newY = resizeStart.posY;
      
      // Handle different resize directions
      if (resizeDirection.includes('left')) {
        newWidth = resizeStart.width - deltaX;
        newX = resizeStart.posX + deltaX;
      }
      if (resizeDirection.includes('right')) {
        newWidth = resizeStart.width + deltaX;
      }
      if (resizeDirection.includes('top')) {
        newHeight = resizeStart.height - deltaY;
        newY = resizeStart.posY + deltaY;
      }
      if (resizeDirection.includes('bottom')) {
        newHeight = resizeStart.height + deltaY;
      }
      
      // Apply constraints
      if (newWidth >= 300 && newWidth <= 800 && newX >= 0 && newX + newWidth <= window.innerWidth) {
        setWidth(newWidth);
        if (resizeDirection.includes('left')) {
          setPosition(prev => ({ ...prev, x: newX }));
        }
      }
      
      // Check height constraints
      if (resizeDirection.includes('top')) {
        // Resizing from top: adjust both position and height
        if (newY >= 0 && newHeight >= 400) {
          setHeight(newHeight);
          setPosition(prev => ({ ...prev, y: newY }));
        }
      } else if (resizeDirection.includes('bottom')) {
        // Resizing from bottom: only adjust height
        const maxHeightFromPosition = window.innerHeight - position.y;
        if (newHeight >= 400 && newHeight <= maxHeightFromPosition) {
          setHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeDirection, resizeStart, position.y]);

  // Handle drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate new position based on mouse position minus the initial offset
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep panel within viewport bounds
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - 200; // Leave some space at bottom
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)) // Allow dragging to top
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'move';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, position, width]);

  if (!isOpen) return null;

  const startResize = (direction: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: width,
      height: height,
      posX: position.x,
      posY: position.y
    });
    
    // Set appropriate cursor
    const cursorMap: { [key: string]: string } = {
      'left': 'ew-resize',
      'right': 'ew-resize',
      'top': 'ns-resize',
      'bottom': 'ns-resize',
      'top-left': 'nw-resize',
      'top-right': 'ne-resize',
      'bottom-left': 'sw-resize',
      'bottom-right': 'se-resize'
    };
    document.body.style.cursor = cursorMap[direction] || 'default';
  };

  return (
    <div 
      ref={panelRef}
      className={`fixed bg-[#1a1a1a] flex shadow-2xl rounded-lg ${isDragging ? 'opacity-90' : ''}`}
      style={{ 
        width: `${width}px`,
        height: `${height}px`,
        left: `${position.x}px`,
        top: `${position.y}px`,
        transition: isDragging || isResizing ? 'none' : 'box-shadow 0.2s',
        boxShadow: isDragging ? '0 20px 60px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.3)'
      }}
    >
      {/* Resize Handles */}
      {/* Left */}
      <div
        className="absolute left-0 top-2 bottom-2 w-1 bg-transparent hover:bg-blue-500/50 cursor-ew-resize"
        onMouseDown={(e) => startResize('left', e)}
      />
      {/* Right */}
      <div
        className="absolute right-0 top-2 bottom-2 w-1 bg-transparent hover:bg-blue-500/50 cursor-ew-resize"
        onMouseDown={(e) => startResize('right', e)}
      />
      {/* Top */}
      <div
        className="absolute top-0 left-2 right-2 h-1 bg-transparent hover:bg-blue-500/50 cursor-ns-resize"
        onMouseDown={(e) => startResize('top', e)}
      />
      {/* Bottom */}
      <div
        className="absolute bottom-0 left-2 right-2 h-1 bg-transparent hover:bg-blue-500/50 cursor-ns-resize"
        onMouseDown={(e) => startResize('bottom', e)}
      />
      {/* Top-Left Corner */}
      <div
        className="absolute top-0 left-0 w-2 h-2 bg-transparent hover:bg-blue-500/50 cursor-nw-resize"
        onMouseDown={(e) => startResize('top-left', e)}
      />
      {/* Top-Right Corner */}
      <div
        className="absolute top-0 right-0 w-2 h-2 bg-transparent hover:bg-blue-500/50 cursor-ne-resize"
        onMouseDown={(e) => startResize('top-right', e)}
      />
      {/* Bottom-Left Corner */}
      <div
        className="absolute bottom-0 left-0 w-2 h-2 bg-transparent hover:bg-blue-500/50 cursor-sw-resize"
        onMouseDown={(e) => startResize('bottom-left', e)}
      />
      {/* Bottom-Right Corner */}
      <div
        className="absolute bottom-0 right-0 w-2 h-2 bg-transparent hover:bg-blue-500/50 cursor-se-resize"
        onMouseDown={(e) => startResize('bottom-right', e)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Draggable */}
        <div 
          className="flex items-center justify-between px-4 py-3 border-b border-gray-800 cursor-move hover:bg-gray-800/50 transition-colors"
          onMouseDown={(e) => {
            // Only drag if clicking on the header itself, not buttons
            if ((e.target as HTMLElement).closest('button')) return;
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
          }}
          title="Drag to move panel"
        >
          <div className="flex items-center gap-3">
            <OmegaMainLogo size={24} className="pointer-events-none" />
            <div className="relative pointer-events-auto" ref={modelDropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowModelDropdown(!showModelDropdown);
                }}
                className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/50 transition-colors"
              >
                <span className="text-sm text-gray-300 font-medium">{currentModelInfo.name}</span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Model Dropdown */}
              {showModelDropdown && (
                <div className="absolute left-0 top-full mt-1 bg-[#0f0f0f] border border-gray-800 rounded-lg shadow-xl z-50 min-w-[250px]">
                  {modelOptions.map(model => (
                    <button
                      key={model.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModel(model.id);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full px-4 py-3 hover:bg-[#1a1a1a] transition-colors text-left group ${
                        selectedModel === model.id ? 'bg-[#1a1a1a]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-white font-medium">{model.name}</div>
                          <div className="text-xs text-gray-500">{model.description}</div>
                        </div>
                        {selectedModel === model.id && (
                          <Check size={16} className="text-blue-400" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Shield size={16} className="text-blue-500 pointer-events-none" />
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={handleNewChat}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
              title="New Chat"
            >
              <Plus size={20} className="text-gray-400" />
            </button>
            <button
              onClick={closeCopilot}
              className="p-1.5 hover:bg-gray-800 rounded transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Chat Selector Bar */}
        <div className="relative" ref={chatDropdownRef}>
          <button
            onClick={() => setShowChatDropdown(!showChatDropdown)}
            className="w-full px-4 py-3 bg-[#0f0f0f] hover:bg-[#1a1a1a] transition-colors flex items-center justify-between border-b border-gray-800"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-500">{currentChat?.date}</span>
              <span className="text-sm text-white font-medium">{currentChat?.name}</span>
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
                    switchChat(chat.id);
                    setShowChatDropdown(false);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {activeChat === chat.id && (
                        <Check size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                      <div className="flex items-center gap-2 text-sm flex-1">
                        <span className="text-xs text-gray-500 flex-shrink-0">{chat.date}</span>
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
                          <span className="text-sm text-gray-300 truncate">{chat.name}</span>
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
                      {chats.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="p-1 hover:bg-gray-800 rounded transition-colors"
                        >
                          <Trash2 size={14} className="text-gray-400" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Context Bar */}
        {contexts.length > 0 && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowContextsDropdown(!showContextsDropdown)}
              className="w-full px-4 py-2 bg-[#0f0f0f] hover:bg-[#1a1a1a] transition-colors flex items-center justify-between border-b border-gray-800"
            >
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare size={16} className="text-purple-400" />
                <span className="text-sm text-gray-400">
                  {contexts.length} context{contexts.length > 1 ? 's' : ''} added
                </span>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showContextsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Contexts Dropdown */}
            {showContextsDropdown && (
              <div className="absolute left-0 right-0 top-full bg-[#0f0f0f] border-x border-b border-gray-800 max-h-[200px] overflow-y-auto z-50">
                {contexts.map((ctx) => (
                  <div
                    key={ctx.widget_id}
                    className="px-4 py-2 hover:bg-[#1a1a1a] transition-colors border-b border-gray-800 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">
                          {ctx.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatWidgetType(ctx.widget_type)} • {ctx.ticker}
                        </div>
                      </div>
                      <button
                        onClick={() => removeWidgetContext(ctx.widget_id)}
                        className="p-1 hover:bg-gray-800 rounded transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X size={14} className="text-gray-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg flex items-start gap-2">
            <AlertCircle size={16} className="text-red-400 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="max-w-3xl mx-auto">
              {/* Welcome Section */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Sparkles size={32} className="text-white" />
                </div>
                <h1 className="text-lg font-medium text-white mb-4">
                  Welcome to Omega Copilot
                </h1>
                <p className="text-sm text-gray-400">
                  Click the + button on any widget to add its data as context<br />
                  for intelligent financial analysis and insights.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4 mb-8">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MessageSquare size={20} className="text-purple-400 mt-0.5" />
                    <div>
                      <span className="text-purple-400 font-medium text-sm">Add Context:</span>
                      <span className="text-gray-300 ml-1 text-sm">
                        Click the + icon on any widget to add its data to your analysis context.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Globe size={20} className="text-purple-400 mt-0.5" />
                    <div>
                      <span className="text-purple-400 font-medium text-sm">Smart Analysis:</span>
                      <span className="text-gray-300 ml-1 text-sm">
                        I can analyze financial statements, compare metrics, and provide insights.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

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
                      <p className="text-sm text-gray-300 group-hover:text-white">
                        {question}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, idx) => (
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
                    <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className="text-sm text-gray-400">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
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
              <div className="absolute left-24 top-4 text-xs text-gray-500">
                {contexts.length > 0 
                  ? `Context: ${contexts.length} widget${contexts.length > 1 ? 's' : ''}`
                  : 'Add widget context with +'}
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
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !message.trim()}
                className="absolute right-3 bottom-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
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

export default CopilotEnhanced;