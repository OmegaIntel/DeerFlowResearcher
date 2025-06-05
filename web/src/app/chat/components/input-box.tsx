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
            tools.push({
              id: `${server.name}.${tool.name}`,  // Use server.name instead of index
              name: tool.name,
              description: tool.description || `${tool.name} from ${server.name}`,
              type: "mcp"
            });
          });
        }
      });
    }

    setAvailableTools(tools);
  }, [mcpSettings]);

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
    [responding, imeStatus, handleSendMessage, showToolDropdown],
  );

  const handleMessageChange = useCallback((value: string) => {
    setMessage(value);

    // Check for @ trigger
    const atIndex = value.lastIndexOf("@");
    if (atIndex !== -1 && atIndex === value.length - 1) {
      setShowToolDropdown(true);
    } else if (atIndex !== -1) {
      const afterAt = value.substring(atIndex + 1);
      // Show dropdown if there's an @ and we're still typing after it
      if (!afterAt.includes(" ")) {
        setShowToolDropdown(true);
      } else {
        setShowToolDropdown(false);
      }
    } else {
      setShowToolDropdown(false);
    }
  }, []);

  const handleToolSelect = useCallback((tool: ToolOption) => {
    setSelectedTool(tool);
    setShowToolDropdown(false);
    
    // Replace @ with tool name in message
    const atIndex = message.lastIndexOf("@");
    if (atIndex !== -1) {
      const beforeAt = message.substring(0, atIndex);
      setMessage(`${beforeAt}@${tool.name} `);
    }
    textareaRef.current?.focus();
  }, [message]);

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
                  Select a tool or agent:
                </div>
                {availableTools.map((tool) => (
                  <button
                    key={tool.id}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground transition-colors"
                    onClick={() => handleToolSelect(tool)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{tool.name}</div>
                        <div className="text-xs text-muted-foreground">{tool.description}</div>
                      </div>
                      <div className="text-xs px-2 py-1 rounded-full bg-muted">
                        {tool.type}
                      </div>
                    </div>
                  </button>
                ))}
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
