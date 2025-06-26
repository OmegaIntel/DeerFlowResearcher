import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, Download, RefreshCw, Save, Search, X, CheckCircle, AlertCircle, Grid, List, Settings } from 'lucide-react';
import { excelTemplates, TemplateCard } from './ExcelModelTemplates';
import AdvancedExcelViewer from './AdvancedExcelViewer';

interface ExcelFile {
  id: string;
  name: string;
  uploadDate: Date;
  size: number;
  content?: ArrayBuffer;
}

const TemplatesPage: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<ExcelFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ExcelFile | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    for (const file of files) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.xlsm')) {
        const arrayBuffer = await file.arrayBuffer();
        const newFile: ExcelFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          name: file.name,
          uploadDate: new Date(),
          size: file.size,
          content: arrayBuffer
        };
        setUploadedFiles(prev => [...prev, newFile]);
      }
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    // Load sample file automatically
    loadSampleFile();
  }, []);
  
  const loadSampleFile = async () => {
    try {
      console.log('Loading sample Excel file...');
      const response = await fetch('/sample-financials.xlsx?' + Date.now()); // Cache bust
      console.log('Response status:', response.status, 'Content-Type:', response.headers.get('content-type'));
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('Loaded ArrayBuffer size:', arrayBuffer.byteLength);
      
      const sampleFile: ExcelFile = {
        id: 'sample-file',
        name: 'Latham Historical Financials.xlsx',
        uploadDate: new Date(),
        size: arrayBuffer.byteLength,
        content: arrayBuffer
      };
      setUploadedFiles([sampleFile]);
      console.log('Sample file loaded successfully');
    } catch (error) {
      console.error('Error loading sample file:', error);
    }
  };

  const openFile = (file: ExcelFile) => {
    setSelectedFile(file);
    setShowTemplates(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  
  const handleTemplateSelect = async (template: any) => {
    try {
      // For demo, use the sample file as template
      const response = await fetch('/sample-financials.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      
      const newFile: ExcelFile = {
        id: `template-${template.id}-${Date.now()}`,
        name: `${template.name}.xlsx`,
        uploadDate: new Date(),
        size: arrayBuffer.byteLength,
        content: arrayBuffer
      };
      
      setUploadedFiles(prev => [...prev, newFile]);
      setShowTemplates(false);
      openFile(newFile);
    } catch (error) {
      console.error('Error loading template:', error);
    }
  };

  return (
    <div className="h-full bg-openbb-bg-primary text-openbb-text-primary p-4 flex">
      {/* File List Sidebar */}
      <div className="w-80 bg-openbb-bg-widget rounded-lg p-4 mr-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Excel Models</h2>
        
        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Upload size={20} />
            Upload
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Grid size={20} />
            Templates
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.xlsm"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        
        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          {uploadedFiles.length === 0 ? (
            <div className="text-openbb-text-muted text-center py-8">
              No files uploaded yet
            </div>
          ) : (
            <div className="space-y-2">
              {uploadedFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => openFile(file)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFile?.id === file.id 
                      ? 'bg-blue-900/30 border border-blue-600' 
                      : 'bg-openbb-bg-hover hover:bg-openbb-bg-secondary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <FileSpreadsheet className="text-green-500 mt-1" size={20} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-xs text-openbb-text-muted">
                        {file.uploadDate.toLocaleDateString()} • {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Excel Viewer/Editor */}
      <div className="flex-1 bg-openbb-bg-widget rounded-lg p-4 flex flex-col">
        {selectedFile && selectedFile.content ? (
          <AdvancedExcelViewer
            fileContent={selectedFile.content}
            filename={selectedFile.name}
            onClose={() => setSelectedFile(null)}
          />
        ) : showTemplates ? (
          <div className="flex-1 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Financial Model Templates</h3>
            <p className="text-sm text-openbb-text-secondary mb-6">
              Select a template to start building your financial model.
            </p>
            
            {/* Template Categories */}
            <div className="space-y-6">
              <div>
                <h4 className="text-md font-medium text-openbb-text-secondary mb-3">Valuation Models</h4>
                <div className="grid grid-cols-2 gap-4">
                  {excelTemplates
                    .filter(t => t.category === 'valuation')
                    .map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleTemplateSelect}
                      />
                    ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-md font-medium text-openbb-text-secondary mb-3">Financial Models</h4>
                <div className="grid grid-cols-2 gap-4">
                  {excelTemplates
                    .filter(t => t.category === 'financial')
                    .map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={handleTemplateSelect}
                      />
                    ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-openbb-text-muted">
            <div className="text-center">
              <FileSpreadsheet size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-xl mb-2">No file selected</p>
              <p className="text-sm">Upload and select an Excel model to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatesPage;