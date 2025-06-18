// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { motion } from "framer-motion";
import { FastForward, Play } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { RainbowText } from "~/components/deer-flow/rainbow-text";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { fastForwardReplay } from "~/core/api";
import { useReplayMetadata } from "~/core/api/hooks";
import type { Option } from "~/core/messages";
import { useReplay } from "~/core/replay";
import { sendMessage, useMessageIds, useStore } from "~/core/store";
import { cn } from "~/lib/utils";

import { AnimatedChatContainer } from "./animated-chat-container";

export function MessagesBlock({ className }: { className?: string }) {
  const messageIds = useMessageIds();
  const messageCount = messageIds.length;
  const responding = useStore((state) => state.responding);
  const { isReplay } = useReplay();
  const { title: replayTitle, hasError: replayHasError } = useReplayMetadata();
  const [replayStarted, setReplayStarted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [feedback, setFeedback] = useState<{ option: Option } | null>(null);
  const handleSend = useCallback(
    async (message: string, options?: { 
      interruptFeedback?: string; 
      toolId?: string; 
      toolType?: "mcp" | "agent" | "research";
      attachments?: { filename: string; size: number; type: string; documentId?: string }[];
    }) => {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      try {
        await sendMessage(
          message,
          {
            interruptFeedback:
              options?.interruptFeedback ?? feedback?.option.value,
            toolId: options?.toolId,
            toolType: options?.toolType,
            attachments: options?.attachments,
          },
          {
            abortSignal: abortController.signal,
          },
        );
      } catch {}
    },
    [feedback],
  );
  const handleCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);
  const handleFeedback = useCallback(
    (feedback: { option: Option }) => {
      setFeedback(feedback);
    },
    [setFeedback],
  );
  const handleRemoveFeedback = useCallback(() => {
    setFeedback(null);
  }, [setFeedback]);
  const handleStartReplay = useCallback(() => {
    setReplayStarted(true);
    void sendMessage();
  }, [setReplayStarted]);
  const [fastForwarding, setFastForwarding] = useState(false);
  const handleFastForwardReplay = useCallback(() => {
    setFastForwarding(!fastForwarding);
    fastForwardReplay(!fastForwarding);
  }, [fastForwarding]);
  
  return (
    <div className={cn("h-full", className)}>
      {!isReplay ? (
        <AnimatedChatContainer
          className="h-full"
          onSendMessage={handleSend}
          onCancel={handleCancel}
          onFeedback={handleFeedback}
          onRemoveFeedback={handleRemoveFeedback}
          feedback={feedback}
        />
      ) : (
        <>
          <motion.div
            className="mb-4 h-fit w-full items-center justify-center"
            initial={{ opacity: 0, y: "20vh" }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              className={cn(
                "w-full transition-all duration-300",
                !replayStarted && "translate-y-[-40vh]",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex-grow">
                  <CardHeader>
                    <CardTitle>
                      <RainbowText animated={responding}>
                        {responding ? "Replaying" : `${replayTitle}`}
                      </RainbowText>
                    </CardTitle>
                    <CardDescription>
                      <RainbowText animated={responding}>
                        {responding
                          ? "Omega is now replaying the conversation..."
                          : replayStarted
                            ? "The replay has been stopped."
                            : `You're now in Omega's replay mode. Click the "Play" button on the right to start.`}
                      </RainbowText>
                    </CardDescription>
                  </CardHeader>
                </div>
                {!replayHasError && (
                  <div className="pr-4">
                    {responding && (
                      <Button
                        className={cn(fastForwarding && "animate-pulse")}
                        variant={fastForwarding ? "default" : "outline"}
                        onClick={handleFastForwardReplay}
                      >
                        <FastForward
                          className={cn(
                            "mr-2",
                            fastForwarding && "stroke-neutral-900",
                          )}
                        />
                        Fast forward
                      </Button>
                    )}
                    {!responding && !replayStarted && (
                      <Button onClick={handleStartReplay}>
                        <Play className="mr-2" />
                        Play
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}