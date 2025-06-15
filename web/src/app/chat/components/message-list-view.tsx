// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { LoadingOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { Download, Headphones, FileIcon, Paperclip } from "lucide-react";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { getDocumentDownloadUrl } from "~/core/api/documents";
import { getAuthToken } from "~/services/auth";
import { processMessageContent } from "~/lib/process-content";
import { ensureNoCitationLinks } from "~/lib/replace-citations";
import { stripAllLinks } from "~/lib/strip-all-links";

import { LoadingAnimation } from "~/components/deer-flow/loading-animation";
import { Markdown } from "~/components/deer-flow/markdown";
import { RainbowText } from "~/components/deer-flow/rainbow-text";
import { RollingText } from "~/components/deer-flow/rolling-text";
import {
  ScrollContainer,
  type ScrollContainerRef,
} from "~/components/deer-flow/scroll-container";
import { Tooltip } from "~/components/deer-flow/tooltip";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { Message, Option } from "~/core/messages";
import {
  closeResearch,
  openResearch,
  useLastFeedbackMessageId,
  useLastInterruptMessage,
  useMessage,
  useMessageIds,
  useResearchMessage,
  useStore,
} from "~/core/store";
import { parseJSON } from "~/core/utils";
import { cn } from "~/lib/utils";

export function MessageListView({
  className,
  onFeedback,
  onSendMessage,
}: {
  className?: string;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
}) {
  const scrollContainerRef = useRef<ScrollContainerRef>(null);
  const messageIds = useMessageIds();
  const interruptMessage = useLastInterruptMessage();
  const waitingForFeedbackMessageId = useLastFeedbackMessageId();
  const responding = useStore((state) => state.responding);
  const noOngoingResearch = useStore(
    (state) => state.ongoingResearchId === null,
  );
  const ongoingResearchIsOpen = useStore(
    (state) => state.ongoingResearchId === state.openResearchId,
  );

  const handleToggleResearch = useCallback(() => {
    // Fix the issue where auto-scrolling to the bottom
    // occasionally fails when toggling research.
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollToBottom();
      }
    }, 500);
    return () => {
      clearTimeout(timer);
    };
  }, []);

  return (
    <ScrollContainer
      className={cn("h-full w-full overflow-y-auto", className)}
      scrollShadowColor="var(--app-background)"
      autoScrollToBottom
      ref={scrollContainerRef}
    >
      <ul className="flex flex-col px-4">
        {messageIds.map((messageId) => (
          <MessageListItem
            key={messageId}
            messageId={messageId}
            waitForFeedback={waitingForFeedbackMessageId === messageId}
            interruptMessage={interruptMessage}
            onFeedback={onFeedback}
            onSendMessage={onSendMessage}
            onToggleResearch={handleToggleResearch}
          />
        ))}
        <div className="flex h-8 w-full shrink-0"></div>
      </ul>
      {responding && (noOngoingResearch || !ongoingResearchIsOpen) && (
        <LoadingAnimation className="ml-4" />
      )}
    </ScrollContainer>
  );
}

