import React, { useRef, useEffect, useState } from 'react';
import RevoGrid from '@revolist/revogrid-react';
import type { RevoGridCustomEvent, ColumnRegular } from '@revolist/revogrid';
import * as XLSX from 'xlsx';
import { X, Download, RefreshCw, Grid, CheckCircle } from 'lucide-react';

interface RevoGridViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

const RevoGridViewer: React.FC<RevoGridViewerProps> = ({ fileContent, filename, onClose }) => {
  const [columns, setColumns] = useState<ColumnRegular[]>([]);
  const [source, setSource] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [formulaBar, setFormulaBar] = useState('');
  const gridRef = useRef<RevoGrid>(null);

  useEffect(() => {
    loadExcelFile();
  }, [fileContent]);

  const loadExcelFile = () => {
    try {
      // Parse Excel file
      const workbook = XLSX.read(fileContent, { type: 'array', cellFormula: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        raw: false,
        defval: ''
      });

      // Generate columns
      const maxCols = Math.max(...jsonData.map((row: any) => row.length));
      const cols: ColumnRegular[] = [];
      
      for (let i = 0; i < maxCols; i++) {
        const colLetter = XLSX.utils.encode_col(i);
        cols.push({
          prop: i.toString(),
          name: colLetter,
          size: 100,
          editor: 'text'
        });
      }

      // Convert data to RevoGrid format
      const gridData = jsonData.map((row: any[], rowIndex: number) => {
        const rowData: any = {};
        row.forEach((cell, colIndex) => {
          // Check if cell has formula
          const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
          const cellObj = worksheet[cellRef];
          if (cellObj && cellObj.f) {
            rowData[colIndex] = `=${cellObj.f}`;
          } else {
            rowData[colIndex] = cell || '';
          }
        });
        return rowData;
      });

      setColumns(cols);
      setSource(gridData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      setIsLoading(false);
    }
  };

  const handleCellEdit = (e: RevoGridCustomEvent<any>) => {
    const { row, col, val } = e.detail;
    
    // Update formula bar
    setFormulaBar(val || '');
    
    // If it's a formula, try to calculate it
    if (val && val.toString().startsWith('=')) {
      // Simple formula calculation (would need more complex parser for real Excel formulas)
      try {
        // This is a placeholder - in production, you'd use a proper formula parser
        console.log('Formula entered:', val);
      } catch (error) {
        console.error('Formula error:', error);
      }
    }
  };

  const handleCellFocus = (e: RevoGridCustomEvent<any>) => {
    const { row, col } = e.detail;
    setSelectedCell({ row, col });
    
    // Update formula bar with current cell value
    if (source[row] && source[row][col]) {
      setFormulaBar(source[row][col]);
    } else {
      setFormulaBar('');
    }
  };

  const downloadFile = () => {
    try {
      // Convert RevoGrid data back to worksheet
      const ws = XLSX.utils.json_to_sheet(source);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      
      // Write file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      
      // Download
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCell) return;

      // F2 - Edit cell
      if (e.key === 'F2') {
        e.preventDefault();
        if (gridRef.current) {
          // Trigger edit mode
          const grid = gridRef.current as any;
          grid.beginEdit(selectedCell.row, selectedCell.col);
        }
      }

      // Ctrl+[ - Trace precedents (placeholder)
      if (e.ctrlKey && e.key === '[') {
        e.preventDefault();
        console.log('Trace precedents for cell:', selectedCell);
        // Would implement formula parsing and highlighting here
      }

      // Ctrl+] - Trace dependents (placeholder)
      if (e.ctrlKey && e.key === ']') {
        e.preventDefault();
        console.log('Trace dependents for cell:', selectedCell);
        // Would implement formula parsing and highlighting here
      }

      // F5 - Go to cell
      if (e.key === 'F5') {
        e.preventDefault();
        const cellRef = prompt('Go to cell (e.g., A1, B10):');
        if (cellRef) {
          // Parse cell reference and navigate
          const match = cellRef.match(/^([A-Z]+)(\d+)$/);
          if (match) {
            const col = XLSX.utils.decode_col(match[1]);
            const row = parseInt(match[2]) - 1;
            if (gridRef.current) {
              const grid = gridRef.current as any;
              grid.setCellFocus({ row, col });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-500" size={20} />
          <span className="text-sm text-gray-400">RevoGrid Engine</span>
          <h3 className="text-lg font-semibold text-white">{filename}</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-gray-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={downloadFile}
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

      {/* Formula Bar */}
      <div className="flex items-center gap-2 p-2 bg-[#1a1a1a] border-b border-gray-800">
        <div className="text-sm text-gray-400 min-w-[60px]">
          {selectedCell ? `${XLSX.utils.encode_col(selectedCell.col)}${selectedCell.row + 1}` : ''}
        </div>
        <input
          type="text"
          value={formulaBar}
          onChange={(e) => setFormulaBar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && selectedCell) {
              // Update cell value
              const newSource = [...source];
              newSource[selectedCell.row][selectedCell.col] = formulaBar;
              setSource(newSource);
            }
          }}
          className="flex-1 bg-[#0a0a0a] text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          placeholder="Enter formula or value"
        />
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="px-3 py-1 bg-[#151515] text-xs text-gray-500 border-b border-gray-800">
        F2: Edit | Ctrl+[: Trace Precedents | Ctrl+]: Trace Dependents | F5: Go to Cell
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Loading spreadsheet...</div>
          </div>
        ) : (
          <RevoGrid
            ref={gridRef}
            columns={columns}
            source={source}
            theme="darkMaterial"
            resize={true}
            autoSizeColumn={true}
            range={true}
            clipboard={true}
            onBeforeedit={handleCellEdit}
            onCellfocus={handleCellFocus}
            onAfterEdit={(e) => {
              const { row, col, val } = e.detail;
              const newSource = [...source];
              newSource[row][col] = val;
              setSource(newSource);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default RevoGridViewer;