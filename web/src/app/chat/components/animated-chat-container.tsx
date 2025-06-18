'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '~/lib/utils';
import { EnhancedInputBox } from './enhanced-input-box';
import { FinanceConversationStarter } from './finance-conversation-starter';
import { MessageListView } from './message-list-view';
import { useMessageIds, useStore } from '~/core/store';
import type { Option } from '~/core/messages';

interface AnimatedChatContainerProps {
  className?: string;
  onSendMessage: (message: string, options?: any) => void;
  onCancel: () => void;
  onFeedback: (feedback: { option: Option }) => void;
  onRemoveFeedback: () => void;
  feedback: { option: Option } | null;
}

export function AnimatedChatContainer({
  className,
  onSendMessage,
  onCancel,
  onFeedback,
  onRemoveFeedback,
  feedback,
}: AnimatedChatContainerProps) {
  const [isCentered, setIsCentered] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  const messageIds = useMessageIds();
  const messageCount = messageIds.length;
  const responding = useStore((state) => state.responding);

  // Move to bottom when there are messages
  useEffect(() => {
    if (messageCount > 0 && isCentered) {
      setIsCentered(false);
      setHasInteracted(true);
    }
  }, [messageCount, isCentered]);

  const handleSendWithAnimation = useCallback((message: string, options?: any) => {
    // Only proceed if there's actually a message to send
    if (!message.trim() && !options?.files?.length) {
      return;
    }
    
    if (isCentered) {
      setIsCentered(false);
      setHasInteracted(true);
      // Small delay to allow animation to start before sending
      setTimeout(() => {
        onSendMessage(message, options);
      }, 300);
    } else {
      onSendMessage(message, options);
    }
  }, [isCentered, onSendMessage]);

  const handlePromptClick = useCallback((prompt: string) => {
    handleSendWithAnimation(prompt);
  }, [handleSendWithAnimation]);

  const handleInputFocus = useCallback(() => {
    // Do nothing on focus - wait for user to press Enter
  }, []);

  return (
    <motion.div
      className={cn("flex h-full flex-col", className)}
      initial={false}
      animate={isCentered ? "centered" : "bottom"}
      variants={{
        centered: {
          justifyContent: "center",
          alignItems: "center",
        },
        bottom: {
          justifyContent: "flex-end",
          alignItems: "stretch",
        },
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
    >
      <AnimatePresence mode="wait">
        {!isCentered && (
          <motion.div
            className="flex-1 min-h-0 relative"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <MessageListView
              className="absolute inset-0 overflow-y-auto pr-4"
              onFeedback={onFeedback}
              onSendMessage={onSendMessage}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className={cn(
          "flex-shrink-0 w-full transition-all duration-500",
          isCentered ? "max-w-3xl" : "pt-4 bg-background border-t"
        )}
        layout
        transition={{
          layout: {
            duration: 0.5,
            ease: "easeInOut",
          },
        }}
      >
        {isCentered && (
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h1 className="text-4xl font-semibold text-foreground mb-2">
              Welcome to Omega Intelligence
            </h1>
            <p className="text-lg text-muted-foreground">
              Your AI-powered financial analysis assistant
            </p>
          </motion.div>
        )}

        {!responding && messageCount === 0 && !hasInteracted && (
          <FinanceConversationStarter
            className="mb-4"
            onSend={handlePromptClick}
            isCentered={isCentered}
          />
        )}
        
        <EnhancedInputBox
          onSend={handleSendWithAnimation}
          onCancel={onCancel}
          responding={responding}
          onFocus={handleInputFocus}
          placeholder={isCentered ? "Ask me about financial analysis, M&A deals, or market insights..." : "How can I help you today?"}
          className={cn(
            "transition-all duration-500",
            isCentered && "shadow-lg"
          )}
        />
      </motion.div>
    </motion.div>
  );
}