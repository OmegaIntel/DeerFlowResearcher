import React, { useEffect, useRef, useState } from 'react';
import Spreadsheet from 'x-data-spreadsheet';
import * as XLSX from 'xlsx';
import { X, Download } from 'lucide-react';
import 'x-data-spreadsheet/dist/xspreadsheet.css';

interface SimpleSpreadsheetViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

const SimpleSpreadsheetViewer: React.FC<SimpleSpreadsheetViewerProps> = ({ 
  fileContent, 
  filename, 
  onClose 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const spreadsheetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (containerRef.current && fileContent) {
      loadSpreadsheet();
    }
  }, [fileContent]);

  const loadSpreadsheet = () => {
    try {
      // Parse Excel file
      const workbook = XLSX.read(fileContent, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to array of arrays
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
      
      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        
        // Create spreadsheet
        const options = {
          mode: 'read', // Read-only mode
          showToolbar: false,
          showGrid: true,
          showContextmenu: false,
          view: {
            height: () => containerRef.current?.clientHeight || 600,
            width: () => containerRef.current?.clientWidth || 800,
          },
        };
        
        spreadsheetRef.current = new Spreadsheet(containerRef.current, options);
        
        // Load data
        spreadsheetRef.current.loadData([{
          name: sheetName,
          rows: {},
          cells: data.reduce((acc: any, row: any[], rowIndex: number) => {
            row.forEach((cell, colIndex) => {
              if (cell !== null && cell !== undefined && cell !== '') {
                const cellKey = `${rowIndex}_${colIndex}`;
                acc[cellKey] = { text: String(cell) };
              }
            });
            return acc;
          }, {})
        }]);
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading spreadsheet:', error);
      setIsLoading(false);
    }
  };

  const downloadFile = () => {
    try {
      // For now, just download the original file
      const blob = new Blob([fileContent], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">{filename}</h3>
        
        <div className="flex items-center gap-2">
          <button
            onClick={downloadFile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={20} />
            Download
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Spreadsheet Container */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="text-white">Loading spreadsheet...</div>
          </div>
        )}
        <div 
          ref={containerRef} 
          className="w-full h-full"
          style={{ minHeight: '500px' }}
        />
      </div>
    </div>
  );
};

export default SimpleSpreadsheetViewer;