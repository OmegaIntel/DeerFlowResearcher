"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  Search,
  Trash2,
  RefreshCw,
  Plus,
  MoreVertical,
  FileText,
  Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { resolveServiceURL } from "~/core/api/resolve-service-url";
import { getAuthToken } from "~/services/auth";
import { ChatHistoryDebug } from "./debug";

interface ChatSession {
  id: string;
  thread_id: string;
  title?: string;
  mode: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface ChatSessionDetail {
  id: string;
  thread_id: string;
  title?: string;
  mode: string;
  created_at: string;
  messages: ChatMessage[];
}

export default function ChatHistoryMain() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams();
      if (modeFilter) {
        params.append("mode", modeFilter);
      }

      const response = await fetch(resolveServiceURL(`chat/sessions?${params}`), {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("[ChatHistory] Fetched sessions:", data);
        setSessions(data);
      } else {
        console.error("Failed to fetch chat sessions", response.status);
      }
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchSessionDetail = async (sessionId: string) => {
    try {
      const response = await fetch(resolveServiceURL(`chat/sessions/${sessionId}`), {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedSession(data);
      } else {
        console.error("Failed to fetch session detail");
      }
    } catch (error) {
      console.error("Error fetching session detail:", error);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [modeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    try {
      const response = await fetch(resolveServiceURL(`chat/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        if (selectedSession?.id === sessionId) {
          setSelectedSession(null);
        }
      } else {
        console.error("Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    }
  };

  const handleContinueChat = (session: ChatSession | ChatSessionDetail) => {
    // Navigate to chat page with thread ID
    router.push(`/chat?thread=${session.thread_id}`);
  };

  const handleCreateNewChat = async () => {
    try {
      const response = await fetch(resolveServiceURL("chat/sessions"), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode: 'chat',
        }),
      });

      if (response.ok) {
        const newSession = await response.json();
        router.push(`/chat?session=${newSession.id}`);
      } else {
        console.error("Failed to create new chat session");
      }
    } catch (error) {
      console.error("Error creating new chat session:", error);
    }
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'chat':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'research':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'documents':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      session.title?.toLowerCase().includes(searchLower) ||
      session.id.toLowerCase().includes(searchLower) ||
      session.thread_id.toLowerCase().includes(searchLower)
    );
  });

  console.log("[ChatHistory] Sessions:", sessions.length, "Filtered:", filteredSessions.length, "Loading:", loading);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <header className="flex h-12 w-full items-center justify-between border-b px-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Chat History</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateNewChat}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sessions List */}
        <div className="w-96 border-r flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b flex-shrink-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={modeFilter === '' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModeFilter('')}
              >
                All
              </Button>
              <Button
                variant={modeFilter === 'chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModeFilter('chat')}
              >
                Chat
              </Button>
              <Button
                variant={modeFilter === 'research' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModeFilter('research')}
              >
                Research
              </Button>
              <Button
                variant={modeFilter === 'documents' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setModeFilter('documents')}
              >
                Documents
              </Button>
            </div>
          </div>

          {/* Sessions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>No chat sessions found</p>
              </div>
            ) : (
              filteredSessions.map((session) => (
                <Card
                  key={session.id}
                  className={`cursor-pointer hover:shadow-md transition-shadow ${
                    selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => fetchSessionDetail(session.id)}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm line-clamp-1">
                          {session.title || `${session.mode} session`}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getModeColor(session.mode)}>
                            {session.mode}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {session.message_count} messages
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleContinueChat(session)}>
                            Continue Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteSession(session.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(session.last_message_at), 'MMM d, h:mm a')}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Selected Session Detail */}
        <div className="flex-1 flex flex-col">
          {selectedSession ? (
            <>
              {/* Session Header */}
              <div className="border-b p-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedSession.title || `${selectedSession.mode} session`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Created {format(new Date(selectedSession.created_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleContinueChat(selectedSession)}
                    size="sm"
                  >
                    Continue Chat
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedSession.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium">
                          {message.role === 'user' ? 'You' : 'Assistant'}
                        </span>
                        <span className="text-xs opacity-70">
                          {format(new Date(message.created_at), 'h:mm a')}
                        </span>
                      </div>
                      <div className="whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Select a chat session to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <ChatHistoryDebug />
    </div>
  );
}