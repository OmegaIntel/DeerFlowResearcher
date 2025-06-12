"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  FileText,
  Download,
  Trash2,
  Upload,
  RefreshCw,
  FileIcon,
  Search,
  Filter,
} from "lucide-react";

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

interface Document {
  id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  processing_status: string;
  vectors_created: number;
  chunks_created: number;
  pinecone_index?: string;
  created_at: string;
  download_url?: string;
}

interface DocumentsResponse {
  documents: Document[];
  total: number;
  page: number;
  per_page: number;
}

export default function DocumentsMain() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDocuments = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: "20",
      });
      
      if (statusFilter) {
        params.append("status_filter", statusFilter);
      }

      const response = await fetch(`/api/documents?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data: DocumentsResponse = await response.json();
        setDocuments(data.documents);
        setTotal(data.total);
      } else {
        console.error("Failed to fetch documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, statusFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handleDownload = async (doc: Document) => {
    if (doc.download_url) {
      window.open(doc.download_url, '_blank');
      return;
    }

    try {
      const response = await fetch(`/api/documents/${doc.id}/download-url`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.download_url, '_blank');
      } else {
        console.error("Failed to get download URL");
      }
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
      });

      if (response.ok) {
        setDocuments(docs => docs.filter(doc => doc.id !== docId));
      } else {
        console.error("Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter(doc =>
    doc.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header */}
      <header className="flex h-12 w-full items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <h1 className="text-lg font-semibold">Documents</h1>
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
      <div className="flex flex-1 flex-col p-4">
        {/* Search and Filters */}
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Status
                {statusFilter && (
                  <Badge variant="secondary" className="ml-1">
                    {statusFilter}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setStatusFilter("")}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("processing")}>
                Processing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("pending")}>
                Pending
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
                Failed
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Documents Grid */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Loading documents...</p>
              </div>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <FileIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter
                    ? "Try adjusting your search or filters"
                    : "Upload documents to get started"}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredDocuments.map((doc) => (
                <Card key={doc.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <FileText className="h-8 w-8 text-blue-500" />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">More options</span>
                            <div className="flex flex-col gap-1">
                              <div className="h-1 w-1 rounded-full bg-current" />
                              <div className="h-1 w-1 rounded-full bg-current" />
                              <div className="h-1 w-1 rounded-full bg-current" />
                            </div>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-sm line-clamp-2">
                      {doc.original_filename}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <Badge className={getStatusColor(doc.processing_status)}>
                        {doc.processing_status}
                      </Badge>
                    </div>
                    
                    {doc.processing_status === 'completed' && (
                      <div className="text-xs text-muted-foreground">
                        <div>Vectors: {doc.vectors_created}</div>
                        <div>Chunks: {doc.chunks_created}</div>
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredDocuments.length} of {total} documents
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">Page {page}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Chat Input at Bottom */}
      <div className="border-t p-4">
        <InputBox
          className="mx-auto max-w-4xl"
          size="normal"
        />
      </div>
    </div>
  );
}