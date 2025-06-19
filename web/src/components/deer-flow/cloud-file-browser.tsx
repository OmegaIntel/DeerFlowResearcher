'use client';

import { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { ScrollArea } from '~/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, FileText, Folder, Search, X, Download } from 'lucide-react';
import { Input } from '~/components/ui/input';
import { toast } from 'sonner';
import { getAuthToken } from '~/services/auth';
import { resolveServiceURL } from '~/core/api/resolve-service-url';
import { cn } from '~/lib/utils';

interface CloudFile {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  mime_type?: string;
  modified_at?: string;
  parent_id?: string;
}

interface CloudFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: string;
  serviceName: string;
  onFilesSelected: (files: CloudFile[]) => void;
}

export function CloudFileBrowser({ 
  isOpen, 
  onClose, 
  serviceType, 
  serviceName,
  onFilesSelected 
}: CloudFileBrowserProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);
  const [selectedFiles, setSelectedFiles] = useState<CloudFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    console.log('[CloudFileBrowser] State changed - isOpen:', isOpen, 'currentFolderId:', currentFolderId);
    if (isOpen) {
      // Reset state when opening
      if (!currentFolderId) {
        console.log('[CloudFileBrowser] Resetting state for root folder');
        setCurrentPath([]);
        setFolderHistory([{ id: null, name: 'Root' }]);
        setSelectedFiles([]);
        setSearchQuery('');
      }
      loadFiles(currentFolderId || undefined);
    }
  }, [isOpen, currentFolderId]);

  const loadFiles = async (folderId?: string) => {
    setLoading(true);
    console.log('[CloudFileBrowser] Loading files for folder:', folderId || 'root');
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (folderId) params.append('parent_id', folderId);
      
      const url = resolveServiceURL(`/integrations/${serviceType}/files${params.toString() ? '?' + params.toString() : ''}`);
      console.log('[CloudFileBrowser] Fetching URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[CloudFileBrowser] Received files:', data.files?.length || 0);
        setFiles(data.files || []);
      } else {
        toast.error('Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder: CloudFile) => {
    console.log('[CloudFileBrowser] Navigating to folder:', folder.name, 'ID:', folder.id);
    setCurrentPath([...currentPath, folder.name]);
    setCurrentFolderId(folder.id);
    setFolderHistory([...folderHistory, { id: folder.id, name: folder.name }]);
    setSelectedFiles([]);
  };

  const navigateBack = () => {
    if (folderHistory.length > 1) {
      const newHistory = [...folderHistory];
      newHistory.pop(); // Remove current folder
      const parentFolder = newHistory[newHistory.length - 1];
      
      if (parentFolder) {
        setFolderHistory(newHistory);
        setCurrentFolderId(parentFolder.id);
        
        const newPath = [...currentPath];
        newPath.pop();
        setCurrentPath(newPath);
        setSelectedFiles([]);
      }
    }
  };

  const toggleFileSelection = (file: CloudFile) => {
    if (file.type === 'folder') {
      navigateToFolder(file);
    } else {
      setSelectedFiles(prev => {
        const isSelected = prev.some(f => f.id === file.id);
        if (isSelected) {
          return prev.filter(f => f.id !== file.id);
        } else {
          return [...prev, file];
        }
      });
    }
  };

  const handleAddFiles = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      toast.success(`Added ${selectedFiles.length} file(s) from ${serviceName}`);
      onClose();
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            Browse {serviceName}
            {currentPath.length > 0 && (
              <span className="text-sm text-muted-foreground">
                / {currentPath.join(' / ')}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-3 border-b space-y-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentPath.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateBack}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="h-12 w-12 mb-2" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 py-4">
              {filteredFiles.map((file) => {
                const isSelected = selectedFiles.some(f => f.id === file.id);
                return (
                  <div
                    key={file.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected && file.type === 'file' && "bg-accent border-accent-foreground",
                      file.type === 'folder' ? "hover:bg-blue-50 dark:hover:bg-blue-950" : "hover:bg-accent/50"
                    )}
                    onClick={() => toggleFileSelection(file)}
                  >
                    {file.type === 'folder' ? (
                      <Folder className="h-5 w-5 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      {file.type === 'file' && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                          {file.modified_at && ` • ${new Date(file.modified_at).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    {file.type === 'folder' ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : isSelected ? (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs text-primary-foreground">✓</span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {selectedFiles.length} file(s) selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddFiles}
              disabled={selectedFiles.length === 0}
            >
              Add Files
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}