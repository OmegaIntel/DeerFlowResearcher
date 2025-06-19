'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { getAuthToken } from '~/services/auth';
import { resolveServiceURL } from '~/core/api/resolve-service-url';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Switch } from '~/components/ui/switch';
import { CloudFileBrowser } from '~/components/deer-flow/cloud-file-browser';
import { uploadDocuments } from '~/core/api/documents';
import { toast } from 'sonner';
import {
  Plus,
  Send,
  Settings,
  ChevronDown,
  Check,
  X,
  Paperclip,
  Globe,
  Building2,
  Cloud,
  FileText,
  Database,
  Loader2,
} from 'lucide-react';
import { VoiceButton } from '~/components/voice';
import { VoiceButtonContinuous } from '~/components/voice/voice-button-continuous';

interface Tool {
  id: string;
  name: string;
  icon: React.ReactNode;
  enabled: boolean;
  beta?: boolean;
  type: 'built-in' | 'integration';
}

const SERVICE_ICONS: Record<string, any> = {
  'google-drive': FileText,
  'box': Cloud,
  'dropbox': Cloud,
  'microsoft-onedrive': Cloud,
  'microsoft-sharepoint': FileText,
  'salesforce': Database,
};

const defaultTools: Tool[] = [
  { id: 'web-search', name: 'Web search', icon: <Globe className="w-4 h-4" />, enabled: true, type: 'built-in' },
];

