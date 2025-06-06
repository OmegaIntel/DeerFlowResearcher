// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, X, ChevronDown } from "lucide-react";
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
  const mode = useStore((state) => state.mode);
  const setMode = useStore((state) => state.setMode);
  const backgroundInvestigation = useSettingsStore(
    (state) => state.general.enableBackgroundInvestigation,
  );
  const mcpSettings = useSettingsStore((state) => state.mcp);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load available tools from MCP settings
  useEffect(() => {
    const tools: ToolOption[] = [
      // Add research and agent options
      { id: "research", name: "Research", description: "Deep research on any topic", type: "agent" },
    ];

    // Add MCP tools from settings
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

    setAvailableTools(tools);
    setFilteredTools(tools); // Initialize filtered tools
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
                    No tools found matching "{toolSearchQuery}"
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
