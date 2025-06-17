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
  Filter,
  Bot,
  MessageCircle,
  FolderPlus,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
} from "~/components/ui/dropdown-menu";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { resolveServiceURL } from "~/core/api/resolve-service-url";
import { getAuthToken } from "~/services/auth";
import { PROJECT_ICONS, getProjects, moveSessionToProject } from "~/core/api/projects";
import type { Project } from "~/core/api/projects";
import { toast } from "sonner";

interface ProjectInfo {
  id: string;
  name: string;
  color?: string;
  icon?: string;
}

interface ChatSession {
  id: string;
  thread_id: string;
  title?: string;
  mode: string;
  message_count: number;
  last_message_at: string;
  created_at: string;
  project?: ProjectInfo;
}

export default function ChatHistoryMain() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [moveLoading, setMoveLoading] = useState<string | null>(null);
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

  const fetchProjects = async () => {
    try {
      const projectsData = await getProjects();
      setProjects(projectsData);
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchProjects();
  }, [modeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }

    setDeleteLoading(sessionId);
    
    try {
      const response = await fetch(resolveServiceURL(`chat/sessions/${sessionId}`), {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
      } else {
        console.error("Failed to delete session");
      }
    } catch (error) {
      console.error("Error deleting session:", error);
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleContinueChat = (session: ChatSession) => {
    router.push(`/chat?thread=${session.thread_id}`);
  };

  const handleCreateNewChat = () => {
    router.push('/chat');
  };

  const handleMoveToProject = async (sessionId: string, projectId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setMoveLoading(sessionId);
    
    try {
      await moveSessionToProject(sessionId, projectId || undefined);
      
      // Update the session in the local state
      setSessions(sessions.map(session => {
        if (session.id === sessionId) {
          const project = projectId ? projects.find(p => p.id === projectId) : null;
          return {
            ...session,
            project: project ? {
              id: project.id,
              name: project.name,
              color: project.color,
              icon: project.icon
            } : undefined
          };
        }
        return session;
      }));
      
      const projectName = projectId ? projects.find(p => p.id === projectId)?.name : "No Project";
      toast.success(`Chat moved to ${projectName}`);
    } catch (error) {
      console.error("Failed to move chat to project:", error);
      toast.error("Failed to move chat to project");
    } finally {
      setMoveLoading(null);
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'chat':
        return MessageCircle;
      case 'research':
        return Bot;
      case 'documents':
        return FileText;
      default:
        return MessageSquare;
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

  const getProjectIcon = (iconId: string) => {
    const icon = PROJECT_ICONS.find(i => i.id === iconId);
    return icon?.emoji || "📁";
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
      <div className="flex flex-1 flex-col px-4 pt-4 pb-4 overflow-hidden">
        {/* Search and Filters - Aligned with content width */}
        <div className="w-full max-w-4xl mx-auto mb-4 flex-shrink-0">
          <div className="w-3/4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="flex-shrink-0">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => setModeFilter('')}>
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setModeFilter('chat')}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setModeFilter('research')}>
                    <Bot className="mr-2 h-4 w-4" />
                    Research
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* New Chat Button */}
              <Button
                onClick={handleCreateNewChat}
                size="sm"
                className="gap-2 flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Sessions List - Centered with max width like documents page */}
        <div className="w-full max-w-4xl mx-auto flex-1 overflow-auto min-h-0">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading chat history...</p>
              </div>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                <h3 className="mt-4 text-lg font-semibold">No chat sessions found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || modeFilter
                    ? "Try adjusting your search or filters"
                    : "Start a new chat to begin"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 w-3/4">
              {filteredSessions.map((session) => {
                const ModeIcon = getModeIcon(session.mode);
                return (
                  <div
                    key={session.id}
                    className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleContinueChat(session)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ModeIcon className={`h-5 w-5 ${session.mode === 'chat' ? 'text-blue-500' : session.mode === 'research' ? 'text-purple-500' : 'text-green-500'} flex-shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.title || `${session.mode === 'research' ? 'Research' : 'Chat'} session`}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{session.message_count} {session.message_count === 1 ? 'message' : 'messages'}</span>
                          <span>{format(new Date(session.last_message_at), 'MMM d, yyyy')}</span>
                          {session.project && (
                            <div className="flex items-center gap-1">
                              <span>{getProjectIcon(session.project.icon || "folder")}</span>
                              <span>{session.project.name}</span>
                              {session.project.color && (
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: session.project.color }}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${getModeColor(session.mode)} text-xs`}>
                        {session.mode}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <span className="sr-only">More options</span>
                            <div className="flex flex-col gap-1">
                              <div className="h-1 w-1 rounded-full bg-current" />
                              <div className="h-1 w-1 rounded-full bg-current" />
                              <div className="h-1 w-1 rounded-full bg-current" />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleContinueChat(session);
                          }}>
                            Continue Chat
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={moveLoading === session.id}>
                              <FolderPlus className="mr-2 h-4 w-4" />
                              {moveLoading === session.id ? 'Moving...' : 'Move to Project'}
                              <ChevronRight className="ml-auto h-4 w-4" />
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem 
                                onClick={(e) => handleMoveToProject(session.id, null, e)}
                                className={!session.project ? "bg-muted" : ""}
                              >
                                <span className="mr-2">📂</span>
                                No Project
                              </DropdownMenuItem>
                              {projects.map((project) => (
                                <DropdownMenuItem
                                  key={project.id}
                                  onClick={(e) => handleMoveToProject(session.id, project.id, e)}
                                  className={session.project?.id === project.id ? "bg-muted" : ""}
                                >
                                  <span className="mr-2">{getProjectIcon(project.icon || "folder")}</span>
                                  <span className="flex-1">{project.name}</span>
                                  {project.color && (
                                    <div
                                      className="w-2 h-2 rounded-full ml-2"
                                      style={{ backgroundColor: project.color }}
                                    />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="text-destructive"
                            disabled={deleteLoading === session.id}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteLoading === session.id ? 'Deleting...' : 'Delete'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}