function MessageListItem({
  className,
  messageId,
  waitForFeedback,
  interruptMessage,
  onFeedback,
  onSendMessage,
  onToggleResearch,
}: {
  className?: string;
  messageId: string;
  waitForFeedback?: boolean;
  onFeedback?: (feedback: { option: Option }) => void;
  interruptMessage?: Message | null;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
  onToggleResearch?: () => void;
}) {
  const message = useMessage(messageId);
  const researchIds = useStore((state) => state.researchIds);
  const startOfResearch = useMemo(() => {
    return researchIds.includes(messageId);
  }, [researchIds, messageId]);
  if (message) {
    if (
      message.role === "user" ||
      message.role === "assistant" ||
      message.agent === "coordinator" ||
      message.agent === "planner" ||
      message.agent === "podcast" ||
      startOfResearch
    ) {
      let content: React.ReactNode;
      if (message.agent === "planner") {
        content = (
          <div className="w-full">
            <PlanCard
              message={message}
              waitForFeedback={waitForFeedback}
              interruptMessage={interruptMessage}
              onFeedback={onFeedback}
              onSendMessage={onSendMessage}
            />
          </div>
        );
      } else if (message.agent === "podcast") {
        content = (
          <div className="w-full">
            <PodcastCard message={message} />
          </div>
        );
      } else if (startOfResearch) {
        content = (
          <div className="w-full">
            <ResearchCard
              researchId={message.id}
              onToggleResearch={onToggleResearch}
            />
          </div>
        );
      } else {
        content = message.content ? (
          <div
            className={cn(
              "flex flex-col w-full",
              message.role === "user" && "items-end",
              className,
            )}
          >
            <div
              className={cn(
                "flex w-full",
                message.role === "user" && "justify-end",
              )}
            >
              <MessageBubble message={message}>
                <div className="flex w-full flex-col">
                  <Markdown onLinkClick={(href) => {
                    console.log('[MessageList] Markdown link clicked:', href);
                  }}>{stripAllLinks(message?.content || '')}</Markdown>
                  {message.citations && message.citations.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">📚 References:</p>
                      <div className="space-y-1">
                        {message.citations.map((citation) => (
                          <CitationDisplay 
                            key={citation.id} 
                            citation={citation}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </MessageBubble>
            </div>
            {message.attachments && message.attachments.length > 0 && (
              <div className={cn(
                "mt-2 flex flex-wrap gap-1",
                message.role === "user" ? "max-w-[85%]" : "max-w-[85%]"
              )}>
                {message.attachments.map((attachment) => (
                  <AttachmentDisplay 
                    key={attachment.id} 
                    attachment={attachment}
                    threadId={message.threadId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null;
      }
      if (content) {
        return (
          <motion.li
            className="mt-10"
            key={messageId}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ transition: "all 0.2s ease-out" }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          >
            {content}
          </motion.li>
        );
      }
    }
    return null;
  }
}

function MessageBubble({
  className,
  message,
  children,
}: {
  className?: string;
  message: Message;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        `flex w-fit max-w-[85%] flex-col rounded-2xl px-4 py-3 shadow`,
        message.role === "user" &&
          "text-primary-foreground bg-brand rounded-ee-none",
        message.role === "assistant" && "bg-card rounded-es-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ResearchCard({
  className,
  researchId,
  onToggleResearch,
}: {
  className?: string;
  researchId: string;
  onToggleResearch?: () => void;
}) {
  const reportId = useStore((state) => state.researchReportIds.get(researchId));
  const hasReport = reportId !== undefined;
  const reportGenerating = useStore(
    (state) => hasReport && state.messages.get(reportId)!.isStreaming,
  );
  const openResearchId = useStore((state) => state.openResearchId);
  const state = useMemo(() => {
    if (hasReport) {
      return reportGenerating ? "Generating report..." : "Report generated";
    }
    return "Researching...";
  }, [hasReport, reportGenerating]);
  const msg = useResearchMessage(researchId);
  const title = useMemo(() => {
    if (msg) {
      return parseJSON(msg.content ?? "", { title: "" }).title;
    }
    return undefined;
  }, [msg]);
  const handleOpen = useCallback(() => {
    if (openResearchId === researchId) {
      closeResearch();
    } else {
      openResearch(researchId);
    }
    onToggleResearch?.();
  }, [openResearchId, researchId, onToggleResearch]);
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>
          <RainbowText animated={state !== "Report generated"}>
            {title !== undefined && title !== "" ? title : "Deep Research"}
          </RainbowText>
        </CardTitle>
      </CardHeader>
      <CardFooter>
        <div className="flex w-full">
          <RollingText className="text-muted-foreground flex-grow text-sm">
            {state}
          </RollingText>
          <Button
            variant={!openResearchId ? "default" : "outline"}
            onClick={handleOpen}
          >
            {researchId !== openResearchId ? "Open" : "Close"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

const GREETINGS = ["Cool", "Sounds great", "Looks good", "Great", "Awesome"];
function PlanCard({
  className,
  message,
  interruptMessage,
  onFeedback,
  waitForFeedback,
  onSendMessage,
}: {
  className?: string;
  message: Message;
  interruptMessage?: Message | null;
  onFeedback?: (feedback: { option: Option }) => void;
  onSendMessage?: (
    message: string,
    options?: { interruptFeedback?: string },
  ) => void;
  waitForFeedback?: boolean;
}) {
  const plan = useMemo<{
    title?: string;
    thought?: string;
    steps?: { title?: string; description?: string }[];
  }>(() => {
    return parseJSON(message.content ?? "", {});
  }, [message.content]);
  const handleAccept = useCallback(async () => {
    if (onSendMessage) {
      onSendMessage(
        `${GREETINGS[Math.floor(Math.random() * GREETINGS.length)]}! ${Math.random() > 0.5 ? "Let's get started." : "Let's start."}`,
        {
          interruptFeedback: "accepted",
        },
      );
    }
  }, [onSendMessage]);
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>
          <Markdown animated>
            {`### ${
              plan.title !== undefined && plan.title !== ""
                ? plan.title
                : "Deep Research"
            }`}
          </Markdown>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Markdown className="opacity-80" animated>
          {plan.thought}
        </Markdown>
        {plan.steps && (
          <ul className="my-2 flex list-decimal flex-col gap-4 border-l-[2px] pl-8">
            {plan.steps.map((step, i) => (
              <li key={`step-${i}`}>
                <h3 className="mb text-lg font-medium">
                  <Markdown animated>{step.title}</Markdown>
                </h3>
                <div className="text-muted-foreground text-sm">
                  <Markdown animated>{step.description}</Markdown>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {!message.isStreaming && interruptMessage?.options?.length && (
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {interruptMessage?.options.map((option) => (
              <Button
                key={option.value}
                variant={option.value === "accepted" ? "default" : "outline"}
                disabled={!waitForFeedback}
                onClick={() => {
                  if (option.value === "accepted") {
                    void handleAccept();
                  } else {
                    onFeedback?.({
                      option,
                    });
                  }
                }}
              >
                {option.text}
              </Button>
            ))}
          </motion.div>
        )}
      </CardFooter>
    </Card>
  );
}

function PodcastCard({
  className,
  message,
}: {
  className?: string;
  message: Message;
}) {
  const data = useMemo(() => {
    return JSON.parse(message.content ?? "");
  }, [message.content]);
  const title = useMemo<string | undefined>(() => data?.title, [data]);
  const audioUrl = useMemo<string | undefined>(() => data?.audioUrl, [data]);
  const isGenerating = useMemo(() => {
    return message.isStreaming;
  }, [message.isStreaming]);
  const hasError = useMemo(() => {
    return data?.error !== undefined;
  }, [data]);
  const [isPlaying, setIsPlaying] = useState(false);
  return (
    <Card className={cn("w-[508px]", className)}>
      <CardHeader>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isGenerating ? <LoadingOutlined /> : <Headphones size={16} />}
            {!hasError ? (
              <RainbowText animated={isGenerating}>
                {isGenerating
                  ? "Generating podcast..."
                  : isPlaying
                    ? "Now playing podcast..."
                    : "Podcast"}
              </RainbowText>
            ) : (
              <div className="text-red-500">
                Error when generating podcast. Please try again.
              </div>
            )}
          </div>
          {!hasError && !isGenerating && (
            <div className="flex">
              <Tooltip title="Download podcast">
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={audioUrl}
                    download={`${(title ?? "podcast").replaceAll(" ", "-")}.mp3`}
                  >
                    <Download size={16} />
                  </a>
                </Button>
              </Tooltip>
            </div>
          )}
        </div>
        <CardTitle>
          <div className="text-lg font-medium">
            <RainbowText animated={isGenerating}>{title}</RainbowText>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {audioUrl ? (
          <audio
            className="w-full"
            src={audioUrl}
            controls
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full"></div>
        )}
      </CardContent>
    </Card>
  );
}

function AttachmentDisplay({ 
  attachment, 
  threadId 
}: { 
  attachment: { id: string; filename: string; size: number; type: string; uploadTime?: string; documentId?: string };
  threadId: string;
}) {
  const [downloading, setDownloading] = useState(false);
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const handleOpen = async () => {
    try {
      setDownloading(true);
      
      // Get presigned download URL from backend
      // Use documentId if available, otherwise use the attachment id
      const docId = attachment.documentId || attachment.id;
      const { download_url } = await getDocumentDownloadUrl(docId);
      
      // Open in new tab
      window.open(download_url, '_blank', 'noopener,noreferrer');
      
      toast.success(`Opening ${attachment.filename}`);
    } catch (error) {
      console.error("Open error:", error);
      toast.error("Failed to open file", {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setDownloading(false);
    }
  };
  
  return (
    <div 
      className="inline-flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 cursor-pointer hover:bg-muted/70 transition-colors max-w-fit"
      onClick={handleOpen}
      title={`Click to open ${attachment.filename}`}
    >
      <FileIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
      <p className="text-sm font-medium truncate max-w-[150px]">
        {attachment.filename}
      </p>
      {downloading && (
        <LoadingOutlined className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </div>
  );
}

function CitationDisplay({ 
  citation 
}: { 
  citation: { id: string; document_id: string; filename: string; page_number: number; chunk_id: string; char_start: number; char_end: number };
}) {
  const [loading, setLoading] = useState(false);
  
  // Debug: Log when component mounts
  useEffect(() => {
    console.log("[Citation] Component mounted with citation:", citation);
  }, [citation]);
  
  const handleViewCitation = async () => {
    console.log("[Citation] Click handler triggered!");
    console.log("[Citation] Citation object:", citation);
    
    try {
      setLoading(true);
      console.log("[Citation] Full citation data:", citation);
      console.log("[Citation] Document ID:", citation.document_id);
      console.log("[Citation] Document ID type:", typeof citation.document_id);
      
      // Validate document_id exists
      if (!citation.document_id) {
        throw new Error("Citation missing document_id");
      }
      
      // Get document download URL
      console.log("[Citation] Calling getDocumentDownloadUrl...");
      const response = await getDocumentDownloadUrl(citation.document_id);
      console.log("[Citation] Download URL response:", response);
      
      if (response && response.download_url) {
        // Open the document directly
        console.log("[Citation] Opening URL:", response.download_url);
        
        // Use a small delay to avoid popup blockers
        setTimeout(() => {
          console.log("[Citation] About to open URL:", response.download_url);
          console.log("[Citation] URL type:", typeof response.download_url);
          console.log("[Citation] URL starts with http:", response.download_url?.startsWith('http'));
          
          const newWindow = window.open(response.download_url, '_blank', 'noopener,noreferrer');
          if (!newWindow) {
            console.error("[Citation] Window.open was blocked");
            // Fallback: create a temporary link
            const link = document.createElement('a');
            link.href = response.download_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            console.log("[Citation] Fallback link href:", link.href);
            link.click();
          }
        }, 100);
        
        toast.success(`Opening ${citation.filename} (page ${citation.page_number})`);
      } else {
        throw new Error("No download URL received");
      }
    } catch (error) {
      console.error("[Citation] Primary method failed:", error);
      console.error("[Citation] Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        citation: citation,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Fallback: Try to construct a direct API URL
      try {
        console.log("[Citation] Trying fallback method...");
        const fallbackUrl = `/api/documents/${citation.document_id}/download-url`;
        console.log("[Citation] Fallback URL:", fallbackUrl);
        
        const response = await fetch(fallbackUrl, {
          headers: {
            'Authorization': `Bearer ${getAuthToken() || ''}`,
          },
        });
        
        console.log("[Citation] Fallback response status:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("[Citation] Fallback response data:", data);
          
          if (data.download_url) {
            console.log("[Citation] Fallback: Opening URL:", data.download_url);
            
            // Use a small delay to avoid popup blockers
            setTimeout(() => {
              const newWindow = window.open(data.download_url, '_blank', 'noopener,noreferrer');
              if (!newWindow) {
                console.error("[Citation] Fallback: Window.open was blocked");
                // Fallback: create a temporary link
                const link = document.createElement('a');
                link.href = data.download_url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.click();
              }
            }, 100);
            
            toast.info(`Opening ${citation.filename} (page ${citation.page_number})`);
            return;
          }
        } else {
          const errorText = await response.text();
          console.error("[Citation] Fallback error response:", errorText);
        }
      } catch (fallbackError) {
        console.error("[Citation] Fallback also failed:", fallbackError);
      }
      
      toast.error("Failed to open citation");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div 
      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors"
      onClick={handleViewCitation}
    >
      <span className="font-semibold text-primary">{citation.id}</span>
      <FileIcon className="h-3 w-3 text-muted-foreground" />
      <span className="text-muted-foreground truncate max-w-[200px]" title={citation.filename}>
        {citation.filename}
      </span>
      <span className="text-muted-foreground">- Page {citation.page_number}</span>
      {loading && <LoadingOutlined className="h-3 w-3" />}
    </div>
  );
}
