"use client";
import { useCallback, useRef } from "react";
import { MessageListView } from "../../chat/components/message-list-view";
import { sendMessage, useStore } from "~/core/store";
import { MCPInputBox } from "./input-box";
import { cn } from "~/lib/utils";

export function MessagesBlock({ className }: { className?: string }) {
  const responding = useStore((state) => state.responding);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSend = useCallback(async (msg: string) => {
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    try {
      await sendMessage(msg, {}, { abortSignal: abortController.signal });
    } catch {}
  }, []);


  return (
    <div className={cn("flex h-full flex-col", className)}>
      <MessageListView className="flex flex-grow" />
      <div className="relative flex h-42 shrink-0 pb-4">
        <MCPInputBox className="h-full w-full" onSend={handleSend} />
      </div>
    </div>
  );
}
