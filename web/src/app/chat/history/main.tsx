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

interface ChatSession {
  id: string;
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

      const response = await fetch(`/api/chat/sessions?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data: ChatSession[] = await response.json();
        setSessions(data);
        // Note: We'd need to update the backend to return total count
        setTotal(data.length);
      } else {
        console.error("Failed to fetch chat sessions");
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
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
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
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
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
        return 'bg-purple-100 text-purple-800';
      case 'documents':
        return 'bg-blue-100 text-blue-800';
      case 'chat':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDisplayTitle = (session: ChatSession) => {
    return session.title || `${session.mode} session`;
  };

  const filteredSessions = sessions.filter(session =>
    getDisplayTitle(session).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full w-full">
      {/* Sessions List */}
      <div className="flex w-80 flex-col border-r">
        {/* Header */}
        <header className="flex h-12 w-full items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <h1 className="text-lg font-semibold">Chat History</h1>
          </div>
          <div className="flex items-center gap-2">
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
        <div className="border-b p-4 space-y-2">
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
        <div className="flex-1 overflow-auto">
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
            <div className="space-y-2 p-4">
              {filteredSessions.map((session) => (
                <Card 
                  key={session.id} 
                  className={`cursor-pointer transition-colors hover:bg-accent ${
                    selectedSession?.id === session.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleSessionClick(session)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm line-clamp-1">
                          {getDisplayTitle(session)}
                        </CardTitle>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge className={getModeColor(session.mode)}>
                            {session.mode}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {session.message_count} messages
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <span className="sr-only">More options</span>
                            <div className="flex flex-col gap-0.5">
                              <div className="h-1 w-1 rounded-full bg-current" />
                              <div className="h-1 w-1 rounded-full bg-current" />
                              <div className="h-1 w-1 rounded-full bg-current" />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(session.last_message_at), 'MMM d, yyyy h:mm a')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session Detail */}
      <div className="flex flex-1 flex-col">
        {selectedSession ? (
          <>
            {/* Session Header */}
            <header className="flex h-12 w-full items-center justify-between border-b px-4">
              <div>
                <h2 className="font-semibold">
                  {selectedSession.title || `${selectedSession.mode} session`}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(selectedSession.created_at), 'MMMM d, yyyy')}
                </p>
              </div>
              <Badge className={getModeColor(selectedSession.mode)}>
                {selectedSession.mode}
              </Badge>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
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
                      <div className="whitespace-pre-wrap">{message.content}</div>
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
            <div className="border-t p-4">
              <InputBox
                className="mx-auto max-w-4xl"
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