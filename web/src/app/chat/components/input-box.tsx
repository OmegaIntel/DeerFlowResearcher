// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, X, ChevronDown, Paperclip } from "lucide-react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Detective } from "~/components/deer-flow/icons/detective";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { Button } from "~/components/ui/button";
import { uploadFilesToPinecone, getPineconeUploadJobStatus, type PineconeUploadJobStatus } from "~/core/api/pinecone";
import { resolveServiceURL } from "~/core/api/resolve-service-url";
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
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
      if (message.trim() === "") {
        return;
      }
      if (onSend) {
        let finalMessage = message;
        const options: {
          interruptFeedback?: string;
          toolId?: string;
          toolType?: "mcp" | "agent" | "research";
        } = {
          interruptFeedback: feedback?.option.value,
        };

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
        onRemoveFeedback?.();
      }
    }
  }, [responding, onCancel, message, onSend, feedback, onRemoveFeedback, selectedTool]);

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
        setTimeout(() => void pollUploadStatus(jobId), 2000); // Poll every 2 seconds
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
          const indexHost = status.result?.index_host ?? status.index_host ?? 'Unknown';
          const vectorsUpserted = status.result?.vectors_upserted ?? status.vectors_upserted ?? 0;
          const chunksCreated = status.result?.chunks_created ?? 0;
          
          alert(`Upload completed!\n\nBackend message: ${status.message}\n\nIndex Name: ${indexName}\nIndex Host: ${indexHost}\nVectors Upserted: ${vectorsUpserted}\nChunks Created: ${chunksCreated}`);
        } else if (status.status === "failed") {
          console.error("Upload failed:", status.error);
          alert(`Upload failed: ${status.error}`);
        }
        
        // Remove from active uploads after a delay
        setTimeout(() => {
          setActiveUploads(prev => {
            const newMap = new Map(prev);
            newMap.delete(jobId);
            return newMap;
          });
        }, 5000);
      }
    } catch (error) {
      console.error("Error polling upload status:", error);
    }
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const filesArray = Array.from(files);
      
      // Upload files to Pinecone (now async)
      console.log("Uploading files to Pinecone...", filesArray);
      const response = await uploadFilesToPinecone(filesArray);
      
      if (response.success && response.job_id) {
        console.log("Upload job started:", response);
        
        // Add files to uploaded list
        setUploadedFiles(prev => [...prev, ...filesArray]);
        
        // Start polling for status
        void pollUploadStatus(response.job_id);
        
        // Show initial success message
        alert(`Upload started! Job ID: ${response.job_id}\nProcessing ${filesArray.length} files in background...`);
        
      } else {
        console.error("Upload failed:", response.error);
        alert(`Upload failed: ${response.message}`);
      }
      
    } catch (error) {
      console.error("Error uploading files:", error);
      alert(`Error uploading files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [pollUploadStatus]);

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
          <div className="px-4 pt-2">
            {Array.from(activeUploads.values()).map((upload) => (
              <div
                key={upload.job_id}
                className="mb-2 rounded-md bg-muted p-2 text-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{upload.files.length} files</span>
                  <span className="text-xs text-muted-foreground">{upload.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mb-1">{upload.message}</div>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {upload.progress}% complete
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploaded files display */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm"
              >
                <Paperclip className="h-3 w-3" />
                <span className="max-w-[200px] truncate">{file.name}</span>
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
        <div className="mr-2 relative">
          <select
            className="rounded-md border px-2 py-1 text-sm appearance-none pr-8"
            value={selectedTool ? selectedTool.type === "agent" && selectedTool.id === "research" ? "research" : "tool" : mode}
            onChange={(e) => {
              if (e.target.value === "research") {
                setSelectedTool({ id: "research", name: "Research", description: "Deep research on any topic", type: "agent" });
              } else if (e.target.value === "chat") {
                setSelectedTool(null);
                setMode("chat");
              } else {
                setMode(e.target.value as "chat" | "research");
                setSelectedTool(null);
              }
            }}
          >
            <option value="chat">Chat</option>
            <option value="research">Research</option>
            {selectedTool && selectedTool.type === "mcp" && (
              <option value="tool">{selectedTool.name}</option>
            )}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 pointer-events-none" />
        </div>
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
            accept=".pdf,.doc,.docx,.txt,.csv,.json,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Tooltip title="Upload files to Pinecone">
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
