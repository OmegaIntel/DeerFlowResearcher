import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, ZoomIn, ZoomOut, RotateCcw, ChevronDown } from 'lucide-react';

interface AdvancedExcelViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

interface CellData {
  value: any;
  formula?: string;
  style?: any;
}

const AdvancedExcelViewer: React.FC<AdvancedExcelViewerProps> = ({ fileContent, filename, onClose }) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [tableData, setTableData] = useState<CellData[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [currentFormula, setCurrentFormula] = useState('');
  const [showFormulaBar, setShowFormulaBar] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLTableElement>(null);

  // Excel-like navigation
  const [focusedCell, setFocusedCell] = useState<{row: number, col: number} | null>(null);

  useEffect(() => {
    if (fileContent) {
      loadSpreadsheet();
    }
  }, [fileContent]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedCell || !tableData.length) return;

      const { row, col } = focusedCell;
      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          newRow = Math.max(1, row - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          newRow = Math.min(tableData.length - 1, row + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          newCol = Math.max(1, col - 1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          newCol = Math.min(tableData[0]?.length - 1 || 0, col + 1);
          break;
        case 'Enter':
          e.preventDefault();
          newRow = Math.min(tableData.length - 1, row + 1);
          break;
        case 'Tab':
          e.preventDefault();
          newCol = Math.min(tableData[0]?.length - 1 || 0, col + 1);
          break;
        case 'Home':
          e.preventDefault();
          if (e.ctrlKey) {
            newRow = 1;
            newCol = 1;
          } else {
            newCol = 1;
          }
          break;
        case 'End':
          e.preventDefault();
          if (e.ctrlKey) {
            newRow = tableData.length - 1;
            newCol = tableData[0]?.length - 1 || 0;
          } else {
            // Find last non-empty cell in row
            newCol = tableData[row]?.length - 1 || 0;
          }
          break;
        case 'F2':
          e.preventDefault();
          setShowFormulaBar(true);
          break;
        case 'Escape':
          e.preventDefault();
          setShowFormulaBar(false);
          break;
      }

      if (newRow !== row || newCol !== col) {
        setFocusedCell({ row: newRow, col: newCol });
        setSelectedCell({ row: newRow, col: newCol });
        updateCurrentFormula(newRow, newCol);
        scrollToCell(newRow, newCol);
      }
    };

    // Only attach when component is focused
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusedCell, tableData, zoom]);

  const loadSpreadsheet = () => {
    try {
      console.log('Loading Excel file, size:', fileContent.byteLength);
      
      const uint8Array = new Uint8Array(fileContent);
      const wb = XLSX.read(uint8Array, { 
        type: 'array', 
        cellFormula: true,
        cellStyles: true,
        cellNF: true,
        cellText: false,
        cellDates: true,
        raw: false // Ensure proper date parsing
      });
      
      console.log('Workbook loaded with sheets:', wb.SheetNames);
      
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      
      if (wb.SheetNames.length > 0) {
        setSelectedSheet(wb.SheetNames[0]);
        loadSheet(wb, wb.SheetNames[0]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading spreadsheet:', error);
      // Show error to user
      setTableData([[{ value: `Error loading Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`, formula: '' }]]);
      setIsLoading(false);
    }
  };

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = wb.Sheets[sheetName];
      
      if (!worksheet || !worksheet['!ref']) {
        setTableData([]);
        return;
      }
      
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      const data: CellData[][] = [];
      
      // Add column headers (A, B, C, etc.)
      const headers: CellData[] = [{ value: '', formula: '' }];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        headers.push({ value: XLSX.utils.encode_col(C), formula: '' });
      }
      data.push(headers);
      
      // Add data rows
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const row: CellData[] = [{ value: R + 1, formula: '' }]; // Row number
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellRef];
          
          if (cell) {
            let value = '';
            
            // Handle different cell types safely
            if (cell.w !== undefined) {
              // Use the formatted text value if available
              value = cell.w;
            } else if (cell.v !== undefined) {
              // Convert value to string, handling dates and other types
              if (cell.t === 'd' || cell.v instanceof Date) {
                // Handle date values
                const date = cell.v instanceof Date ? cell.v : new Date(cell.v);
                value = date.toLocaleDateString();
              } else if (typeof cell.v === 'object') {
                // Handle object values
                value = JSON.stringify(cell.v);
              } else {
                // Handle primitive values
                value = String(cell.v);
              }
            }
            
            row.push({
              value: value,
              formula: cell.f ? '=' + cell.f : '',
              style: cell.s || {}
            });
          } else {
            row.push({ value: '', formula: '' });
          }
        }
        data.push(row);
      }
      
      setTableData(data);
      setFocusedCell({ row: 1, col: 1 });
      setSelectedCell({ row: 1, col: 1 });
    } catch (error) {
      console.error('Error loading sheet:', error);
      setTableData([]);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (workbook) {
      setSelectedSheet(sheetName);
      loadSheet(workbook, sheetName);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (row === 0 || col === 0) return; // Ignore header clicks
    
    setFocusedCell({ row, col });
    setSelectedCell({ row, col });
    updateCurrentFormula(row, col);
  };

  const updateCurrentFormula = (row: number, col: number) => {
    const cellData = tableData[row]?.[col];
    if (cellData?.formula) {
      setCurrentFormula(cellData.formula);
    } else if (cellData?.value !== undefined) {
      // Safely convert value to string
      const value = cellData.value;
      if (typeof value === 'string') {
        setCurrentFormula(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        setCurrentFormula(String(value));
      } else {
        setCurrentFormula('');
      }
    } else {
      setCurrentFormula('');
    }
  };

  const scrollToCell = (row: number, col: number) => {
    if (gridRef.current) {
      const cell = gridRef.current.querySelector(`tr:nth-child(${row + 1}) td:nth-child(${col + 1})`) as HTMLElement;
      if (cell) {
        cell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }
    }
  };

  const handleZoom = (delta: number) => {
    setZoom(prev => Math.max(25, Math.min(400, prev + delta)));
  };

  const downloadAsXlsx = () => {
    try {
      if (!workbook) return;
      
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { 
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

  const getCellStyle = (row: number, col: number): React.CSSProperties => {
    const isFocused = focusedCell && focusedCell.row === row && focusedCell.col === col;
    const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
    const hasFormula = tableData[row]?.[col]?.formula;
    
    const baseStyle: React.CSSProperties = {
      border: '1px solid #374151',
      padding: '6px 8px',
      cursor: 'cell',
      userSelect: 'none',
      fontSize: `${Math.round(12 * zoom / 100)}px`,
      minWidth: '80px',
      maxWidth: '200px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    };
    
    if (row === 0 || col === 0) {
      return {
        ...baseStyle,
        background: '#1f2937',
        fontWeight: 600,
        cursor: 'default',
        textAlign: 'center'
      };
    } else if (isFocused || isSelected) {
      return {
        ...baseStyle,
        background: '#1e40af',
        color: 'white',
        outline: '2px solid #3b82f6'
      };
    } else if (hasFormula) {
      return {
        ...baseStyle,
        background: '#1e293b',
        color: '#e2e8f0'
      };
    }
    
    return {
      ...baseStyle,
      background: '#1a1a1a',
      color: '#e5e7eb'
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-openbb-bg-primary text-openbb-text-primary">
        <div>Loading Excel file...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-openbb-bg-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-openbb-bg-widget border-b border-openbb-border">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-openbb-text-primary">{filename}</h3>
          
          {/* Sheet Selector */}
          {sheetNames.length > 1 && (
            <div className="relative">
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="bg-openbb-bg-secondary text-openbb-text-primary px-3 py-1 rounded border border-openbb-border focus:border-openbb-accent focus:outline-none appearance-none pr-8"
              >
                {sheetNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-openbb-text-muted pointer-events-none" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-openbb-border rounded">
            <button
              onClick={() => handleZoom(-25)}
              className="p-1 hover:bg-openbb-bg-hover text-openbb-text-muted hover:text-openbb-text-primary"
              title="Zoom Out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs text-openbb-text-muted px-2 min-w-[50px] text-center">{zoom}%</span>
            <button
              onClick={() => handleZoom(25)}
              className="p-1 hover:bg-openbb-bg-hover text-openbb-text-muted hover:text-openbb-text-primary"
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(100)}
              className="p-1 hover:bg-openbb-bg-hover text-openbb-text-muted hover:text-openbb-text-primary border-l border-openbb-border"
              title="Reset Zoom"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          
          {/* Download button - small arrow */}
          <button
            onClick={downloadAsXlsx}
            className="p-2 hover:bg-openbb-bg-hover rounded-lg text-openbb-text-muted hover:text-openbb-text-primary"
            title="Download XLSX"
          >
            <Download size={16} />
          </button>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-openbb-bg-hover rounded-lg text-openbb-text-muted hover:text-openbb-text-primary"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      {showFormulaBar && (
        <div className="flex items-center gap-2 p-2 bg-openbb-bg-widget border-b border-openbb-border">
          <div className="text-sm text-gray-400 min-w-[60px]">
            {focusedCell ? `${XLSX.utils.encode_col(focusedCell.col - 1)}${focusedCell.row}` : ''}
          </div>
          <input
            type="text"
            value={currentFormula}
            readOnly
            className="flex-1 bg-openbb-bg-secondary text-openbb-text-primary px-2 py-1 rounded border border-openbb-border text-sm"
            placeholder="Cell value or formula"
          />
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="px-3 py-1 bg-openbb-bg-secondary text-xs text-openbb-text-muted border-b border-openbb-border">
        Arrow Keys: Navigate | Enter/Tab: Move | F2: View Formula | Home/End: Jump | Ctrl+Home: Go to A1 | Mouse Wheel: Zoom
      </div>

      {/* Spreadsheet Container */}
      <div 
        ref={tableRef} 
        className="flex-1 overflow-auto" 
        style={{ fontSize: `${zoom}%` }}
        tabIndex={0}
        onWheel={(e) => {
          if (e.ctrlKey) {
            e.preventDefault();
            handleZoom(e.deltaY > 0 ? -10 : 10);
          }
        }}
      >
        {tableData.length > 0 ? (
          <table 
            ref={gridRef}
            className="border-collapse"
            style={{
              background: '#111111',
              color: '#e5e7eb',
            }}
          >
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      style={getCellStyle(rowIndex, colIndex)}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                      title={cell.formula || cell.value?.toString()}
                    >
                      {cell.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            No data to display
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedExcelViewer;