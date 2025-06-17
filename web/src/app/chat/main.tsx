// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";
import { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useStore } from "~/core/store";
import { cn } from "~/lib/utils";
import { inspectCitations } from "~/lib/citation-inspector";

import { ChatHeader } from "./components/chat-header";
import { MessagesBlock } from "./components/messages-block";
import { ResearchBlock } from "./components/research-block";
import { CitationDebugger } from "./components/citation-debug";

export default function Main() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  const loadChat = useStore((state) => state.loadChat);
  const openResearchId = useStore((state) => state.openResearchId);
  
  useEffect(() => {
    if (threadId) {
      // Load the specific chat thread
      loadChat(threadId);
    }
  }, [threadId, loadChat]);
  
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
