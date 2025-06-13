"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  MessageSquare,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Edit,
  Plus,
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
import { InputBox } from "~/app/chat/components/input-box";
import { getAuthToken } from "~/services/auth";
import { resolveServiceURL } from "~/core/api/resolve-service-url";

interface ChatSession {
  id: string;
  thread_id: string;
  title?: string;
  mode: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
}

interface ChatSessionsResponse {
  sessions: ChatSession[];
  total: number;
  page: number;
  per_page: number;
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
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ChatSessionDetail | null>(null);

  const fetchSessions = async () => {
    try {
      const params = new URLSearchParams({
        skip: ((page - 1) * 20).toString(),
        limit: "20",
      });
      
      if (modeFilter) {
        params.append("mode", modeFilter);
      }

      const url = resolveServiceURL(`chat/sessions?${params}`);
      console.log("[Chat History] Fetching sessions from:", url);
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      console.log("[Chat History] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[Chat History] Raw response data:", data);
        console.log("[Chat History] Data type:", typeof data, "Is Array:", Array.isArray(data));
        
        // Ensure we have an array
        const sessionsArray: ChatSession[] = Array.isArray(data) ? data : [];
        console.log("[Chat History] Fetched sessions:", sessionsArray.length);
        setSessions(sessionsArray);
        // Note: We'd need to update the backend to return total count
        setTotal(sessionsArray.length);
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
        const data: ChatSessionDetail = await response.json();
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
  }, [page, modeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleNewChat = () => {
    router.push('/chat');
  };

  const handleSessionClick = (session: ChatSession) => {
    fetchSessionDetail(session.id);
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
        setSessions(sessions => sessions.filter(session => session.id !== sessionId));
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

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'research':
        return 'bg-purple-100/60 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
      case 'documents':
        return 'bg-blue-100/60 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
      case 'chat':
        return 'bg-green-100/60 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100/60 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getDisplayTitle = (session: ChatSession) => {
    return session.title || `${session.mode} session`;
  };

  const filteredSessions = sessions.filter(session =>
    getDisplayTitle(session).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  console.log("[Chat History] Sessions:", sessions.length, "Filtered:", filteredSessions.length, "Loading:", loading, "Search:", searchTerm);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sessions List */}
      <div className="flex w-80 flex-col border-r flex-shrink-0 overflow-hidden">
        {/* Header */}
        <header className="flex h-12 w-full items-center justify-between border-b px-4 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold truncate">Chat History</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNewChat}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Search and Filters */}
        <div className="border-b p-4 space-y-2 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Filter className="h-4 w-4" />
                Mode
                {modeFilter && (
                  <Badge variant="secondary" className="ml-1">
                    {modeFilter}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem onClick={() => setModeFilter("")}>
                All Modes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setModeFilter("chat")}>
                Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setModeFilter("research")}>
                Research
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setModeFilter("documents")}>
                Documents
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading sessions...</p>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex h-full items-center justify-center p-4">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No sessions found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchTerm || modeFilter
                    ? "Try adjusting your search or filters"
                    : "Start a new chat to create your first session"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredSessions.map((session) => (
                <div 
                  key={session.id} 
                  className={`group relative flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-all hover:bg-accent/50 ${
                    selectedSession?.id === session.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSessionClick(session)}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">
                        {getDisplayTitle(session)}
                      </h3>
                      <Badge className={`${getModeColor(session.mode)} h-5 px-1.5 text-[10px]`}>
                        {session.mode}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">
                        {session.message_count} messages
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(session.last_message_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="sr-only">More options</span>
                        <div className="flex flex-col gap-0.5">
                          <div className="h-1 w-1 rounded-full bg-current" />
                          <div className="h-1 w-1 rounded-full bg-current" />
                          <div className="h-1 w-1 rounded-full bg-current" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/chat?thread=${session.thread_id}`);
                        }}
                      >
                        <MessageSquare className="mr-2 h-3 w-3" />
                        Continue Chat
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-3 w-3" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Detail */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {selectedSession ? (
          <>
            {/* Session Header */}
            <header className="flex h-12 w-full items-center justify-between border-b px-4 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold truncate">
                  {selectedSession.title || `${selectedSession.mode} session`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedSession.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
              <Badge className={`${getModeColor(selectedSession.mode)} flex-shrink-0`}>
                {selectedSession.mode}
              </Badge>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 min-h-0">
              <div className="space-y-4 w-full max-w-none">
                {selectedSession.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      <div className={`mt-1 text-xs ${
                        message.role === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      }`}>
                        {format(new Date(message.created_at), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t p-4 flex-shrink-0">
              <InputBox
                className="w-full max-w-none"
                size="normal"
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Select a chat session</h3>
              <p className="text-muted-foreground">
                Choose a session from the list to view its messages
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}