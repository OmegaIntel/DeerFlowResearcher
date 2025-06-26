import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { copilotService } from '../services/copilotService';
import type { WidgetContext, WidgetType, ChatMessage } from '../services/copilotService';

interface Chat {
  id: string;
  name: string;
  date: string;
  messages: ChatMessage[];
  contexts: WidgetContext[];
}

interface CopilotContextData {
  isOpen: boolean;
  sessionId: string | null;
  contexts: WidgetContext[];
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  chats: Chat[];
  activeChat: string | null;
  selectedModel: string;
  
  // Actions
  openCopilot: () => void;
  closeCopilot: () => void;
  addWidgetContext: (widgetType: WidgetType, widgetData: any, ticker: string, widgetTitle?: string) => Promise<void>;
  removeWidgetContext: (widgetId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  createNewSession: () => Promise<void>;
  switchChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  renameChat: (chatId: string, newName: string) => void;
  setSelectedModel: (model: string) => void;
}

const CopilotContext = createContext<CopilotContextData | undefined>(undefined);

export const useCopilot = () => {
  const context = useContext(CopilotContext);
  if (!context) {
    throw new Error('useCopilot must be used within a CopilotProvider');
  }
  return context;
};

interface CopilotProviderProps {
  children: React.ReactNode;
}

export const CopilotProvider: React.FC<CopilotProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [contexts, setContexts] = useState<WidgetContext[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem('copilot_selected_model') || 'O4-mini-high';
  });

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      // Load saved chats
      const savedChats = localStorage.getItem('copilot_chats');
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats);
        setChats(parsedChats);
        if (parsedChats.length > 0) {
          const latestChat = parsedChats[0];
          setActiveChat(latestChat.id);
          setMessages(latestChat.messages);
          setContexts(latestChat.contexts);
        }
      } else {
        // Create initial chat if none exist
        const newChatId = Date.now().toString();
        const newChat: Chat = {
          id: newChatId,
          name: 'New Chat',
          date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
          messages: [],
          contexts: []
        };
        setChats([newChat]);
        setActiveChat(newChatId);
      }
      
      // Initialize session
      await initializeSession();
    };
    
    initialize();
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('copilot_chats', JSON.stringify(chats));
    }
  }, [chats]);

  const initializeSession = async () => {
    try {
      const id = await copilotService.createSession();
      console.log('Created session:', id);
      setSessionId(id);
    } catch (err) {
      console.error('Failed to initialize copilot session:', err);
      setError('Failed to initialize chat session');
    }
  };

  const openCopilot = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeCopilot = useCallback(() => {
    setIsOpen(false);
  }, []);

  const addWidgetContext = useCallback(async (
    widgetType: WidgetType, 
    widgetData: any, 
    ticker: string,
    widgetTitle?: string
  ) => {
    try {
      setError(null);
      
      // Extract widget data
      const context = copilotService.extractWidgetData(widgetType, widgetData, ticker);
      
      // Override title if provided
      if (widgetTitle) {
        context.title = widgetTitle;
      }
      
      // Add to backend
      await copilotService.addWidgetContext(context);
      
      // Update local state
      setContexts(prev => [...prev, context]);
      
      // Update active chat's contexts
      if (activeChat) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === activeChat 
              ? { ...chat, contexts: [...chat.contexts, context] }
              : chat
          )
        );
      }
      
      // Open copilot if not already open
      if (!isOpen) {
        setIsOpen(true);
      }
      
      // Show success notification (could be a toast)
      console.log(`Added ${context.title} to copilot context`);
      
    } catch (err) {
      console.error('Failed to add widget context:', err);
      setError('Failed to add widget data to copilot');
    }
  }, [isOpen, activeChat]);

  const removeWidgetContext = useCallback(async (widgetId: string) => {
    try {
      setError(null);
      await copilotService.removeWidgetContext(widgetId);
      setContexts(prev => prev.filter(ctx => ctx.widget_id !== widgetId));
      
      // Update active chat's contexts
      if (activeChat) {
        setChats(prevChats => 
          prevChats.map(chat => 
            chat.id === activeChat 
              ? { ...chat, contexts: chat.contexts.filter(ctx => ctx.widget_id !== widgetId) }
              : chat
          )
        );
      }
    } catch (err) {
      console.error('Failed to remove widget context:', err);
      setError('Failed to remove widget data');
    }
  }, [activeChat]);

  const sendMessage = useCallback(async (message: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Ensure we have a session
      if (!sessionId) {
        await initializeSession();
      }
      
      // Add user message immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Send to backend and get response
      console.log('Sending message to backend:', message, 'with model:', selectedModel);
      const response = await copilotService.sendMessage(message, selectedModel);
      console.log('Received response:', response);
      
      // Clear any error on success
      setError(null);
      
      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update the active chat with new messages
      if (activeChat) {
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === activeChat) {
              const updatedChat = {
                ...chat,
                messages: [...chat.messages, userMessage, assistantMessage],
                contexts: [...contexts]
              };
              
              // Update chat name if it's the first message
              if (chat.messages.length === 0 && message.trim()) {
                updatedChat.name = message.substring(0, 40) + (message.length > 40 ? '...' : '');
              }
              
              return updatedChat;
            }
            return chat;
          });
        });
      }
      
    } catch (err: any) {
      console.error('Failed to send message:', err);
      const errorDetail = err.message || 'Unknown error';
      setError(`Failed to send message: ${errorDetail}`);
      
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${errorDetail}. Please try again.`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [activeChat, contexts, selectedModel]);

  const createNewSession = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Create new session
      const id = await copilotService.createSession();
      setSessionId(id);
      
      // Create new chat
      const newChatNumber = chats.filter(c => c.name.includes('New Chat')).length + 1;
      const newChat: Chat = {
        id: Date.now().toString(),
        name: newChatNumber === 1 ? 'New Chat' : `New Chat (${newChatNumber - 1})`,
        date: new Date().toISOString().split('T')[0].replace(/-/g, '/'),
        messages: [],
        contexts: []
      };
      
      // Add new chat to beginning of list
      setChats(prev => [newChat, ...prev]);
      setActiveChat(newChat.id);
      
      // Clear local state
      setContexts([]);
      setMessages([]);
      
    } catch (err) {
      console.error('Failed to create new session:', err);
      setError('Failed to create new chat session');
    } finally {
      setIsLoading(false);
    }
  }, [chats]);

  const switchChat = useCallback((chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setActiveChat(chatId);
      setMessages(chat.messages);
      setContexts(chat.contexts);
    }
  }, [chats]);

  const deleteChat = useCallback((chatId: string) => {
    if (chats.length > 1) {
      const newChats = chats.filter(c => c.id !== chatId);
      setChats(newChats);
      
      // If deleting active chat, switch to first available
      if (activeChat === chatId) {
        const newActiveChat = newChats[0];
        setActiveChat(newActiveChat.id);
        setMessages(newActiveChat.messages);
        setContexts(newActiveChat.contexts);
      }
    }
  }, [chats, activeChat]);

  const renameChat = useCallback((chatId: string, newName: string) => {
    if (newName.trim()) {
      setChats(prevChats => 
        prevChats.map(chat => 
          chat.id === chatId ? { ...chat, name: newName.trim() } : chat
        )
      );
    }
  }, []);

  const handleSetSelectedModel = useCallback((model: string) => {
    setSelectedModel(model);
    localStorage.setItem('copilot_selected_model', model);
  }, []);

  const value: CopilotContextData = {
    isOpen,
    sessionId,
    contexts,
    messages,
    isLoading,
    error,
    chats,
    activeChat,
    selectedModel,
    openCopilot,
    closeCopilot,
    addWidgetContext,
    removeWidgetContext,
    sendMessage,
    createNewSession,
    switchChat,
    deleteChat,
    renameChat,
    setSelectedModel: handleSetSelectedModel
  };

  return (
    <CopilotContext.Provider value={value}>
      {children}
    </CopilotContext.Provider>
  );
};