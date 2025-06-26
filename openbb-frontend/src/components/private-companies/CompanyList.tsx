import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { PrivateCompany } from '../../services/privateCompanyService';

interface CompanyListProps {
  companies: PrivateCompany[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
  };
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  onCompanyClick: (companyId: string) => void;
}

const CompanyList: React.FC<CompanyListProps> = ({
  companies,
  pagination,
  isLoading,
  onPageChange,
  onLimitChange,
  onCompanyClick,
}) => {
  const [sortColumn, setSortColumn] = useState<keyof PrivateCompany>('company_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: string } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidth = useRef<number>(0);

  const handleSort = (column: keyof PrivateCompany) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedCompanies = [...companies].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Column configuration with default widths
  const columns: { key: keyof PrivateCompany; label: string; minWidth: number; defaultWidth: number }[] = [
    { key: 'company_name', label: 'Company Name', minWidth: 150, defaultWidth: 250 },
    { key: 'website_domain', label: 'Website', minWidth: 100, defaultWidth: 180 },
    { key: 'industry_primary', label: 'Industry', minWidth: 100, defaultWidth: 180 },
    { key: 'status', label: 'Status', minWidth: 80, defaultWidth: 100 },
    { key: 'founded_year', label: 'Founded', minWidth: 70, defaultWidth: 90 },
    { key: 'city', label: 'City', minWidth: 80, defaultWidth: 120 },
    { key: 'state', label: 'State', minWidth: 50, defaultWidth: 70 },
    { key: 'employees', label: 'Employees', minWidth: 80, defaultWidth: 100 },
    { key: 'loan_amount', label: 'PPP Loan', minWidth: 80, defaultWidth: 120 },
    { key: 'source_type', label: 'Source', minWidth: 80, defaultWidth: 100 },
  ];

  // Initialize column widths
  useEffect(() => {
    const initialWidths: { [key: string]: number } = {};
    columns.forEach(col => {
      initialWidths[col.key] = columnWidths[col.key] || col.defaultWidth;
    });
    setColumnWidths(initialWidths);
  }, []);

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnKey);
    resizeStartX.current = e.pageX;
    resizeStartWidth.current = columnWidths[columnKey] || 150;
  };

  useEffect(() => {
    if (!resizingColumn) {
      document.body.classList.remove('resize-active');
      return;
    }

    document.body.classList.add('resize-active');

    const handleMouseMove = (e: MouseEvent) => {
      const column = columns.find(col => col.key === resizingColumn);
      if (!column) return;

      const deltaX = e.pageX - resizeStartX.current;
      const newWidth = Math.max(column.minWidth, resizeStartWidth.current + deltaX);
      
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn]: newWidth
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.body.classList.remove('resize-active');
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resize-active');
    };
  }, [resizingColumn, columns]);

  // Truncate text helper
  const truncateText = (text: string | number | null | undefined, maxWidth: number): string => {
    if (text === null || text === undefined) return '-';
    const str = text.toString();
    // Rough calculation: ~8px per character
    const maxChars = Math.floor((maxWidth - 32) / 8); // 32px for padding
    return str.length > maxChars ? str.substring(0, maxChars - 3) + '...' : str;
  };

  // Check if text is truncated
  const isTruncated = (text: string | number | null | undefined, maxWidth: number): boolean => {
    if (text === null || text === undefined) return false;
    const str = text.toString();
    const maxChars = Math.floor((maxWidth - 32) / 8);
    return str.length > maxChars;
  };

  if (isLoading && companies.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-openbb-accent mx-auto mb-4"></div>
          <p className="text-openbb-text-muted">Loading companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        <table ref={tableRef} className="w-full text-sm table-fixed">
          <thead className="sticky top-0 z-10 bg-openbb-bg-secondary">
            <tr className="border-b border-openbb-border">
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  className="text-left py-3 px-4 text-openbb-text-secondary font-medium relative group"
                  style={{ width: `${columnWidths[column.key]}px`, minWidth: `${column.minWidth}px` }}
                >
                  <div 
                    className="flex items-center gap-1 cursor-pointer"
                    onClick={() => handleSort(column.key)}
                  >
                    <span className="truncate">{column.label}</span>
                    {sortColumn === column.key && (
                      <span className="text-openbb-accent flex-shrink-0">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                  {/* Resize handle */}
                  {index < columns.length - 1 && (
                    <div
                      className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-openbb-accent/50 group-hover:bg-openbb-border"
                      onMouseDown={(e) => handleResizeStart(e, column.key)}
                    />
                  )}
                </th>
              ))}
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium" style={{ width: '60px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedCompanies.map((company, index) => (
              <tr
                key={company.company_id}
                className={`border-b border-openbb-border hover:bg-openbb-bg-hover transition-colors cursor-pointer ${
                  index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/20'
                }`}
                onClick={() => onCompanyClick(company.company_id)}
              >
                {/* Company Name */}
                <td 
                  className="py-2 px-4 text-openbb-text-primary font-medium h-10 relative"
                  onMouseEnter={() => setHoveredCell({ row: index, col: 'company_name' })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div className="truncate">
                    {truncateText(company.company_name, columnWidths.company_name)}
                  </div>
                  {hoveredCell?.row === index && hoveredCell?.col === 'company_name' && 
                   isTruncated(company.company_name, columnWidths.company_name) && (
                    <div className="absolute z-20 bg-openbb-bg-primary border border-openbb-border rounded px-2 py-1 text-sm shadow-lg -top-8 left-0 whitespace-nowrap">
                      {company.company_name}
                    </div>
                  )}
                </td>
                
                {/* Website */}
                <td className="py-2 px-4 text-openbb-text-primary h-10">
                  <div className="truncate">
                    {company.website_domain ? (
                      <a
                        href={company.website_url || `https://${company.website_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-openbb-accent hover:underline inline-flex items-center gap-1 max-w-full"
                        onClick={(e) => e.stopPropagation()}
                        title={company.website_domain}
                      >
                        <span className="truncate">{truncateText(company.website_domain, columnWidths.website_domain - 20)}</span>
                        <ExternalLink size={12} className="flex-shrink-0" />
                      </a>
                    ) : (
                      '-'
                    )}
                  </div>
                </td>
                
                {/* Industry */}
                <td 
                  className="py-2 px-4 text-openbb-text-primary h-10 relative"
                  onMouseEnter={() => setHoveredCell({ row: index, col: 'industry_primary' })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div className="truncate">
                    {truncateText(company.industry_primary, columnWidths.industry_primary)}
                  </div>
                  {hoveredCell?.row === index && hoveredCell?.col === 'industry_primary' && 
                   isTruncated(company.industry_primary, columnWidths.industry_primary) && (
                    <div className="absolute z-20 bg-openbb-bg-primary border border-openbb-border rounded px-2 py-1 text-sm shadow-lg -top-8 left-0 whitespace-nowrap">
                      {company.industry_primary}
                    </div>
                  )}
                </td>
                
                {/* Status */}
                <td className="py-2 px-4 h-10">
                  <div className="truncate">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                      company.status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : company.status === 'acquired'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-openbb-bg-hover text-openbb-text-muted'
                    }`}>
                      {company.status || '-'}
                    </span>
                  </div>
                </td>
                
                {/* Founded Year */}
                <td className="py-2 px-4 text-openbb-text-primary h-10">
                  <div className="truncate">
                    {company.founded_year || '-'}
                  </div>
                </td>
                
                {/* City */}
                <td 
                  className="py-2 px-4 text-openbb-text-primary h-10 relative"
                  onMouseEnter={() => setHoveredCell({ row: index, col: 'city' })}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  <div className="truncate">
                    {truncateText(company.city, columnWidths.city)}
                  </div>
                  {hoveredCell?.row === index && hoveredCell?.col === 'city' && 
                   isTruncated(company.city, columnWidths.city) && (
                    <div className="absolute z-20 bg-openbb-bg-primary border border-openbb-border rounded px-2 py-1 text-sm shadow-lg -top-8 left-0 whitespace-nowrap">
                      {company.city}
                    </div>
                  )}
                </td>
                
                {/* State */}
                <td className="py-2 px-4 text-openbb-text-primary h-10">
                  <div className="truncate">
                    {company.state || '-'}
                  </div>
                </td>
                
                {/* Employees */}
                <td className="py-2 px-4 text-openbb-text-primary h-10">
                  <div className="truncate">
                    {company.employees || company.employee_count || '-'}
                  </div>
                </td>
                
                {/* PPP Loan */}
                <td className="py-2 px-4 text-openbb-text-primary h-10">
                  <div className="truncate">
                    {company.loan_amount && company.loan_amount > 0 ? (
                      <span className="text-purple-400 font-medium">
                        ${company.loan_amount.toLocaleString()}
                      </span>
                    ) : (
                      '-'
                    )}
                  </div>
                </td>
                
                {/* Source Type */}
                <td className="py-2 px-4 text-openbb-text-primary h-10">
                  <div className="truncate">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                      company.source_type === 'PPP_LOAN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-openbb-bg-hover text-openbb-text-muted'
                    }`}>
                      {company.source_type || 'Non-PPP'}
                    </span>
                  </div>
                </td>
                {/* Actions */}
                <td className="py-2 px-4 h-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompanyClick(company.company_id);
                    }}
                    className="text-openbb-accent hover:text-openbb-text-primary"
                    title="View details"
                  >
                    →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-openbb-border bg-openbb-bg-secondary p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-openbb-text-muted">
              Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total_count)} of {pagination.total_count.toLocaleString()} companies
            </span>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-openbb-text-muted">Per page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="px-2 py-1 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            
            <span className="px-4 py-2 text-sm text-openbb-text-primary">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.total_pages}
              className="p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyList;