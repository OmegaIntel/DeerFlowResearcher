// Copyright (c) 2025 Bytedance Ltd. and/or its affiliates
// SPDX-License-Identifier: MIT

import { nanoid } from "nanoid";
import { toast } from "sonner";
import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";

import { chatStream, chatSimpleStream, generatePodcast } from "../api";
import type { ChatEvent } from "../api/types";
import type { Message } from "../messages";
import { mergeMessage } from "../messages";
import { parseJSON } from "../utils";
import { getChatSessionByThread } from "../api/chat-history";
import { debugCitations } from "~/lib/debug-citations";

import { getChatStreamSettings } from "./settings-store";

const THREAD_ID = nanoid();

export const useStore = create<{
  responding: boolean;
  threadId: string | undefined;
  mode: "chat" | "research";
  messageIds: string[];
  messages: Map<string, Message>;
  researchIds: string[];
  researchPlanIds: Map<string, string>;
  researchReportIds: Map<string, string>;
  researchActivityIds: Map<string, string[]>;
  ongoingResearchId: string | null;
  openResearchId: string | null;
  sessionProject: string | null;

  appendMessage: (message: Message) => void;
  updateMessage: (message: Message) => void;
  updateMessages: (messages: Message[]) => void;
  openResearch: (researchId: string | null) => void;
  closeResearch: () => void;
  setOngoingResearch: (researchId: string | null) => void;
  setMode: (mode: "chat" | "research") => void;
  setSessionProject: (projectId: string | null) => void;
  startNewChat: () => void;
  loadChat: (threadId: string) => Promise<void>;
}>((set) => ({
  responding: false,
  threadId: THREAD_ID,
  mode: "chat",
  messageIds: [],
  messages: new Map<string, Message>(),
  researchIds: [],
  researchPlanIds: new Map<string, string>(),
  researchReportIds: new Map<string, string>(),
  researchActivityIds: new Map<string, string[]>(),
  ongoingResearchId: null,
  openResearchId: null,
  sessionProject: null,

  appendMessage(message: Message) {
    set((state) => ({
      messageIds: [...state.messageIds, message.id],
      messages: new Map(state.messages).set(message.id, message),
    }));
  },
  updateMessage(message: Message) {
    set((state) => ({
      messages: new Map(state.messages).set(message.id, message),
    }));
  },
  updateMessages(messages: Message[]) {
    set((state) => {
      const newMessages = new Map(state.messages);
      messages.forEach((m) => newMessages.set(m.id, m));
      return { messages: newMessages };
    });
  },
  openResearch(researchId: string | null) {
    set({ openResearchId: researchId });
  },
  closeResearch() {
    set({ openResearchId: null });
  },
  setOngoingResearch(researchId: string | null) {
    set({ ongoingResearchId: researchId });
  },
  setMode(mode: "chat" | "research") {
    set({ mode });
  },
  setSessionProject(projectId: string | null) {
    set({ sessionProject: projectId });
  },
  startNewChat() {
    set({
      responding: false,
      threadId: nanoid(),
      messageIds: [],
      messages: new Map<string, Message>(),
      researchIds: [],
      researchPlanIds: new Map<string, string>(),
      researchReportIds: new Map<string, string>(),
      researchActivityIds: new Map<string, string[]>(),
      ongoingResearchId: null,
      openResearchId: null,
      sessionProject: null,
    });
  },
  async loadChat(threadId: string) {
    console.log('[Store] loadChat called with threadId:', threadId);
    console.log('[Store] Version: v2 with agent detection');
    
    // First, reset the state with the new thread ID
    set({
      responding: false,
      threadId: threadId,
      messageIds: [],
      messages: new Map<string, Message>(),
      researchIds: [],
      researchPlanIds: new Map<string, string>(),
      researchReportIds: new Map<string, string>(),
      researchActivityIds: new Map<string, string[]>(),
      ongoingResearchId: null,
      openResearchId: null,
      sessionProject: null,
    });

    try {
      // Fetch the chat session by thread ID
      const session = await getChatSessionByThread(threadId);
      console.log('[Store] Fetched session:', session);
      
      // Convert the messages to the expected format and update the store
      const messageMap = new Map<string, Message>();
      const messageIds: string[] = [];
      
      session.messages.forEach((msg) => {
        // Detect agent type from message content
        let agent: Message["agent"] = undefined;
        
        if (msg.role === "assistant" && msg.content) {
          const content = msg.content.trim();
          
          // Check if it's a JSON message from planner/coordinator
          if (content.startsWith('{')) {
            try {
              const parsed = JSON.parse(content);
              if (parsed.has_enough_context !== undefined || parsed.thought) {
                agent = "planner";
              }
            } catch (e) {
              // Not JSON, continue checking
            }
          }
          
          // Check for reporter messages (usually contain markdown headers)
          if (content.includes('# ') && content.length > 500) {
            agent = "reporter";
          }
        }
        
        const message: Message = {
          id: msg.id,
          threadId: threadId,
          role: msg.role as "user" | "assistant",
          agent: agent,
          content: msg.content,
          contentChunks: [msg.content],
          attachments: (msg as any).attachments,
          citations: (msg as any).citations,  // Add citations
        };
        console.log('[Store] Loading message v2:', {
          id: msg.id,
          role: msg.role,
          agent: agent,
          contentLength: msg.content.length,
          contentPreview: msg.content.substring(0, 50),
          hasCitations: !!(msg as any).citations,
          citationCount: (msg as any).citations?.length || 0
        });
        messageMap.set(msg.id, message);
        messageIds.push(msg.id);
      });
      
      // For research mode, also populate research-related state
      let researchIds: string[] = [];
      let researchPlanIds = new Map<string, string>();
      let researchReportIds = new Map<string, string>();
      
      if (session.mode === "research") {
        // Find the first user message as the research start
        const firstUserMsg = session.messages.find(m => m.role === "user");
        if (firstUserMsg) {
          researchIds.push(firstUserMsg.id);
          
          // Find planner and reporter messages
          let plannerMsgId: string | undefined;
          session.messages.forEach((msg) => {
            const msgObj = messageMap.get(msg.id);
            if (msgObj?.agent === "planner" && !plannerMsgId) {
              plannerMsgId = msg.id;
              researchPlanIds.set(firstUserMsg.id, msg.id);
            } else if (msgObj?.agent === "reporter" && plannerMsgId) {
              researchReportIds.set(firstUserMsg.id, msg.id);
            }
          });
        }
      }
      
      // Update the store with the loaded messages
      set({
        messages: messageMap,
        messageIds: messageIds,
        mode: session.mode as "chat" | "research",
        researchIds: researchIds,
        researchPlanIds: researchPlanIds,
        researchReportIds: researchReportIds,
      });
    } catch (error) {
      console.error("Failed to load chat history:", error);
      toast.error("Failed to load chat history");
    }
  },
}));

