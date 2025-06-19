// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";
import { useMemo, useEffect, useState } from "react";

import { useStore } from "~/core/store";
import { cn } from "~/lib/utils";
import { inspectCitations } from "~/lib/citation-inspector";

import { ChatHeader } from "./components/chat-header";
import { MessagesBlock } from "./components/messages-block";
import { ResearchBlock } from "./components/research-block";
import { CitationDebugger } from "./components/citation-debug";

export default function Main() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const loadChat = useStore((state) => state.loadChat);
  const openResearchId = useStore((state) => state.openResearchId);
  const storeThreadId = useStore((state) => state.threadId);
  
  useEffect(() => {
    // Only access search params on client side
    const searchParams = new URLSearchParams(window.location.search);
    const thread = searchParams.get("thread");
    setThreadId(thread);
  }, []);
  
  useEffect(() => {
    if (threadId) {
      // Load the specific chat thread
      loadChat(threadId);
    } else if (!threadId && !storeThreadId) {
      // If no thread ID in URL or store, create a new chat session
      import('~/core/store').then(({ startNewChat }) => {
        startNewChat().then(() => {
          // Update URL with the new thread ID
          const newThreadId = useStore.getState().threadId;
          if (newThreadId && window.history.pushState) {
            const newUrl = `/chat?thread=${newThreadId}`;
            window.history.pushState({}, '', newUrl);
            setThreadId(newThreadId);
          }
        });
      });
    }
  }, [threadId, storeThreadId, loadChat]);
  
  useEffect(() => {
    // Start citation inspector
    inspectCitations();
  }, []);
  const doubleColumnMode = useMemo(
    () => openResearchId !== null,
    [openResearchId],
  );
 
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <CitationDebugger />
      <ChatHeader />
      <div
        className={cn(
          "flex h-full w-full px-4 pt-4 pb-4 overflow-hidden",
          doubleColumnMode ? "gap-6" : "justify-center",
        )}
      >
      <MessagesBlock
        className={cn(
          "transition-all duration-300 ease-out",
          !doubleColumnMode &&
            `w-full max-w-4xl`,
          doubleColumnMode && `flex-1 min-w-0 max-w-2xl`,
        )}
      />
      <ResearchBlock
        className={cn(
          "transition-all duration-300 ease-out",
          !doubleColumnMode && "scale-0 w-0",
          doubleColumnMode && "flex-1 min-w-0",
        )}
        researchId={openResearchId}
      />
      </div>
    </div>
  );
}