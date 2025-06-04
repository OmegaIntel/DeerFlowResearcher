"use client";
import { useState, useCallback } from "react";
import type { KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { CommandDialog, CommandInput, CommandItem, CommandList } from "~/components/ui/command";
import { useSettingsStore } from "~/core/store";
import { cn } from "~/lib/utils";

export function MCPInputBox({ className, onSend }: { className?: string; onSend?: (message: string) => void }) {
  const [message, setMessage] = useState("");
  const [showTools, setShowTools] = useState(false);
  const servers = useSettingsStore((state) => state.mcp.servers);
  const tools = servers.flatMap((s) => s.tools.map((t) => ({ server: s.name, name: t.name })));

  const handleSend = useCallback(() => {
    if (!message.trim()) return;
    onSend?.(message);
    setMessage("");
  }, [message, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "@") {
        setShowTools(true);
      } else if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const insertTool = useCallback((name: string) => {
    setMessage((m) => m + `@${name} `);
    setShowTools(false);
  }, []);

  return (
    <div className={cn("bg-card rounded-[24px] border p-2", className)}>
      <textarea
        className="m-0 w-full resize-none border-none px-4 py-3 text-lg"
        placeholder="Ask MCP agent... use @ to insert tool"
        value={message}
        onKeyDown={handleKeyDown}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex justify-end px-4 pb-2">
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full" onClick={handleSend}>
          <ArrowUp />
        </Button>
      </div>
      <CommandDialog open={showTools} onOpenChange={setShowTools}>
        <CommandInput placeholder="Search MCP tools..." />
        <CommandList>
          {tools.map((tool) => (
            <CommandItem key={tool.server + tool.name} onSelect={() => insertTool(tool.name)}>
              {tool.name}
            </CommandItem>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