export async function sendMessage(
  content?: string,
  {
    interruptFeedback,
    toolId,
    toolType,
    attachments,
  }: {
    interruptFeedback?: string;
    toolId?: string;
    toolType?: "mcp" | "agent" | "research";
    attachments?: { filename: string; size: number; type: string; documentId?: string }[];
  } = {},
  options: { abortSignal?: AbortSignal } = {},
) {
  const state = useStore.getState();
  const currentThreadId = state.threadId || THREAD_ID;
  
  console.log("[sendMessage] Called with attachments:", attachments);
  
  if (content != null && content !== "") {
    const messageAttachments = attachments?.map(att => ({
      id: att.documentId || nanoid(),
      filename: att.filename,
      size: att.size,
      type: att.type,
      uploadTime: new Date().toISOString(),
      documentId: att.documentId
    }));
    
    console.log("[sendMessage] Creating message with attachments:", messageAttachments);
    
    appendMessage({
      id: nanoid(),
      threadId: currentThreadId,
      role: "user",
      content: content,
      contentChunks: [content],
      attachments: messageAttachments,
    });
  }

  let stream: AsyncIterable<ChatEvent>;
  const settings = getChatStreamSettings();
  
  // Debug logging
  console.log("[sendMessage] Decision logic:", {
    mode: state.mode,
    toolId,
    enableBackgroundInvestigation: settings.enableBackgroundInvestigation,
    settings
  });
  
  // Trigger research mode if:
  // 1. Mode is set to "research" OR
  // 2. Tool is specified (e.g., @research) OR
  // 3. Investigation toggle is ON
  if (state.mode === "research" || toolId || settings.enableBackgroundInvestigation) {
    console.log("[sendMessage] Using research flow (chatStream)");
    stream = chatStream(
      content ?? "[REPLAY]",
      {
        thread_id: currentThreadId,
        interrupt_feedback: interruptFeedback,
        auto_accepted_plan: settings.autoAcceptedPlan,
        enable_background_investigation:
          settings.enableBackgroundInvestigation ?? true,
        max_plan_iterations: settings.maxPlanIterations,
        max_step_num: settings.maxStepNum,
        mcp_settings: settings.mcpSettings,
        tool_id: toolId,
        tool_type: toolType,
        project_id: state.sessionProject || undefined,
      },
      options,
    );
  } else {
    console.log("[sendMessage] Using simple chat flow (chatSimpleStream)");
    stream = chatSimpleStream(
      content ?? "",
      { 
        thread_id: currentThreadId,
        project_id: state.sessionProject || undefined,
        attachments: attachments 
      },
      options,
    );
  }

  setResponding(true);
  let messageId: string | undefined;
  try {
    for await (const event of stream) {
      const { type, data } = event;
      messageId = data.id;
      let message: Message | undefined;
      if (type === "tool_call_result") {
        message = findMessageByToolCallId(data.tool_call_id);
      } else if (messageId && !existsMessage(messageId)) {
        message = {
          id: messageId,
          threadId: data.thread_id,
          agent: data.agent,
          role: data.role,
          content: "",
          contentChunks: [],
          isStreaming: true,
          interruptFeedback,
        };
        appendMessage(message);
      }
      message ??= messageId ? getMessage(messageId) : undefined;
      if (message) {
        // Debug: Log events with citations
        if ('citations' in event.data && event.data.citations) {
          console.log("[Store] Event has citations:", event.data.citations);
          debugCitations('store-event-citations', event.data.citations);
        }
        debugCitations('store-before-merge', { message, event });
        message = mergeMessage(message, event);
        console.log("[Store] Message after merge:", message);
        debugCitations('store-after-merge', message);
        updateMessage(message);
      }
    }
  } catch {
    toast("An error occurred while generating the response. Please try again.");
    // Update message status.
    // TODO: const isAborted = (error as Error).name === "AbortError";
    if (messageId != null) {
      const message = getMessage(messageId);
      if (message?.isStreaming) {
        message.isStreaming = false;
        useStore.getState().updateMessage(message);
      }
    }
    useStore.getState().setOngoingResearch(null);
  } finally {
    setResponding(false);
  }
}

