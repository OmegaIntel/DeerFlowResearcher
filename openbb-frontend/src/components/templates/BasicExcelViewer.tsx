import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Download } from 'lucide-react';

interface BasicExcelViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

const BasicExcelViewer: React.FC<BasicExcelViewerProps> = ({ fileContent, filename, onClose }) => {
  const [data, setData] = useState<any[][]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      console.log('Processing Excel file, size:', fileContent.byteLength);
      
      // Ensure we have valid ArrayBuffer
      if (!fileContent || fileContent.byteLength === 0) {
        setError('No file content to display');
        return;
      }
      
      // Convert ArrayBuffer to Uint8Array for proper binary handling
      const uint8Array = new Uint8Array(fileContent);
      console.log('First few bytes:', Array.from(uint8Array.slice(0, 10)).map(b => b.toString(16)).join(' '));
      
      // Read the workbook with proper binary handling
      const workbook = XLSX.read(uint8Array, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false 
      });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        setError('No sheets found in Excel file');
        return;
      }
      
      console.log('Available sheets:', workbook.SheetNames);
      
      // Get first sheet
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      if (!worksheet) {
        setError('Unable to read worksheet');
        return;
      }
      
      // Check if the sheet has data
      const range = worksheet['!ref'];
      if (!range) {
        setError('Worksheet appears to be empty');
        return;
      }
      
      console.log('Sheet range:', range);
      
      // Convert to array of arrays with better handling
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        raw: false,
        defval: '',
        blankrows: false
      });
      
      // Filter out completely empty rows
      const filteredData = jsonData.filter((row: any) => 
        row && row.some((cell: any) => cell !== null && cell !== undefined && cell !== '')
      );
      
      console.log('Excel data loaded, total rows:', jsonData.length, 'non-empty rows:', filteredData.length);
      console.log('Sample of loaded data:', filteredData.slice(0, 3));
      
      if (filteredData.length === 0) {
        setError('No data found in Excel file');
        return;
      }
      
      setData(filteredData as any[][]);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      setError(`Error loading Excel file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fileContent]);

  const downloadFile = () => {
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
  };

  if (error) {
    return (
      <div className="flex flex-col h-full bg-[#0a0a0a] text-white p-4">
        <div className="text-red-500">{error}</div>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-gray-800">
        <h3 className="text-lg font-semibold text-white">{filename}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadFile}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Download size={20} />
            Download
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#222222] rounded-lg text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {data.length > 0 ? (
          <div>
            <div className="mb-2 text-xs text-gray-500">
              Loaded {data.length} rows from Excel file
            </div>
            <table className="w-full border-collapse">
              <tbody>
                {data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="border border-gray-700 px-2 py-1 text-white bg-[#1a1a1a] text-sm"
                        style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {String(cell || '').substring(0, 100)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-400">No data to display</div>
        )}
      </div>
    </div>
  );
};

export default BasicExcelViewer;