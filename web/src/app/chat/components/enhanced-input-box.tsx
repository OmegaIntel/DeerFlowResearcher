'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Send, 
  Paperclip, 
  Search, 
  Globe, 
  FileSearch, 
  Mail, 
  Calendar,
  ChevronDown,
  Plus,
  Settings,
  X,
  Check,
  Box,
  Cloud,
  FileText,
  Database,
  Building2,
  FolderOpen
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { Button } from '~/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '~/components/ui/dropdown-menu';
import { Switch } from '~/components/ui/switch';
import { getAuthToken } from '~/services/auth';
import { resolveServiceURL } from '~/core/api/resolve-service-url';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  beta?: boolean;
  type?: 'built-in' | 'integration';
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  'box': Box,
  'dropbox': Cloud,
  'google-drive': FolderOpen,
  'microsoft-outlook': Mail,
  'microsoft-onedrive': Cloud,
  'microsoft-sharepoint': FileText,
  'salesforce': Database,
};

const defaultTools: Tool[] = [
  { id: 'web-search', name: 'Web search', icon: <Globe className="w-4 h-4" />, enabled: true, type: 'built-in' },
];

const availableModels = [
  { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.5 Flash', description: 'Google\'s fast and efficient model' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Advanced reasoning and analysis' },
  { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', description: 'OpenAI\'s latest flagship model' },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', description: 'Open source powerhouse' },
];

interface EnhancedInputBoxProps {
  className?: string;
  onSend?: (message: string, options?: any) => void;
  onFocus?: () => void;
  placeholder?: string;
  responding?: boolean;
  onCancel?: () => void;
}

export function EnhancedInputBox({
  className,
  onSend,
  onFocus,
  placeholder,
  responding,
  onCancel,
}: EnhancedInputBoxProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.0-flash-exp:free');
  const [tools, setTools] = useState<Tool[]>(defaultTools);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false);

  const handleSend = useCallback(() => {
    if (responding) {
      onCancel?.();
    } else if (message.trim() || attachedFiles.length > 0) {
      onSend?.(message, {
        model: selectedModel,
        tools: tools.filter(t => t.enabled).map(t => t.id),
        files: attachedFiles,
      });
      setMessage('');
      setAttachedFiles([]);
    }
  }, [message, responding, onSend, onCancel, selectedModel, tools, attachedFiles]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const toggleTool = useCallback((toolId: string) => {
    setTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    ));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Load integrations on mount
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      
      const response = await fetch(resolveServiceURL('/integrations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const integrations = await response.json();
        
        // Add enabled and connected integrations to tools
        const integrationTools: Tool[] = integrations
          .filter((int: any) => int.enabled && int.is_connected)
          .map((int: any) => {
            const Icon = SERVICE_ICONS[int.service_type] || Building2;
            return {
              id: `integration-${int.service_type}`,
              name: int.service_name,
              icon: <Icon className="w-4 h-4" />,
              enabled: true,
              type: 'integration' as const,
            };
          });
        
        setTools([...defaultTools, ...integrationTools]);
        setIntegrationsLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load integrations:', error);
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [message]);

  const selectedModelData = availableModels.find(m => m.id === selectedModel);

  return (
    <div className={cn("relative rounded-2xl border bg-background shadow-sm", className)}>
      {/* Top toolbar */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        {/* Attach files button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Plus className="h-4 w-4" />
        </Button>

        {/* Tools dropdown */}
        <DropdownMenu open={showToolMenu} onOpenChange={setShowToolMenu}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">Tools</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            <div className="p-2">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-sm font-medium">Search tools</span>
              </div>
              {/* Built-in tools */}
              <div className="mb-2">
                <span className="px-2 text-xs text-muted-foreground">Built-in Tools</span>
              </div>
              {tools.filter(t => t.type === 'built-in').map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    {tool.icon}
                    <span className="text-sm font-medium">{tool.name}</span>
                    {tool.beta && (
                      <span className="text-xs text-blue-600 font-medium">BETA</span>
                    )}
                  </div>
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={() => toggleTool(tool.id)}
                  />
                </div>
              ))}
              
              {/* Integration tools */}
              {tools.filter(t => t.type === 'integration').length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-2" />
                  <div className="mb-2">
                    <span className="px-2 text-xs text-muted-foreground">Connected Services</span>
                  </div>
                  {tools.filter(t => t.type === 'integration').map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent"
                    >
                      <div className="flex items-center gap-3">
                        {tool.icon}
                        <span className="text-sm font-medium">{tool.name}</span>
                      </div>
                      <Switch
                        checked={tool.enabled}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                    </div>
                  ))}
                </>
              )}
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem 
                className="text-sm cursor-pointer"
                onSelect={() => {
                  setShowToolMenu(false);
                  router.push('/account?tab=integrations');
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add integrations
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Model selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2"
            >
              <span className="text-sm font-medium">{selectedModelData?.name}</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {availableModels.map((model) => (
              <DropdownMenuItem
                key={model.id}
                className="flex flex-col items-start gap-1 p-3"
                onSelect={() => setSelectedModel(model.id)}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">{model.name}</span>
                  {selectedModel === model.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {model.description}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Send button */}
        <Button
          size="sm"
          className="h-8 w-8 p-0"
          onClick={handleSend}
          disabled={!message.trim() && attachedFiles.length === 0 && !responding}
        >
          {responding ? (
            <div className="h-3 w-3 bg-background" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b px-3 py-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search/Research mode indicator */}
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Research</span>
        <span className="text-xs text-blue-600 font-medium">BETA</span>
      </div>

      {/* Message input */}
      <textarea
        ref={textareaRef}
        className="w-full resize-none border-0 bg-transparent px-4 py-3 text-base focus:outline-none"
        placeholder={placeholder || "How can I help you today?"}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        rows={1}
        style={{
          minHeight: '24px',
          maxHeight: '200px',
        }}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.xlsx,.xls,.ppt,.pptx"
      />
    </div>
  );
}