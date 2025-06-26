import React, { useRef, useEffect, useState } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import * as XLSX from 'xlsx';
import { X, Download, RefreshCw, Grid, CheckCircle, AlertCircle } from 'lucide-react';
import 'handsontable/dist/handsontable.full.min.css';

// Register Handsontable's modules
registerAllModules();

interface HandsontableViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

const HandsontableViewer: React.FC<HandsontableViewerProps> = ({ fileContent, filename, onClose }) => {
  const [data, setData] = useState<any[][]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [formulaBar, setFormulaBar] = useState('');
  const hotRef = useRef<any>(null);
  const [formulas, setFormulas] = useState<Map<string, string>>(new Map());
  const [precedents, setPrecedents] = useState<string[]>([]);
  const [dependents, setDependents] = useState<string[]>([]);

  useEffect(() => {
    loadExcelFile();
  }, [fileContent]);

  const loadExcelFile = () => {
    try {
      // Parse Excel file
      const workbook = XLSX.read(fileContent, { type: 'array', cellFormula: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get range of worksheet
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // Build data array and store formulas
      const gridData: any[][] = [];
      const formulaMap = new Map<string, string>();
      
      for (let R = 0; R <= range.e.r; ++R) {
        const row: any[] = [];
        for (let C = 0; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellRef];
          
          if (cell) {
            if (cell.f) {
              // Store formula
              formulaMap.set(cellRef, '=' + cell.f);
              row.push('=' + cell.f);
            } else {
              row.push(cell.v);
            }
          } else {
            row.push('');
          }
        }
        gridData.push(row);
      }
      
      setFormulas(formulaMap);
      
      // Generate column headers
      const cols = [];
      for (let i = 0; i <= range.e.c; i++) {
        cols.push({
          data: i,
          type: 'text',
          width: 100
        });
      }

      setData(gridData);
      setColumns(cols);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      setIsLoading(false);
    }
  };

  const findPrecedents = (formula: string): string[] => {
    // Simple regex to find cell references in formula
    const cellRefs = formula.match(/[A-Z]+\d+/g) || [];
    return [...new Set(cellRefs)];
  };

  const findDependents = (cellRef: string): string[] => {
    const deps: string[] = [];
    formulas.forEach((formula, cell) => {
      if (formula.includes(cellRef)) {
        deps.push(cell);
      }
    });
    return deps;
  };

  const highlightCells = (cells: string[], className: string) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    // Clear previous highlights
    hot.selectCells([]);
    
    // Highlight new cells
    cells.forEach(cellRef => {
      const { r, c } = XLSX.utils.decode_cell(cellRef);
      const td = hot.getCell(r, c);
      if (td) {
        td.classList.add(className);
      }
    });
  };

  const clearHighlights = () => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;
    
    const tds = hot.rootElement.querySelectorAll('.precedent-highlight, .dependent-highlight');
    tds.forEach((td: any) => {
      td.classList.remove('precedent-highlight', 'dependent-highlight');
    });
  };

  const handleCellSelection = (row: number, col: number) => {
    setSelectedCell({ row, col });
    const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
    
    // Update formula bar
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      const value = hot.getDataAtCell(row, col);
      setFormulaBar(value || '');
    }
    
    // Clear previous highlights
    clearHighlights();
    setPrecedents([]);
    setDependents([]);
  };

  const tracePrecedents = () => {
    if (!selectedCell) return;
    
    const cellRef = XLSX.utils.encode_cell({ r: selectedCell.row, c: selectedCell.col });
    const formula = formulas.get(cellRef);
    
    if (formula) {
      const precs = findPrecedents(formula);
      setPrecedents(precs);
      highlightCells(precs, 'precedent-highlight');
    }
  };

  const traceDependents = () => {
    if (!selectedCell) return;
    
    const cellRef = XLSX.utils.encode_cell({ r: selectedCell.row, c: selectedCell.col });
    const deps = findDependents(cellRef);
    setDependents(deps);
    highlightCells(deps, 'dependent-highlight');
  };

  const downloadFile = () => {
    try {
      const hot = hotRef.current?.hotInstance;
      if (!hot) return;
      
      // Get data from Handsontable
      const exportData = hot.getData();
      
      // Convert to worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData);
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
      // F2 - Edit cell
      if (e.key === 'F2' && selectedCell) {
        e.preventDefault();
        const hot = hotRef.current?.hotInstance;
        if (hot) {
          hot.selectCell(selectedCell.row, selectedCell.col);
          hot.getActiveEditor()?.open();
        }
      }

      // Ctrl+[ - Trace precedents
      if (e.ctrlKey && e.key === '[') {
        e.preventDefault();
        tracePrecedents();
      }

      // Ctrl+] - Trace dependents
      if (e.ctrlKey && e.key === ']') {
        e.preventDefault();
        traceDependents();
      }

      // F5 - Go to cell
      if (e.key === 'F5') {
        e.preventDefault();
        const cellRef = prompt('Go to cell (e.g., A1, B10):');
        if (cellRef && /^[A-Z]+\d+$/i.test(cellRef)) {
          const { r, c } = XLSX.utils.decode_cell(cellRef.toUpperCase());
          const hot = hotRef.current?.hotInstance;
          if (hot) {
            hot.selectCell(r, c);
            hot.scrollViewportTo(r, c);
          }
        }
      }

      // Escape - Clear highlights
      if (e.key === 'Escape') {
        clearHighlights();
        setPrecedents([]);
        setDependents([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Custom styles for highlights */}
      <style>{`
        .handsontable .precedent-highlight {
          background-color: #3b82f6 !important;
          color: white !important;
        }
        .handsontable .dependent-highlight {
          background-color: #10b981 !important;
          color: white !important;
        }
        .handsontable {
          color: #e5e7eb;
          background-color: #0a0a0a;
        }
        .handsontable td, .handsontable th {
          border-color: #374151;
          background-color: #111111;
        }
        .handsontable th {
          background-color: #1f2937;
          color: #e5e7eb;
        }
        .handsontable .ht__active_highlight {
          background-color: #1e40af;
        }
        .handsontable .ht__selection {
          background-color: rgba(59, 130, 246, 0.2);
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-blue-500" size={20} />
          <span className="text-sm text-gray-400">Handsontable Engine</span>
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
              const hot = hotRef.current?.hotInstance;
              if (hot) {
                hot.setDataAtCell(selectedCell.row, selectedCell.col, formulaBar);
              }
            }
          }}
          className="flex-1 bg-[#0a0a0a] text-white px-2 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
          placeholder="Enter formula or value"
        />
      </div>

      {/* Keyboard Shortcuts Info */}
      <div className="px-3 py-1 bg-[#151515] text-xs text-gray-500 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <span>F2: Edit | Ctrl+[: Trace Precedents | Ctrl+]: Trace Dependents | F5: Go to Cell | ESC: Clear Highlights</span>
          {precedents.length > 0 && (
            <span className="text-blue-400">Precedents: {precedents.join(', ')}</span>
          )}
          {dependents.length > 0 && (
            <span className="text-green-400">Dependents: {dependents.join(', ')}</span>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Loading spreadsheet...</div>
          </div>
        ) : (
          <HotTable
            ref={hotRef}
            data={data}
            colHeaders={true}
            rowHeaders={true}
            width="100%"
            height="100%"
            licenseKey="non-commercial-and-evaluation"
            contextMenu={true}
            manualColumnResize={true}
            manualRowResize={true}
            formulas={{
              engine: {
                hyperformula: {
                  licenseKey: 'gpl-v3'
                }
              }
            }}
            afterSelection={(row: number, col: number) => {
              handleCellSelection(row, col);
            }}
            afterChange={(changes: any) => {
              if (changes) {
                changes.forEach(([row, col, oldVal, newVal]: any) => {
                  const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
                  if (newVal && newVal.toString().startsWith('=')) {
                    formulas.set(cellRef, newVal);
                  } else {
                    formulas.delete(cellRef);
                  }
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default HandsontableViewer;