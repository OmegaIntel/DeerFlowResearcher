// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

"use client";
import { DownloadOutlined } from "@ant-design/icons";
import { useMemo } from "react";

import { Button } from "~/components/ui/button";
import { useStore } from "~/core/store";
import { cn } from "~/lib/utils";

import { ChatHeader } from "./components/chat-header";
import { MessagesBlock } from "./components/messages-block";
import { ResearchBlock } from "./components/research-block";

export default function Main() {
  const openResearchId = useStore((state) => state.openResearchId);
  const doubleColumnMode = useMemo(
    () => openResearchId !== null,
    [openResearchId],
  );

    // Pull the actual report text from your store.
  // Replace `state.reportsById` & `.content` with whatever key you use.
  const reportContent = useStore((state) => {
    if (openResearchId === null) return "";
    const msg = state.messages.get(openResearchId);
    return msg?.content ?? "";
  });

  // When clicked, POST to your FastAPI and download the PPTX.
  const generatePpt = async () => {
    if (!reportContent) return;

    try {
      const res = await fetch("http://localhost:8000/api/ppt/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: reportContent }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "report.pptx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download PPT", err);
      // you can surface an in-UI notification here instead
      alert("Error generating PPT. Check console for details.");
    }
  };
 
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <ChatHeader />
      <div
        className={cn(
          "flex h-full w-full justify-center px-4 pt-4 pb-4 overflow-hidden",
          doubleColumnMode && "gap-8",
        )}
      >
      <MessagesBlock
        className={cn(
          "shrink-0 transition-all duration-300 ease-out max-w-full",
          !doubleColumnMode &&
            `w-full max-w-4xl`,
          doubleColumnMode && `w-1/2 min-w-0`,
        )}
      />
      <ResearchBlock
        className={cn(
          "pb-4 transition-all duration-300 ease-out max-w-full",
          !doubleColumnMode && "scale-0 w-0",
          doubleColumnMode && "w-1/2 min-w-0",
        )}
        researchId={openResearchId}
      />
    
      {openResearchId !== null && (
        <div className="fixed bottom-4 right-4">
          <Button
            size="icon"
            variant="outline"
            title="Download PPT"
            onClick={generatePpt}
          >
            <DownloadOutlined />
          </Button>
        </div>
      )}
      </div>
    </div>
  );
}
