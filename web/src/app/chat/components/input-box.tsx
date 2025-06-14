// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, X, ChevronDown, Paperclip, CheckCircle, Upload, AlertCircle } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { Detective } from "~/components/deer-flow/icons/detective";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { Button } from "~/components/ui/button";
import { uploadFilesToPinecone, getPineconeUploadJobStatus, type PineconeUploadJobStatus } from "~/core/api/pinecone";
import { uploadFileToS3 } from "~/core/api/s3";
import { resolveServiceURL } from "~/core/api/resolve-service-url";
import { getAuthToken } from "~/services/auth";
import type { Option } from "~/core/messages";
import {
  setEnableBackgroundInvestigation,
  useSettingsStore,
  useStore,
} from "~/core/store";
import { cn } from "~/lib/utils";

interface ToolOption {
  id: string;
  name: string;
  description: string;
  type: "mcp" | "agent";
}

// Helper component to highlight matching text
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, index) => 
        regex.test(part) ? (
          <mark key={index} className="bg-yellow-200 text-yellow-800 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

export function InputBox({
  className,
  size,
  responding,
  feedback,
  onSend,
  onCancel,
  onRemoveFeedback,
}: {
  className?: string;
  size?: "large" | "normal";
  responding?: boolean;
  feedback?: { option: Option } | null;
  onSend?: (message: string, options?: { interruptFeedback?: string; toolId?: string; toolType?: "mcp" | "agent" | "research" }) => void;
  onCancel?: () => void;
  onRemoveFeedback?: () => void;
}) {
  const [message, setMessage] = useState("");
  const [imeStatus, setImeStatus] = useState<"active" | "inactive">("inactive");
  const [indent, setIndent] = useState(0);
  const [showToolDropdown, setShowToolDropdown] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolOption | null>(null);
  const [availableTools, setAvailableTools] = useState<ToolOption[]>([]);
  const [filteredTools, setFilteredTools] = useState<ToolOption[]>([]);
  const [toolSearchQuery, setToolSearchQuery] = useState("");
  const [selectedDropdownIndex, setSelectedDropdownIndex] = useState(-1);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{
    file: File;
    documentId?: string;
  }>>([]);
  const [activeUploads, setActiveUploads] = useState<Map<string, PineconeUploadJobStatus>>(new Map());
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const backgroundInvestigation = useSettingsStore(
    (state) => state.general.enableBackgroundInvestigation,
  );
  const mcpSettings = useSettingsStore((state) => state.mcp);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available tools from MCP settings
  useEffect(() => {
    const loadTools = async () => {
      const tools: ToolOption[] = [
        // Add research and agent options
        { id: "research", name: "Research", description: "Deep research on any topic", type: "agent" },
        { id: "documents", name: "Documents", description: "Search and ask questions about uploaded documents", type: "agent" },
      ];

      // Fetch backend-configured MCP servers
      try {
        const url = resolveServiceURL("mcp/backend-servers");
        console.log("Fetching from URL:", url);
        const response = await fetch(url);
        console.log("Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Backend servers response:", data);
          const backendServers = data.servers ?? [];
          
          // Add backend servers to tools
          backendServers.forEach((server: {id: string; enabled: boolean; tools: {name: string; description: string}[]; name: string}) => {
            if (server.enabled && server.tools) {
              server.tools.forEach((tool: {name: string; description: string}) => {
                // Extract only the first line/sentence of description
                let description = tool.description ?? `${tool.name} from ${server.name}`;
                
                // Remove everything after the first line break or first sentence
                const firstLineBreak = description.indexOf('\n');
                const firstPeriod = description.indexOf('. ');
                
                if (firstLineBreak > 0 && firstLineBreak < 100) {
                  description = description.substring(0, firstLineBreak).trim();
                } else if (firstPeriod > 0 && firstPeriod < 100) {
                  description = description.substring(0, firstPeriod + 1).trim();
                }
                
                // Further truncate if still too long
                if (description.length > 80) {
                  description = description.substring(0, 77) + "...";
                }
                
                // Remove any markdown formatting
                description = description.replace(/\[|\]/g, '').trim();
                
                tools.push({
                  id: `${server.id}.${tool.name}`,  // Use server ID instead of name
                  name: tool.name,
                  description: description,
                  type: "mcp"
                });
              });
            }
          });
        } else {
          console.error("Failed to fetch backend servers, status:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch backend MCP servers:", error);
      }

      // Add MCP tools from frontend settings
      if (mcpSettings.servers) {
        // mcpSettings.servers is an array, not an object
        mcpSettings.servers.forEach((server) => {
        if (server.enabled && server.tools) {
          server.tools.forEach((tool) => {
            // Extract only the first line/sentence of description
            let description = tool.description || `${tool.name} from ${server.name}`;
            
            // Remove everything after the first line break or first sentence
            const firstLineBreak = description.indexOf('\n');
            const firstPeriod = description.indexOf('. ');
            
            if (firstLineBreak > 0 && firstLineBreak < 100) {
              description = description.substring(0, firstLineBreak).trim();
            } else if (firstPeriod > 0 && firstPeriod < 100) {
              description = description.substring(0, firstPeriod + 1).trim();
            }
            
            // Further truncate if still too long
            if (description.length > 80) {
              description = description.substring(0, 77) + "...";
            }
            
            // Remove any markdown formatting
            description = description.replace(/\[|\]/g, '').trim();
            
            tools.push({
              id: `${server.name}.${tool.name}`,  // Use server.name instead of index
              name: tool.name,
              description: description,
              type: "mcp"
            });
          });
        }
      });
    }

      // Deduplicate tools by ID to prevent duplicates from backend and frontend sources
      const uniqueTools = tools.filter((tool, index, self) => 
        index === self.findIndex(t => t.id === tool.id)
      );
      
      console.log(`Loaded ${tools.length} tools, deduplicated to ${uniqueTools.length} unique tools`);
      setAvailableTools(uniqueTools);
      setFilteredTools(uniqueTools); // Initialize filtered tools
    };

    void loadTools();
  }, [mcpSettings]);

  // Filter tools based on search query
  useEffect(() => {
    if (!toolSearchQuery.trim()) {
      setFilteredTools(availableTools);
      console.log("No search query, showing all tools:", availableTools.length);
    } else {
      const query = toolSearchQuery.toLowerCase();
      const filtered = availableTools.filter((tool) => 
        tool.name.toLowerCase().includes(query) ||
        tool.id.toLowerCase().includes(query)
      );
      setFilteredTools(filtered);
      console.log(`Filtering with query "${query}": ${filtered.length} of ${availableTools.length} tools`);
    }
    setSelectedDropdownIndex(-1); // Reset selection when filtering
  }, [toolSearchQuery, availableTools]);

  useEffect(() => {
    if (feedback) {
      setMessage("");

      setTimeout(() => {
        if (feedbackRef.current) {
          setIndent(feedbackRef.current.offsetWidth);
        }
      }, 200);
    }
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
  }, [feedback]);

  // Handle @ trigger detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowToolDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSendMessage = useCallback(() => {
    if (responding) {
      onCancel?.();
    } else {
      if (message.trim() === "" && uploadedFiles.length === 0) {
        return;
      }
      if (onSend) {
        let finalMessage = message;
        const options: {
          interruptFeedback?: string;
          toolId?: string;
          toolType?: "mcp" | "agent" | "research";
          attachments?: { filename: string; size: number; type: string }[];
        } = {
          interruptFeedback: feedback?.option.value,
        };

        // Include uploaded files information
        if (uploadedFiles.length > 0) {
          options.attachments = uploadedFiles.map(item => ({
            filename: item.file.name,
            size: item.file.size,
            type: item.file.type || 'application/octet-stream',
            documentId: item.documentId
          }));
          console.log("[InputBox] Sending message with attachments:", options.attachments);
          
          // Add a note about uploaded files to the message if message is empty
          if (!finalMessage.trim()) {
            finalMessage = `[Uploaded ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}]`;
          }
        }

        // Handle @ tool selection
        if (selectedTool) {
          options.toolId = selectedTool.id;
          options.toolType = selectedTool.type;
          // Remove @ mentions from the message
          finalMessage = message.replace(/@\w+\s*/, "").trim();
        }

        onSend(finalMessage, options);
        setMessage("");
        setSelectedTool(null);
        setShowToolDropdown(false);
        setUploadedFiles([]); // Clear uploaded files after sending
        onRemoveFeedback?.();
      }
    }
  }, [responding, onCancel, message, onSend, feedback, onRemoveFeedback, selectedTool, uploadedFiles]);

  const handleToolSelect = useCallback((tool: ToolOption) => {
    setSelectedTool(tool);
    setShowToolDropdown(false);
    setToolSearchQuery(""); // Clear search query
    setSelectedDropdownIndex(-1); // Reset dropdown selection
    
    // Replace @query with tool name in message
    const atIndex = message.lastIndexOf("@");
    if (atIndex !== -1) {
      const beforeAt = message.substring(0, atIndex);
      const afterAt = message.substring(atIndex + 1);
      // Check if there's a query after @ (no space yet)
      if (!afterAt.includes(" ")) {
        setMessage(`${beforeAt}@${tool.name} `);
      } else {
        // If there's already a space, just replace up to that space
        const spaceIndex = afterAt.indexOf(" ");
        const restOfMessage = afterAt.substring(spaceIndex);
        setMessage(`${beforeAt}@${tool.name}${restOfMessage}`);
      }
    }
    textareaRef.current?.focus();
  }, [message]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (responding) {
        return;
      }

      // Handle dropdown navigation
      if (showToolDropdown) {
        if (event.key === "Escape") {
          event.preventDefault();
          setShowToolDropdown(false);
          setSelectedDropdownIndex(-1);
          return;
        }
        
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedDropdownIndex(prev => 
            prev < filteredTools.length - 1 ? prev + 1 : 0
          );
          return;
        }
        
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedDropdownIndex(prev => 
            prev > 0 ? prev - 1 : filteredTools.length - 1
          );
          return;
        }
        
        if (event.key === "Enter" && selectedDropdownIndex >= 0) {
          event.preventDefault();
          const selectedTool = filteredTools[selectedDropdownIndex];
          if (selectedTool) {
            handleToolSelect(selectedTool);
          }
          return;
        }
      }

      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        imeStatus === "inactive"
      ) {
        event.preventDefault();
        handleSendMessage();
      }
    },
    [responding, imeStatus, handleSendMessage, showToolDropdown, filteredTools, selectedDropdownIndex, handleToolSelect],
  );

  const handleMessageChange = useCallback((value: string) => {
    setMessage(value);

    // Check for @ trigger and extract search query
    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1) {
      const afterAt = value.substring(atIndex + 1);
      
      // Show dropdown if there's an @ and we're still typing after it (no space)
      if (!afterAt.includes(" ")) {
        setShowToolDropdown(true);
        setToolSearchQuery(afterAt); // Update search query for filtering
        setSelectedDropdownIndex(-1); // Reset dropdown selection
        console.log("Tool search query:", afterAt); // Debug log
      } else {
        setShowToolDropdown(false);
        setToolSearchQuery("");
        setSelectedDropdownIndex(-1);
      }
    } else {
      setShowToolDropdown(false);
      setToolSearchQuery("");
      setSelectedDropdownIndex(-1);
    }
  }, []);

  // Function to poll upload status
  const pollUploadStatus = useCallback(async (jobId: string) => {
    try {
      const status = await getPineconeUploadJobStatus(jobId);
      
      setActiveUploads(prev => new Map(prev.set(jobId, status)));
      
      // If job is still processing, continue polling
      if (status.status === "processing" || status.status === "pending") {
        setTimeout(() => void pollUploadStatus(jobId), 1500); // Poll every 1.5 seconds for smoother updates
      } else {
        // Job completed or failed
        if (status.status === "completed") {
          console.log("Upload completed:", status);
          console.log("Status message:", status.message);
          console.log("Index name:", status.index_name);
          console.log("Index host:", status.index_host);
          console.log("Result object:", status.result);
          
          // Show the actual backend message instead of our custom one
          const indexName = status.result?.index_name ?? status.index_name ?? 'Unknown';
          const vectorsUpserted = status.result?.vectors_upserted ?? status.vectors_upserted ?? 0;
          const chunksCreated = status.result?.chunks_created ?? 0;
          
          // Show success toast
          toast.success("Documents processed successfully!", {
            description: `${vectorsUpserted} vectors created from ${chunksCreated} chunks in ${indexName}`,
            duration: 4000,
          });
          
          // Keep files visible - don't auto-remove
          
        } else if (status.status === "failed") {
          toast.error("Upload failed", {
            description: status.error || "An error occurred during processing",
            duration: 6000,
          });
        }
        
        // Remove from active uploads after a delay
        setTimeout(() => {
          setActiveUploads(prev => {
            const newMap = new Map(prev);
            newMap.delete(jobId);
            return newMap;
          });
        }, 2000);
      }
    } catch (error) {
      console.error("Error polling upload status:", error);
      toast.error("Failed to check upload status", {
        description: "Please check your connection and try again",
        duration: 4000,
      });
    }
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    console.log('[InputBox] File upload initiated, files:', Array.from(files).map(f => ({ name: f.name, size: f.size })));
    
    // Get current thread/session ID
    const threadId = useStore.getState().threadId;
    console.log('[InputBox] Current thread ID:', threadId);
    
    // Check auth token before upload
    const authToken = getAuthToken();
    console.log('[InputBox] Auth token check before upload:', {
      exists: !!authToken,
      length: authToken?.length || 0
    });

    setIsUploading(true);
    try {
      const filesArray = Array.from(files);
      const uploadedItems: Array<{file: File; documentId?: string}> = [];
      
      // Upload files to S3 one by one
      for (const file of filesArray) {
        try {
          console.log("[InputBox] Uploading file to S3...", file.name);
          const response = await uploadFileToS3(file, threadId);
          
          if (response.success) {
            console.log("[InputBox] File uploaded successfully:", response);
            uploadedItems.push({
              file,
              documentId: response.document?.id
            });
          } else {
            console.error("[InputBox] Upload failed response:", response);
            toast.error(`Failed to upload ${file.name}`, {
              description: response.message,
              duration: 4000,
            });
          }
        } catch (error) {
          console.error(`[InputBox] Error uploading ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}`, {
            description: error instanceof Error ? error.message : 'Unknown error',
            duration: 4000,
          });
        }
      }
      
      if (uploadedItems.length > 0) {
        toast.success("Upload complete!", {
          description: `Successfully uploaded ${uploadedItems.length} of ${filesArray.length} file${filesArray.length > 1 ? 's' : ''}`,
          duration: 3000,
        });
        
        // Add files to uploaded list for display
        setUploadedFiles(prev => [...prev, ...uploadedItems]);
      }
      
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Upload error", {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 5000,
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, []);

  return (
    <div className={cn("bg-card relative rounded-[24px] border", className)}>
      <div className="w-full">
        <AnimatePresence>
          {feedback && (
            <motion.div
              ref={feedbackRef}
              className="bg-background border-brand absolute top-0 left-0 mt-3 ml-2 flex items-center justify-center gap-1 rounded-2xl border px-2 py-0.5"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="text-brand flex h-full w-full items-center justify-center text-sm opacity-90">
                {feedback.option.text}
              </div>
              <X
                className="cursor-pointer opacity-60"
                size={16}
                onClick={onRemoveFeedback}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Active uploads progress */}
        {activeUploads.size > 0 && (
          <motion.div 
            className="px-4 pt-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {Array.from(activeUploads.values()).map((upload) => (
              <motion.div
                key={upload.job_id}
                className="mb-2 rounded-lg bg-muted/50 p-3 text-sm border"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {upload.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : upload.status === "failed" ? (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Upload className="h-4 w-4 text-blue-500 animate-pulse" />
                    )}
                    <span className="font-medium">{upload.files.length} file{upload.files.length > 1 ? 's' : ''}</span>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    upload.status === "completed" && "bg-green-100 text-green-700",
                    upload.status === "failed" && "bg-red-100 text-red-700",
                    (upload.status === "processing" || upload.status === "pending") && "bg-blue-100 text-blue-700"
                  )}>
                    {upload.status === "processing" ? "Processing..." : 
                     upload.status === "pending" ? "Queued" :
                     upload.status === "completed" ? "Complete" : 
                     upload.status}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mb-2">{upload.message}</div>
                <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-2 rounded-full transition-all duration-500",
                      upload.status === "completed" ? "bg-green-500" :
                      upload.status === "failed" ? "bg-red-500" :
                      "bg-blue-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${upload.progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                  <span>{upload.progress}% complete</span>
                  <span className="text-xs opacity-70">Job ID: {upload.job_id.slice(-8)}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Uploaded files display */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-2">
            {uploadedFiles.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[200px] truncate">{item.file.name}</span>
                <button
                  onClick={() => {
                    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <textarea
          ref={textareaRef}
          className={cn(
            "m-0 w-full resize-none border-none px-4 py-3 text-lg",
            size === "large" ? "min-h-32" : "min-h-4",
          )}
          style={{ textIndent: feedback ? `${indent}px` : 0 }}
          placeholder={
            feedback
              ? `Describe how you ${feedback.option.text.toLocaleLowerCase()}?`
              : "What can I do for you?"
          }
          value={message}
          onCompositionStart={() => setImeStatus("active")}
          onCompositionEnd={() => setImeStatus("inactive")}
          onKeyDown={handleKeyDown}
          onChange={(event) => {
            handleMessageChange(event.target.value);
          }}
        />
        
        {/* Tool Dropdown */}
        <AnimatePresence>
          {showToolDropdown && (
            <motion.div
              ref={dropdownRef}
              className="absolute bottom-full left-4 right-4 mb-2 max-h-60 overflow-y-auto rounded-lg border bg-background shadow-lg z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-2">
                <div className="text-xs text-muted-foreground mb-2 px-2">
                  {toolSearchQuery 
                    ? `Searching for "${toolSearchQuery}"...` 
                    : "Select a tool or agent:"
                  }
                  {toolSearchQuery && filteredTools.length > 0 && (
                    <span className="ml-1 text-green-600">
                      ({filteredTools.length} found)
                    </span>
                  )}
                </div>
                {filteredTools.length > 0 ? (
                  filteredTools.map((tool, index) => (
                    <button
                      key={tool.id}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md transition-colors",
                        index === selectedDropdownIndex 
                          ? "bg-accent text-accent-foreground" 
                          : "hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      )}
                      onClick={() => handleToolSelect(tool)}
                      onMouseEnter={() => setSelectedDropdownIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">
                          {toolSearchQuery ? (
                            <HighlightMatch text={tool.name} query={toolSearchQuery} />
                          ) : (
                            tool.name
                          )}
                        </div>
                        <div className="text-xs px-2 py-1 rounded-full bg-muted">
                          {tool.type}
                        </div>
                      </div>
                    </button>
                  ))
                ) : toolSearchQuery ? (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No tools found matching &quot;{toolSearchQuery}&quot;
                  </div>
                ) : (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No tools available
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center px-4 py-2">
        <div className="flex grow">
          <Tooltip
            className="max-w-60"
            title={
              <div>
                <h3 className="mb-2 font-bold">
                  Investigation Mode: {backgroundInvestigation ? "On" : "Off"}
                </h3>
                <p>
                  When enabled, Omega will perform a quick search before
                  planning. This is useful for researches related to ongoing
                  events and news.
                </p>
              </div>
            }
          >
            <Button
              className={cn(
                "rounded-2xl",
                backgroundInvestigation && "!border-brand !text-brand",
              )}
              variant="outline"
              size="lg"
              onClick={() =>
                setEnableBackgroundInvestigation(!backgroundInvestigation)
              }
            >
              <Detective /> Investigation
            </Button>
          </Tooltip>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.csv,.json,.md,.xlsx,.xls,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Tooltip title="Upload files to S3">
            <Button
              variant="outline"
              size="icon"
              className={cn("h-10 w-10 rounded-full", isUploading && "animate-pulse")}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </Tooltip>
          <Tooltip title={responding ? "Stop" : "Send"}>
            <Button
              variant="outline"
              size="icon"
              className={cn("h-10 w-10 rounded-full")}
              onClick={handleSendMessage}
            >
              {responding ? (
                <div className="flex h-10 w-10 items-center justify-center">
                  <div className="bg-foreground h-4 w-4 rounded-sm opacity-70" />
                </div>
              ) : (
                <ArrowUp />
              )}
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
