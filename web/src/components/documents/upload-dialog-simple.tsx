"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileIcon, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
import { ScrollArea } from "~/components/ui/scroll-area";
import { uploadFileToS3 } from "~/core/api/s3";
import { cn } from "~/lib/utils";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
  sessionId?: string;
}

interface FileUploadStatus {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  documentId?: string;
}

export function UploadDialog({ open, onOpenChange, onUploadComplete, sessionId }: UploadDialogProps) {
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    setIsUploading(true);
    
    for (let i = 0; i < files.length; i++) {
      const fileStatus = files[i];
      if (!fileStatus || fileStatus.status !== "pending") continue;

      // Update status to uploading
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "uploading", progress: 30 } : f
      ));

      try {
        // Simulate progress updates
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, progress: 60 } : f
        ));

        const result = await uploadFileToS3(fileStatus.file, sessionId);
        
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: "success", 
            progress: 100,
            documentId: result.document?.id 
          } : f
        ));
      } catch (error) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: "error", 
            progress: 0,
            error: error instanceof Error ? error.message : "Upload failed"
          } : f
        ));
      }
    }

    setIsUploading(false);
    
    // Check if all uploads completed successfully
    const allSuccess = files.every(f => f.status === "success");
    if (allSuccess && files.length > 0) {
      setTimeout(() => {
        onUploadComplete?.();
        onOpenChange(false);
        setFiles([]);
      }, 1000);
    }
  };

  const getStatusIcon = (status: FileUploadStatus["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <FileIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingFiles = files.filter(f => f.status === "pending").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload documents to process. Supported: PDF, TXT, MD, DOC, DOCX, CSV, JSON (Max: 10MB)
          </DialogDescription>
        </DialogHeader>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          {isDragActive ? (
            <p className="text-sm">Drop the files here...</p>
          ) : (
            <p className="text-sm">Drag & drop files here, or click to select</p>
          )}
        </div>

        {/* File List - Tile Grid */}
        {files.length > 0 && (
          <ScrollArea className="h-[240px] w-full rounded-md border p-3">
            <div className="grid grid-cols-2 gap-3">
              {files.map((fileStatus, index) => (
                <div
                  key={index}
                  className="relative p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  {/* Delete button for pending files */}
                  {fileStatus.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                  
                  {/* File icon with status */}
                  <div className="flex justify-center mb-2">
                    <div className="relative">
                      <FileIcon className="h-10 w-10 text-muted-foreground" />
                      <div className="absolute -bottom-1 -right-1">
                        {getStatusIcon(fileStatus.status)}
                      </div>
                    </div>
                  </div>
                  
                  {/* File info */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-center truncate" title={fileStatus.file.name}>
                      {fileStatus.file.name.length > 20 
                        ? fileStatus.file.name.substring(0, 17) + '...' 
                        : fileStatus.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                      {(fileStatus.file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  
                  {/* Progress bar for uploading files */}
                  {fileStatus.status === "uploading" && (
                    <div className="mt-2">
                      <Progress value={fileStatus.progress} className="h-1.5" />
                    </div>
                  )}
                  
                  {/* Error message */}
                  {fileStatus.status === "error" && (
                    <p className="text-xs text-destructive text-center mt-1 truncate" title={fileStatus.error}>
                      {fileStatus.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFiles([]);
            }}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={uploadFiles}
            disabled={pendingFiles === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Upload {pendingFiles} file{pendingFiles !== 1 ? 's' : ''}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}