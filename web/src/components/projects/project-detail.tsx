"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  MessageCircle, 
  Bot, 
  FileText, 
  Plus,
  Search,
  ArrowLeft,
  Upload,
  MoreVertical,
  Trash2,
  FolderPlus,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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
import { toast } from "sonner";

import type { Project } from "~/core/api/projects";
import {
  getProjectSessions,
  getProjectDocuments,
  moveSessionToProject,
  moveDocumentToProject,
  PROJECT_ICONS,
} from "~/core/api/projects";
import { deleteChatSession } from "~/core/api/chat-history";
import { deleteDocument } from "~/core/api/documents";

interface ProjectDetailProps {
  project: Project;
  allProjects: Project[];
  onBack: () => void;
}

export function ProjectDetail({ project, allProjects, onBack }: ProjectDetailProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [sessionSearchTerm, setSessionSearchTerm] = useState("");
  const [documentSearchTerm, setDocumentSearchTerm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [moveLoading, setMoveLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectContent();
  }, [project.id]);

  const fetchProjectContent = async () => {
    // Fetch sessions
    setLoadingSessions(true);
    try {
      const sessionsData = await getProjectSessions(project.id);
      setSessions(sessionsData);
    } catch (error) {
      console.error("Failed to fetch project sessions:", error);
      toast.error("Failed to load chat sessions");
    } finally {
      setLoadingSessions(false);
    }

    // Fetch documents
    setLoadingDocuments(true);
    try {
      const documentsData = await getProjectDocuments(project.id);
      setDocuments(documentsData);
    } catch (error) {
      console.error("Failed to fetch project documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleContinueChat = (session: any) => {
    router.push(`/chat?thread=${session.thread_id}`);
  };

  const handleViewDocument = (document: any) => {
    console.log('[ProjectDetail] Viewing document:', document);
    console.log('[ProjectDetail] Document ID:', document.id);
    // Open in a new tab
    window.open(`/document-viewer/${document.id}`, '_blank');
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this chat session?")) {
      return;
    }
    
    setDeleteLoading(sessionId);
    try {
      await deleteChatSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success("Chat session deleted");
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast.error("Failed to delete chat session");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDeleteDocument = async (documentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }
    
    setDeleteLoading(documentId);
    try {
      await deleteDocument(documentId);
      setDocuments(documents.filter(d => d.id !== documentId));
      toast.success("Document deleted");
    } catch (error) {
      console.error("Failed to delete document:", error);
      toast.error("Failed to delete document");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleMoveSession = async (sessionId: string, targetProjectId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setMoveLoading(sessionId);
    try {
      await moveSessionToProject(sessionId, targetProjectId || undefined);
      setSessions(sessions.filter(s => s.id !== sessionId));
      toast.success("Session moved to another project");
    } catch (error) {
      console.error("Failed to move session:", error);
      toast.error("Failed to move session");
    } finally {
      setMoveLoading(null);
    }
  };

  const handleMoveDocument = async (documentId: string, targetProjectId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setMoveLoading(documentId);
    try {
      await moveDocumentToProject(documentId, targetProjectId || undefined);
      setDocuments(documents.filter(d => d.id !== documentId));
      toast.success("Document moved to another project");
    } catch (error) {
      console.error("Failed to move document:", error);
      toast.error("Failed to move document");
    } finally {
      setMoveLoading(null);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(sessionSearchTerm.toLowerCase())
  );

  const filteredDocuments = documents.filter(document =>
    document.filename.toLowerCase().includes(documentSearchTerm.toLowerCase())
  );

  const getProjectIcon = (iconId?: string) => {
    const icon = PROJECT_ICONS.find(i => i.id === iconId);
    return icon?.emoji || "📁";
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'chat':
        return MessageCircle;
      case 'research':
        return Bot;
      default:
        return MessageCircle;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <div className="text-2xl">{getProjectIcon(project.icon)}</div>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              {project.name}
              {project.color && (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
            </h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="chats" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="chats">
              Chats ({sessions.length})
            </TabsTrigger>
            <TabsTrigger value="documents">
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>

          {/* Chats Tab */}
          <TabsContent value="chats" className="flex-1 overflow-hidden">
            <div className="p-4 space-y-4 h-full flex flex-col">
              {/* Search and Actions */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={sessionSearchTerm}
                    onChange={(e) => setSessionSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => router.push('/chat')}
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Chat
                </Button>
              </div>

              {/* Sessions List */}
              <div className="flex-1 overflow-auto">
                {loadingSessions ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading chats...
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {sessionSearchTerm ? "No chats found" : "No chats in this project yet"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSessions.map((session) => {
                      const ModeIcon = getModeIcon(session.mode);
                      return (
                        <div
                          key={session.id}
                          className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => handleContinueChat(session)}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <ModeIcon className={`h-5 w-5 ${session.mode === 'chat' ? 'text-blue-500' : 'text-purple-500'} flex-shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {session.title}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{session.message_count} messages</span>
                                <span>{format(new Date(session.last_message_at), 'MMM d, yyyy')}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={`text-xs ${session.mode === 'chat' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                              {session.mode}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger disabled={moveLoading === session.id}>
                                    <FolderPlus className="mr-2 h-4 w-4" />
                                    {moveLoading === session.id ? 'Moving...' : 'Move to Project'}
                                    <ChevronRight className="ml-auto h-4 w-4" />
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem 
                                      onClick={(e) => handleMoveSession(session.id, null, e)}
                                    >
                                      <span className="mr-2">📂</span>
                                      No Project
                                    </DropdownMenuItem>
                                    {allProjects.filter(p => p.id !== project.id).map((proj) => (
                                      <DropdownMenuItem
                                        key={proj.id}
                                        onClick={(e) => handleMoveSession(session.id, proj.id, e)}
                                      >
                                        <span className="mr-2">{getProjectIcon(proj.icon)}</span>
                                        <span className="flex-1">{proj.name}</span>
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
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="flex-1 overflow-hidden">
            <div className="p-4 space-y-4 h-full flex flex-col">
              {/* Search and Actions */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={documentSearchTerm}
                    onChange={(e) => setDocumentSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => router.push('/documents')}
                  size="sm"
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload Document
                </Button>
              </div>

              {/* Documents List */}
              <div className="flex-1 overflow-auto">
                {loadingDocuments ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading documents...
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {documentSearchTerm ? "No documents found" : "No documents in this project yet"}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="group flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleViewDocument(document)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {document.filename}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span>{(document.file_size / 1024).toFixed(1)} KB</span>
                              <span>{format(new Date(document.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {document.content_type?.split('/').pop()?.toUpperCase() || 'FILE'}
                          </Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger disabled={moveLoading === document.id}>
                                  <FolderPlus className="mr-2 h-4 w-4" />
                                  {moveLoading === document.id ? 'Moving...' : 'Move to Project'}
                                  <ChevronRight className="ml-auto h-4 w-4" />
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuItem 
                                    onClick={(e) => handleMoveDocument(document.id, null, e)}
                                  >
                                    <span className="mr-2">📂</span>
                                    No Project
                                  </DropdownMenuItem>
                                  {allProjects.filter(p => p.id !== project.id).map((proj) => (
                                    <DropdownMenuItem
                                      key={proj.id}
                                      onClick={(e) => handleMoveDocument(document.id, proj.id, e)}
                                    >
                                      <span className="mr-2">{getProjectIcon(proj.icon)}</span>
                                      <span className="flex-1">{proj.name}</span>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              
                              <DropdownMenuSeparator />
                              
                              <DropdownMenuItem
                                onClick={(e) => handleDeleteDocument(document.id, e)}
                                className="text-destructive"
                                disabled={deleteLoading === document.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleteLoading === document.id ? 'Deleting...' : 'Delete'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}