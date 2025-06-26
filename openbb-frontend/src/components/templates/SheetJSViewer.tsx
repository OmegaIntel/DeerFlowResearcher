import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { X, Download, FileSpreadsheet, ChevronDown } from 'lucide-react';

interface SheetJSViewerProps {
  fileContent: ArrayBuffer;
  filename: string;
  onClose: () => void;
}

interface CellData {
  value: any;
  formula?: string;
  row: number;
  col: number;
}

const SheetJSViewer: React.FC<SheetJSViewerProps> = ({ fileContent, filename, onClose }) => {
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [tableData, setTableData] = useState<any[][]>([]);
  const [formulas, setFormulas] = useState<Map<string, string>>(new Map());
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showFormulaBar, setShowFormulaBar] = useState(false);
  const [currentFormula, setCurrentFormula] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fileContent) {
      loadSpreadsheet();
    }
  }, [fileContent]);

  useEffect(() => {
    // Add keyboard event listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && selectedCell) {
        e.preventDefault();
        const cellKey = `${selectedCell.row}_${selectedCell.col}`;
        const formula = formulas.get(cellKey);
        if (formula) {
          setCurrentFormula(formula);
          setShowFormulaBar(true);
        }
      }
      
      if (e.ctrlKey && e.key === '[' && currentFormula) {
        e.preventDefault();
        // Find cell references in formula
        const cellRefs = currentFormula.match(/[A-Z]+\d+/g);
        if (cellRefs && cellRefs.length > 0) {
          // Navigate to first referenced cell
          const firstRef = cellRefs[0];
          const { r, c } = XLSX.utils.decode_cell(firstRef);
          navigateToCell(r, c);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCell, currentFormula, formulas]);

  const loadSpreadsheet = () => {
    try {
      console.log('Loading spreadsheet, file size:', fileContent.byteLength);
      
      // Parse Excel file with different options
      const wb = XLSX.read(fileContent, { 
        type: 'array', 
        cellFormula: true,
        cellStyles: true,
        cellNF: true,
        cellText: true,
        cellDates: true
      });
      
      console.log('Workbook loaded, sheets:', wb.SheetNames);
      
      setWorkbook(wb);
      setSheetNames(wb.SheetNames);
      
      // Load first sheet by default
      if (wb.SheetNames.length > 0) {
        setSelectedSheet(wb.SheetNames[0]);
        loadSheet(wb, wb.SheetNames[0]);
      } else {
        console.error('No sheets found in workbook');
        setTableData([['No sheets found in this Excel file']]);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading spreadsheet:', error);
      // Try alternative parsing method
      try {
        const data = new Uint8Array(fileContent);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Convert to table format
        const tableData = jsonData.map((row: any, index: number) => {
          if (index === 0) {
            return ['', ...Object.keys(row).map((_, i) => XLSX.utils.encode_col(i))];
          }
          return [index, ...Object.values(row)];
        });
        
        setTableData(tableData);
        setIsLoading(false);
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        setTableData([['Error: Unable to parse Excel file']]);
        setIsLoading(false);
      }
    }
  };

  const loadSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = wb.Sheets[sheetName];
      
      // Check if worksheet exists and has data
      if (!worksheet || !worksheet['!ref']) {
        console.warn('Empty worksheet:', sheetName);
        setTableData([['No data in this sheet']]);
        setFormulas(new Map());
        return;
      }
      
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      
      // Build data array and formula map
      const data: any[][] = [];
      const formulaMap = new Map<string, string>();
      
      // Add column headers
      const headers = [''];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        headers.push(XLSX.utils.encode_col(C));
      }
      data.push(headers);
      
      // Add data rows
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const row = [R + 1]; // Row number
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = worksheet[cellRef];
          
          if (cell) {
            // Handle different cell types
            let value = '';
            if (cell.v !== undefined) {
              value = cell.v;
            } else if (cell.w !== undefined) {
              value = cell.w;
            }
            
            row.push(value);
            
            if (cell.f) {
              formulaMap.set(`${R}_${C}`, '=' + cell.f);
            }
          } else {
            row.push('');
          }
        }
        data.push(row);
      }
      
      setTableData(data);
      setFormulas(formulaMap);
    } catch (error) {
      console.error('Error loading sheet:', error);
      setTableData([['Error loading sheet data']]);
      setFormulas(new Map());
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (workbook) {
      setSelectedSheet(sheetName);
      loadSheet(workbook, sheetName);
      setSelectedCell(null);
      setCurrentFormula('');
      setShowFormulaBar(false);
    }
  };

  const handleCellClick = (row: number, col: number) => {
    if (row === 0 || col === 0) return; // Ignore header clicks
    
    setSelectedCell({ row: row - 1, col: col - 1 });
    const cellKey = `${row - 1}_${col - 1}`;
    const formula = formulas.get(cellKey);
    
    if (formula) {
      setCurrentFormula(formula);
    } else {
      setCurrentFormula(tableData[row][col]?.toString() || '');
    }
  };

  const navigateToCell = (row: number, col: number) => {
    setSelectedCell({ row, col });
    
    // Scroll to cell if needed
    if (tableRef.current) {
      const table = tableRef.current.querySelector('table');
      if (table) {
        const targetCell = table.querySelector(`tr:nth-child(${row + 2}) td:nth-child(${col + 2})`);
        if (targetCell) {
          targetCell.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }
    }
  };

  const downloadAsXlsx = () => {
    try {
      if (!workbook) return;
      
      // Write the workbook to array buffer
      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Create blob and download
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
    const isSelected = selectedCell && selectedCell.row === row - 1 && selectedCell.col === col - 1;
    const hasFormula = formulas.has(`${row - 1}_${col - 1}`);
    
    const baseStyle: React.CSSProperties = {
      border: '1px solid #374151',
      padding: '8px',
      cursor: 'pointer'
    };
    
    if (row === 0 || col === 0) {
      return {
        ...baseStyle,
        background: '#1f2937',
        fontWeight: 600,
        cursor: 'default'
      };
    } else if (isSelected) {
      return {
        ...baseStyle,
        background: '#1e40af',
        color: 'white'
      };
    } else if (hasFormula) {
      return {
        ...baseStyle,
        background: '#1e293b'
      };
    }
    
    return {
      ...baseStyle,
      background: '#1a1a1a'
    };
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-[#1a1a1a] border-b border-gray-800">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">{filename}</h3>
          
          {/* Sheet Selector */}
          {sheetNames.length > 1 && (
            <div className="relative">
              <select
                value={selectedSheet}
                onChange={(e) => handleSheetChange(e.target.value)}
                className="bg-[#0a0a0a] text-white px-3 py-1 rounded border border-gray-700 focus:border-blue-500 focus:outline-none appearance-none pr-8"
              >
                {sheetNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={downloadAsXlsx}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Download size={20} />
            Download XLSX
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#222222] rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Formula Bar */}
      {(showFormulaBar || selectedCell) && (
        <div className="flex items-center gap-2 p-2 bg-[#1a1a1a] border-b border-gray-800">
          <div className="text-sm text-gray-400 min-w-[60px]">
            {selectedCell ? `${XLSX.utils.encode_col(selectedCell.col)}${selectedCell.row + 1}` : ''}
          </div>
          <input
            type="text"
            value={currentFormula}
            readOnly
            className="flex-1 bg-[#0a0a0a] text-white px-2 py-1 rounded border border-gray-700"
            placeholder="Cell value or formula"
          />
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="px-3 py-1 bg-[#151515] text-xs text-gray-500 border-b border-gray-800">
        F2: View Formula | Ctrl+[: Go to Linked Cell | Click cells to select
      </div>

      {/* Spreadsheet Container */}
      <div ref={tableRef} className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-white">Loading spreadsheet...</div>
          </div>
        ) : (
          <table className="w-full" style={{
            borderCollapse: 'collapse',
            background: '#111111',
            color: '#e5e7eb',
          }}>
            <tbody>
              {tableData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, colIndex) => (
                    <td
                      key={colIndex}
                      style={getCellStyle(rowIndex, colIndex)}
                      onClick={() => handleCellClick(rowIndex, colIndex)}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SheetJSViewer;