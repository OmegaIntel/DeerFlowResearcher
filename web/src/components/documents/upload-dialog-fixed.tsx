"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileIcon, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "~/components/ui/button";
import { Progress } from "~/components/ui/progress";
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-xl translate-x-[-50%] translate-y-[-50%] bg-background rounded-lg shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <div className="flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-lg font-semibold">Upload Documents</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload documents to process and search through them. Supported formats: PDF, TXT, MD, DOC, DOCX, CSV, JSON
              </p>
            </div>

            {/* Content */}
            <div className="px-6 pb-4 flex-1 overflow-y-auto">
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
                <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                {isDragActive ? (
                  <p className="text-sm">Drop the files here...</p>
                ) : (
                  <div>
                    <p className="text-sm">Drag & drop files here, or click to select</p>
                    <p className="text-xs text-muted-foreground mt-1">Maximum file size: 10MB</p>
                  </div>
                )}
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((fileStatus, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-md border bg-muted/30"
                    >
                      <div className="flex-shrink-0">
                        {getStatusIcon(fileStatus.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {fileStatus.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(fileStatus.file.size / 1024).toFixed(1)} KB
                        </p>
                        {fileStatus.error && (
                          <p className="text-xs text-red-500 mt-1">{fileStatus.error}</p>
                        )}
                      </div>
                      {fileStatus.status === "uploading" && (
                        <div className="flex-shrink-0">
                          <Progress value={fileStatus.progress} className="w-20" />
                        </div>
                      )}
                      {fileStatus.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
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
                  <>Upload {pendingFiles} {pendingFiles === 1 ? 'file' : 'files'}</>
                )}
              </Button>
            </div>
          </div>

          {/* Close button */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}