function setResponding(value: boolean) {
  useStore.setState({ responding: value });
}

function existsMessage(id: string) {
  return useStore.getState().messageIds.includes(id);
}

function getMessage(id: string) {
  return useStore.getState().messages.get(id);
}

function findMessageByToolCallId(toolCallId: string) {
  return Array.from(useStore.getState().messages.values())
    .reverse()
    .find((message) => {
      if (message.toolCalls) {
        return message.toolCalls.some((toolCall) => toolCall.id === toolCallId);
      }
      return false;
    });
}

function appendMessage(message: Message) {
  if (
    message.agent === "coder" ||
    message.agent === "reporter" ||
    message.agent === "researcher"
  ) {
    if (!getOngoingResearchId()) {
      const id = message.id;
      appendResearch(id);
      openResearch(id);
    }
    appendResearchActivity(message);
  }
  useStore.getState().appendMessage(message);
}

function updateMessage(message: Message) {
  if (
    getOngoingResearchId() &&
    message.agent === "reporter" &&
    !message.isStreaming
  ) {
    useStore.getState().setOngoingResearch(null);
  }
  useStore.getState().updateMessage(message);
}

function getOngoingResearchId() {
  return useStore.getState().ongoingResearchId;
}

function appendResearch(researchId: string) {
  console.log('[DEBUG] appendResearch called with:', researchId);
  let planMessage: Message | undefined;
  const reversedMessageIds = [...useStore.getState().messageIds].reverse();
  for (const messageId of reversedMessageIds) {
    const message = getMessage(messageId);
    if (message?.agent === "planner") {
      planMessage = message;
      console.log('[DEBUG] Found planner message:', planMessage.id);
      break;
    }
  }
  const messageIds = [researchId];
  messageIds.unshift(planMessage!.id);
  const newPlanIds = new Map(useStore.getState().researchPlanIds).set(
    researchId,
    planMessage!.id,
  );
  console.log('[DEBUG] Setting researchPlanIds:', newPlanIds);
  useStore.setState({
    ongoingResearchId: researchId,
    researchIds: [...useStore.getState().researchIds, researchId],
    researchPlanIds: newPlanIds,
    researchActivityIds: new Map(useStore.getState().researchActivityIds).set(
      researchId,
      messageIds,
    ),
  });
}