const availableModels = [
  { id: 'google/gemini-2.5-flash-preview-05-20', name: 'Gemini 2.5 Flash', description: 'Google\'s fast and efficient model' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Advanced reasoning and analysis' },
];

interface EnhancedInputBoxProps {
  className?: string;
  onSend?: (message: string, options?: any) => void;
  placeholder?: string;
  onFocus?: () => void;
  responding?: boolean;
  onCancel?: () => void;
  threadId?: string;
}

export function EnhancedInputBox({
  className,
  onSend,
  placeholder,
  onFocus,
  responding,
  onCancel,
  threadId,
}: EnhancedInputBoxProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash-preview-05-20');
  const [tools, setTools] = useState<Tool[]>(defaultTools);
  const [localThreadId, setLocalThreadId] = useState<string | undefined>(threadId);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [uploadedDocuments, setUploadedDocuments] = useState<{filename: string; size: number; type: string; documentId: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update local thread ID when prop changes
  useEffect(() => {
    if (threadId && threadId !== localThreadId) {
      setLocalThreadId(threadId);
    }
  }, [threadId, localThreadId]);
  const [integrationsLoaded, setIntegrationsLoaded] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [selectedCloudService, setSelectedCloudService] = useState<{type: string, name: string} | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  
  // Available tools/agents for @ mentions
  const availableMentions = [
    { id: 'web-search', name: 'Web Search', type: 'built-in', description: 'Search the web for information' },
    { id: 'research', name: 'Research Agent', type: 'agent', description: 'Conduct comprehensive research' },
    { id: 'coder', name: 'Code Assistant', type: 'agent', description: 'Help with coding tasks' },
    { id: 'llamacloud', name: 'LlamaCloud', type: 'mcp', description: 'Access document index' },
  ];

  const handleSend = useCallback(async () => {
    if (responding) {
      onCancel?.();
    } else if (message.trim() || attachedFiles.length > 0 || uploadedDocuments.length > 0) {
      // Upload any attached files first
      let allDocuments = [...uploadedDocuments];
      
      if (attachedFiles.length > 0) {
        setIsUploading(true);
        try {
          // Get the current thread ID from the store first
          const { useStore } = await import('~/core/store');
          const currentState = useStore.getState();
          let sessionId = currentState.threadId || localThreadId || threadId || 
            (window.location.pathname.includes('/chat/') ? 
              window.location.pathname.split('/chat/')[1] : 
              new URLSearchParams(window.location.search).get('thread')) || undefined;
          
          // If no session ID exists, create a new chat session and get the thread ID
          if (!sessionId) {
            console.log('[EnhancedInputBox] No thread ID found, creating new chat session...');
            const { startNewChat } = await import('~/core/store');
            await startNewChat();
            
            // Get the new thread ID from the updated store
            const newState = useStore.getState();
            sessionId = newState.threadId;
            setLocalThreadId(sessionId);
            console.log('[EnhancedInputBox] Created new chat session with thread ID:', sessionId);
            
            // Update the URL to include the thread ID
            if (sessionId && window.history.pushState) {
              const newUrl = `/chat?thread=${sessionId}`;
              window.history.pushState({}, '', newUrl);
            }
          }
            
          console.log('[EnhancedInputBox] Thread ID from props:', threadId);
          console.log('[EnhancedInputBox] Local thread ID:', localThreadId);
          console.log('[EnhancedInputBox] URL path:', window.location.pathname);
          console.log('[EnhancedInputBox] URL search:', window.location.search);
          console.log('[EnhancedInputBox] Final sessionId for upload:', sessionId);
          const uploadResponses = await uploadDocuments(attachedFiles, sessionId);
          
          // Process upload responses
          const successfulUploads = uploadResponses.filter(resp => resp.success && resp.document_id);
          
          if (successfulUploads.length > 0) {
            // Add uploaded documents to the list
            const newDocs = successfulUploads.map((resp, index) => ({
              id: resp.document_id || `doc-${Date.now()}-${index}`,
              filename: attachedFiles[index]?.name || 'Unknown',
              size: attachedFiles[index]?.size || 0,
              type: attachedFiles[index]?.type || 'application/octet-stream',
              documentId: resp.document_id!
            }));
            allDocuments = [...allDocuments, ...newDocs];
            toast.success(`${successfulUploads.length} document(s) uploaded successfully`);
            // Check if any used base64
            console.log('Upload completed. Check console for details.');
          } else {
            toast.error('Failed to upload documents');
            setIsUploading(false);
            return;
          }
        } catch (error) {
          console.error('Upload error:', error);
          toast.error('Failed to upload documents');
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }
      
      // Get the final thread ID to send with the message
      const finalThreadId = localThreadId || threadId || (await import('~/core/store')).useStore.getState().threadId;
      
      onSend?.(message, {
        model: selectedModel,
        tools: tools.filter(t => t.enabled).map(t => t.id),
        attachments: allDocuments,
        threadId: finalThreadId,
      });
      setMessage('');
      setAttachedFiles([]);
      setUploadedDocuments([]);
    }
  }, [message, responding, onSend, onCancel, selectedModel, tools, attachedFiles, uploadedDocuments]);

  const handleMessageChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    // Check for @ mentions
    const cursorPosition = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(' ');
      
      if (!hasSpaceAfterAt) {
        setMentionQuery(textAfterAt);
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions) {
      if (e.key === 'Escape') {
        setShowMentions(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        // TODO: Handle arrow navigation
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showMentions) {
        handleSend();
      }
    }
  }, [handleSend, showMentions]);

  // Handle voice commands
  const handleVoiceCommand = useCallback((command: string) => {
    console.log('[EnhancedInputBox] Voice command received:', command);
    
    // Set the voice command as the message
    setMessage(command);
    
    // Auto-send the voice command after a brief delay
    setTimeout(() => {
      if (command.trim()) {
        onSend?.(command, {
          model: selectedModel,
          tools: tools.filter(t => t.enabled).map(t => t.id),
          attachments: uploadedDocuments,
          threadId: localThreadId || threadId,
          source: 'voice' // Mark as voice input
        });
      }
    }, 100);
  }, [onSend, selectedModel, tools, uploadedDocuments, localThreadId, threadId]);

  const handleMentionSelect = useCallback((mention: typeof availableMentions[0]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = message.substring(0, cursorPosition);
    const textAfterCursor = message.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newMessage = 
      textBeforeCursor.substring(0, lastAtIndex) + 
      `@${mention.name} ` + 
      textAfterCursor;
    
    setMessage(newMessage);
    setShowMentions(false);
    
    // Focus back to textarea
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = lastAtIndex + mention.name.length + 2;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [message]);

  const toggleTool = useCallback((toolId: string) => {
    setTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    ));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit with chunked uploads
    
    // Check file sizes
    const validFiles = files.filter(file => {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `File "${file.name}" is ${fileSizeMB}MB. Maximum size is 50MB. ` +
          `Please use a smaller file or compress your document.`
        );
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      validFiles.forEach(file => {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        const uploadMethod = parseFloat(sizeMB) > 5 ? 'chunked upload' : 'direct upload';
        toast.info(`Added ${file.name} (${sizeMB}MB) - will use ${uploadMethod}`);
      });
    }
    
    setAttachedFiles(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Load integrations
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const token = getAuthToken();
        const response = await fetch(resolveServiceURL('/integrations'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const integrations = await response.json();
          
          const integrationTools: Tool[] = integrations
            .filter((int: any) => int.enabled)
            .map((int: any) => {
              const Icon = SERVICE_ICONS[int.service_type] || Building2;
              const isConnected = int.is_connected;
              return {
                id: `integration-${int.service_type}`,
                name: int.service_name + (isConnected ? '' : ' (Not Connected)'),
                icon: <Icon className="w-4 h-4" />,
                enabled: isConnected,
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

    if (!integrationsLoaded) {
      loadIntegrations();
    }
  }, [integrationsLoaded]);

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
    <div className={cn("relative rounded-2xl border bg-background shadow-sm max-w-4xl mx-auto", className)}>
      {/* Attached files */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({(file.size / 1024 / 1024).toFixed(1)}MB)
              </span>
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

      {/* Message input - larger area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          className="w-full resize-none border-0 bg-transparent px-4 py-4 text-base focus:outline-none"
          placeholder={placeholder || "How can I help you today?"}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          rows={3}
          style={{
            minHeight: '80px',
            maxHeight: '200px',
          }}
        />
        
        {/* @ Mentions dropdown */}
        {showMentions && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
            <div className="p-2">
              <div className="text-xs text-gray-500 mb-2">Available tools and agents:</div>
              {availableMentions
                .filter(mention => 
                  mention.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                  mention.type.toLowerCase().includes(mentionQuery.toLowerCase())
                )
                .map((mention) => (
                  <button
                    key={mention.id}
                    onClick={() => handleMentionSelect(mention)}
                    className="w-full text-left p-2 hover:bg-gray-100 rounded-md flex items-start gap-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">@{mention.name}</div>
                      <div className="text-xs text-gray-500">{mention.description}</div>
                      <div className="text-xs text-blue-600 mt-1">{mention.type}</div>
                    </div>
                  </button>
                ))}
              {availableMentions.filter(mention => 
                mention.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
                mention.type.toLowerCase().includes(mentionQuery.toLowerCase())
              ).length === 0 && (
                <div className="p-2 text-sm text-gray-500">No matching tools found</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between border-t px-4 py-3">
        <div className="flex items-center gap-2">
          {/* Attach files button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          {/* Voice input button */}
          <VoiceButtonContinuous
            className="h-8 w-8"
            disabled={responding || isUploading}
            silenceTimeout={3000}
            onTranscript={(transcript, isFinal) => {
              console.log('[EnhancedInputBox] Voice transcript:', transcript, 'Final:', isFinal);
              if (isFinal) {
                // For final transcripts, append to existing message
                setMessage(prev => {
                  const newMessage = prev ? `${prev} ${transcript}` : transcript;
                  return newMessage;
                });
              } else {
                // For interim results, you could show them differently
                // For now, we'll skip interim updates to avoid confusion
              }
            }}
          />

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
                    {tools.filter(t => t.type === 'integration').map((tool) => {
                      const isNotConnected = tool.name.includes('(Not Connected)');
                      const cleanName = tool.name.replace(' (Not Connected)', '');
                      const serviceType = tool.id.replace('integration-', '');
                      
                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-accent cursor-pointer"
                          onClick={() => {
                            if (!isNotConnected && !tool.enabled) {
                              setSelectedCloudService({ 
                                type: serviceType, 
                                name: cleanName 
                              });
                              setFilePickerOpen(true);
                              setShowToolMenu(false);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(!isNotConnected && "opacity-100", isNotConnected && "opacity-50")}>
                              {tool.icon}
                            </div>
                            <span className={cn(
                              "text-sm font-medium",
                              isNotConnected && "text-muted-foreground"
                            )}>
                              {tool.name}
                            </span>
                          </div>
                          {isNotConnected ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowToolMenu(false);
                                router.push('/account?tab=integrations');
                              }}
                            >
                              Connect
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {tool.enabled ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedCloudService({ 
                                      type: serviceType, 
                                      name: tool.name 
                                    });
                                    setFilePickerOpen(true);
                                    setShowToolMenu(false);
                                  }}
                                >
                                  Browse Files
                                </Button>
                              ) : (
                                <Switch
                                  checked={tool.enabled}
                                  onCheckedChange={() => toggleTool(tool.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
        </div>
        
        <div className="flex items-center gap-2">
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
            onClick={handleSend}
            disabled={responding || isUploading || (!message.trim() && attachedFiles.length === 0)}
            className="ml-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : responding ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.xlsx,.xls,.ppt,.pptx"
      />
      
      {/* Cloud File Browser */}
      {filePickerOpen && selectedCloudService && (
        <CloudFileBrowser
          isOpen={filePickerOpen}
          onClose={() => {
            setFilePickerOpen(false);
            setSelectedCloudService(null);
          }}
          serviceType={selectedCloudService.type}
          serviceName={selectedCloudService.name}
          onFilesSelected={(cloudFiles) => {
            cloudFiles.forEach(cloudFile => {
              const file = new File([''], cloudFile.name, { type: cloudFile.mime_type || 'application/octet-stream' });
              (file as any).cloudMetadata = {
                id: cloudFile.id,
                service: selectedCloudService.type,
                size: cloudFile.size
              };
              setAttachedFiles(prev => [...prev, file]);
            });
          }}
        />
      )}
    </div>
  );
}