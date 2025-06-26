import React, { useEffect, useRef, useState } from 'react';
import { X, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import onlyOfficeService from '../../services/onlyOfficeService';

interface OnlyOfficeViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

const OnlyOfficeViewer: React.FC<OnlyOfficeViewerProps> = ({ fileContent, filename, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [docKey, setDocKey] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeOnlyOffice();
    return () => {
      if (docKey) {
        onlyOfficeService.closeSession(docKey);
      }
    };
  }, []);

  const initializeOnlyOffice = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if OnlyOffice server is available
      const isServerAvailable = await onlyOfficeService.checkServerHealth();
      setServerAvailable(isServerAvailable);

      if (!isServerAvailable) {
        setError('OnlyOffice server is not available. Please start the server with: docker-compose up onlyoffice-documentserver');
        setIsLoading(false);
        return;
      }

      // Create editing session
      const session = await onlyOfficeService.createSession(fileContent, filename);

      if (!session.success) {
        setError(session.error || 'Failed to create editing session');
        setIsLoading(false);
        return;
      }

      if (!session.config || !session.doc_key) {
        setError('Invalid session configuration');
        setIsLoading(false);
        return;
      }

      setDocKey(session.doc_key);

      // Initialize OnlyOffice editor
      if (editorRef.current) {
        editorRef.current.innerHTML = ''; // Clear container
        onlyOfficeService.initializeEditor(editorRef.current.id, session.config);
        
        // Set loading to false after a short delay to allow editor to load
        setTimeout(() => {
          setIsLoading(false);
        }, 2000);
      }

    } catch (err) {
      console.error('Error initializing OnlyOffice:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (docKey) {
      onlyOfficeService.closeSession(docKey);
    }
    initializeOnlyOffice();
  };

  const handleDownload = () => {
    // OnlyOffice handles download internally via its interface
    // Or we could implement a custom download endpoint
    alert('Use the Download option in the OnlyOffice toolbar, or we can implement a custom download endpoint.');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {serverAvailable === true ? (
              <CheckCircle className="text-green-500" size={20} />
            ) : serverAvailable === false ? (
              <AlertCircle className="text-red-500" size={20} />
            ) : (
              <div className="w-5 h-5 border-2 border-gray-500 border-t-blue-500 rounded-full animate-spin" />
            )}
            <span className="text-sm text-gray-400">
              {serverAvailable === true ? 'OnlyOffice Server' : 
               serverAvailable === false ? 'Server Offline' : 'Checking...'}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{filename}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Download"
          >
            <Download size={20} />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative">
        {error ? (
          <div className="flex items-center justify-center h-full bg-[#0a0a0a] text-white">
            <div className="text-center max-w-md">
              <AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
              <h3 className="text-lg font-semibold mb-2">Error Loading Excel</h3>
              <p className="text-sm text-gray-400 mb-4">{error}</p>
              {serverAvailable === false && (
                <div className="text-xs text-gray-500 bg-[#1a1a1a] p-3 rounded-lg">
                  <p className="mb-2">To start OnlyOffice server:</p>
                  <code className="bg-[#0a0a0a] px-2 py-1 rounded">
                    docker-compose up onlyoffice-documentserver
                  </code>
                </div>
              )}
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                <div className="text-center text-white">
                  <div className="w-8 h-8 border-2 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                  <div className="mb-2">Loading OnlyOffice Editor...</div>
                  <div className="text-sm text-gray-300">
                    This may take a few seconds for the first load
                  </div>
                </div>
              </div>
            )}
            
            {/* OnlyOffice Editor Container */}
            <div 
              id="onlyoffice-editor"
              ref={editorRef}
              className="w-full h-full"
              style={{ minHeight: '600px' }}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default OnlyOfficeViewer;