function appendResearchActivity(message: Message) {
  const researchId = getOngoingResearchId();
  if (researchId) {
    const researchActivityIds = useStore.getState().researchActivityIds;
    const current = researchActivityIds.get(researchId)!;
    if (!current.includes(message.id)) {
      useStore.setState({
        researchActivityIds: new Map(researchActivityIds).set(researchId, [
          ...current,
          message.id,
        ]),
      });
    }
    if (message.agent === "reporter") {
      const newReportIds = new Map(useStore.getState().researchReportIds).set(
        researchId,
        message.id,
      );
      console.log('[DEBUG] Setting researchReportIds:', newReportIds);
      console.log('[DEBUG] Research', researchId, 'now has report:', message.id);
      useStore.setState({
        researchReportIds: newReportIds,
      });
    }
  }
}

export function openResearch(researchId: string | null) {
  useStore.getState().openResearch(researchId);
}

export function closeResearch() {
  useStore.getState().closeResearch();
}

export function startNewChat() {
  useStore.getState().startNewChat();
}

export async function listenToPodcast(researchId: string) {
  const planMessageId = useStore.getState().researchPlanIds.get(researchId);
  const reportMessageId = useStore.getState().researchReportIds.get(researchId);
  if (planMessageId && reportMessageId) {
    const planMessage = getMessage(planMessageId)!;
    const title = parseJSON(planMessage.content, { title: "Untitled" }).title;
    const reportMessage = getMessage(reportMessageId);
    if (reportMessage?.content) {
      const currentThreadId = useStore.getState().threadId || THREAD_ID;
      appendMessage({
        id: nanoid(),
        threadId: currentThreadId,
        role: "user",
        content: "Please generate a podcast for the above research.",
        contentChunks: [],
      });
      const podCastMessageId = nanoid();
      const podcastObject = { title, researchId };
      const podcastMessage: Message = {
        id: podCastMessageId,
        threadId: currentThreadId,
        role: "assistant",
        agent: "podcast",
        content: JSON.stringify(podcastObject),
        contentChunks: [],
        isStreaming: true,
      };
      appendMessage(podcastMessage);
      // Generating podcast...
      let audioUrl: string | undefined;
      try {
        audioUrl = await generatePodcast(reportMessage.content);
      } catch (e) {
        console.error(e);
        useStore.setState((state) => ({
          messages: new Map(useStore.getState().messages).set(
            podCastMessageId,
            {
              ...state.messages.get(podCastMessageId)!,
              content: JSON.stringify({
                ...podcastObject,
                error: e instanceof Error ? e.message : "Unknown error",
              }),
              isStreaming: false,
            },
          ),
        }));
        toast("An error occurred while generating podcast. Please try again.");
        return;
      }
      useStore.setState((state) => ({
        messages: new Map(useStore.getState().messages).set(podCastMessageId, {
          ...state.messages.get(podCastMessageId)!,
          content: JSON.stringify({ ...podcastObject, audioUrl }),
          isStreaming: false,
        }),
      }));
    }
  }
}

export function useResearchMessage(researchId: string) {
  return useStore(
    useShallow((state) => {
      const messageId = state.researchPlanIds.get(researchId);
      return messageId ? state.messages.get(messageId) : undefined;
    }),
  );
}

export function useMessage(messageId: string | null | undefined) {
  return useStore(
    useShallow((state) =>
      messageId ? state.messages.get(messageId) : undefined,
    ),
  );
}

export function useMessageIds() {
  return useStore(useShallow((state) => state.messageIds));
}

export function useChatMode() {
  return useStore(useShallow((state) => state.mode));
}

export function useLastInterruptMessage() {
  return useStore(
    useShallow((state) => {
      if (state.messageIds.length >= 2) {
        const lastMessage = state.messages.get(
          state.messageIds[state.messageIds.length - 1]!,
        );
        return lastMessage?.finishReason === "interrupt" ? lastMessage : null;
      }
      return null;
    }),
  );
}

export function useLastFeedbackMessageId() {
  const waitingForFeedbackMessageId = useStore(
    useShallow((state) => {
      if (state.messageIds.length >= 2) {
        const lastMessage = state.messages.get(
          state.messageIds[state.messageIds.length - 1]!,
        );
        if (lastMessage && lastMessage.finishReason === "interrupt") {
          return state.messageIds[state.messageIds.length - 2];
        }
      }
      return null;
    }),
  );
  return waitingForFeedbackMessageId;
}
