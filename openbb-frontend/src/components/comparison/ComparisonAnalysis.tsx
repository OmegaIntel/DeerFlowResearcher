import React, { useState } from 'react';
import { Plus, X, ChevronDown, RefreshCw, Download, Settings, Maximize2, Filter } from 'lucide-react';
import classNames from 'classnames';

interface ComparisonAnalysisProps {
  ticker: string;
}

interface CompanyData {
  symbol: string;
  name: string;
  logo?: string;
  peRatio: number;
  psRatio: number;
  pbRatio: number;
  evSalesRatio: number;
  evEbitda: number;
  dividendYield: number | string;
}

const getCompanyColor = (symbol: string): string => {
  const colors = [
    'bg-blue-600', 'bg-green-600', 'bg-red-600', 'bg-purple-600',
    'bg-yellow-600', 'bg-pink-600', 'bg-indigo-600', 'bg-gray-600'
  ];
  const index = symbol.charCodeAt(0) % colors.length;
  return colors[index];
};

const ComparisonAnalysis: React.FC<ComparisonAnalysisProps> = ({ ticker }) => {
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['AAPL', 'LPL', 'SNE', 'PCIFY', 'SONO', 'MICS', 'WLDSW', 'KOSS', 'GPRO', 'SONY', 'UEIC', 'HEAR', 'VUZI', 'WLDS']);
  const viewType = 'FY Q1 Q2 Q3 Q4 TTM';
  const [newTicker, setNewTicker] = useState<string>('');

  const allCompanyData: CompanyData[] = [
    { symbol: 'AAPL', name: 'Apple Inc.', peRatio: 37.29, psRatio: 8.94, pbRatio: 61.37, evSalesRatio: 9.17, evEbitda: 26.62, dividendYield: 0.43 },
    { symbol: 'LPL', name: 'LG Display Co., Ltd.', peRatio: -1.68, psRatio: 0.16, pbRatio: 0.66, evSalesRatio: 0.63, evEbitda: 4.40, dividendYield: '-' },
    { symbol: 'SNE', name: 'Sony Group Corporation', peRatio: 19.95, psRatio: 1.76, pbRatio: 2.78, evSalesRatio: 1.85, evEbitda: 8.86, dividendYield: 0.50 },
    { symbol: 'PCIFY', name: 'Panasonic Holdings Corporation', peRatio: 7.34, psRatio: 0.38, pbRatio: 0.72, evSalesRatio: 0.44, evEbitda: 4.46, dividendYield: 2.32 },
    { symbol: 'SONO', name: 'Sonos, Inc.', peRatio: -39.25, psRatio: 0.99, pbRatio: 3.49, evSalesRatio: 0.92, evEbitda: 54.21, dividendYield: '-' },
    { symbol: 'MICS', name: 'The Singing Machine Company,', peRatio: -6.88, psRatio: 6.81, pbRatio: -18.88, evSalesRatio: 6.52, evEbitda: -6.96, dividendYield: '-' },
    { symbol: 'WLDSW', name: 'Wearable Devices Ltd.', peRatio: -0.36, psRatio: 5.44, pbRatio: 0.74, evSalesRatio: 1.60, evEbitda: -0.11, dividendYield: '-' },
    { symbol: 'KOSS', name: 'Koss Corporation', peRatio: -44.66, psRatio: 3.46, pbRatio: 1.36, evSalesRatio: 3.46, evEbitda: -25.24, dividendYield: '-' },
    { symbol: 'GPRO', name: 'GoPro, Inc.', peRatio: -0.39, psRatio: 0.21, pbRatio: 1.10, evSalesRatio: 0.23, evEbitda: -1.51, dividendYield: '-' },
    { symbol: 'SONY', name: 'Sony Group Corporation', peRatio: 19.95, psRatio: 1.76, pbRatio: 2.78, evSalesRatio: 1.85, evEbitda: 8.86, dividendYield: 0.50 },
    { symbol: 'UEIC', name: 'Universal Electronics Inc.', peRatio: -5.93, psRatio: 0.36, pbRatio: 0.93, evSalesRatio: 0.42, evEbitda: 15.74, dividendYield: '-' },
    { symbol: 'HEAR', name: 'Turtle Beach Corporation', peRatio: 21.42, psRatio: 0.93, pbRatio: 2.87, evSalesRatio: 0.89, evEbitda: 16.86, dividendYield: '-' },
    { symbol: 'VUZI', name: 'Vuzix Corporation', peRatio: -3.63, psRatio: 46.45, pbRatio: 0.01, evSalesRatio: 43.37, evEbitda: -3.59, dividendYield: '-' },
    { symbol: 'WLDS', name: 'Wearable Devices Ltd.', peRatio: -0.36, psRatio: 5.44, pbRatio: 0.74, evSalesRatio: 1.60, evEbitda: -0.11, dividendYield: '-' },
  ];

  const companyData = allCompanyData.filter(company => selectedTickers.includes(company.symbol));

  const handleRemoveCompany = (symbol: string) => {
    setSelectedTickers(prev => prev.filter(s => s !== symbol));
  };

  const handleAddCompany = () => {
    if (newTicker && !selectedTickers.includes(newTicker.toUpperCase())) {
      setSelectedTickers(prev => [...prev, newTicker.toUpperCase()]);
      setNewTicker('');
    }
  };

  const getColorForValue = (value: number, metric: string, allValues: number[]): string => {
    if (value < 0) return 'text-openbb-danger';
    
    const validValues = allValues.filter(v => v > 0);
    if (validValues.length === 0) return 'text-openbb-text-primary';
    
    const max = Math.max(...validValues);
    const min = Math.min(...validValues);
    
    if (metric === 'dividendYield') {
      if (value === max && value > 0) return 'text-openbb-success font-semibold';
    } else {
      // For P/E, P/S, P/B ratios, lower is generally better
      if (value === min && value > 0) return 'text-openbb-success font-semibold';
      if (value === max && value > 0) return 'text-openbb-warning';
    }
    
    return 'text-openbb-text-primary';
  };

  const formatValue = (value: number | string): string => {
    if (typeof value === 'string') return value;
    return value.toFixed(2);
  };

  return (
    <div className="h-full bg-openbb-bg-primary">
      <div className="h-full bg-openbb-bg-widget border border-openbb-border">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-mono font-semibold text-openbb-text-primary">Comparison Analysis</h2>
            <span className="bg-openbb-blue text-white px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1">
              {ticker} <ChevronDown size={12} />
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCompany()}
                placeholder="Add ticker..."
                className="px-2 py-1 bg-openbb-bg-widget border border-openbb-border rounded text-xs text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent font-mono w-24"
              />
              <button 
                onClick={handleAddCompany}
                className="flex items-center gap-1 text-xs font-mono text-openbb-text-secondary hover:text-openbb-accent transition-colors"
              >
                <Plus size={14} />
                Add Ticker
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Type Selector */}
            <div className="flex items-center gap-1 bg-openbb-bg-hover px-2 py-1 rounded">
              <span className="text-xs font-mono text-openbb-text-secondary">
                {viewType}
              </span>
              <ChevronDown size={12} className="text-openbb-text-muted" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 ml-4">
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <RefreshCw size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Download size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Settings size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Filter size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Maximize2 size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Subtitle */}
        <div className="px-3 py-2 border-b border-openbb-border bg-openbb-bg-secondary/50">
          <h3 className="text-sm font-mono text-openbb-text-secondary">
            Valuation Multiples Financial Ratios
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-auto" style={{ height: 'calc(100vh - 250px)' }}>
          <table className="w-full text-xs font-mono">
            <thead className="sticky top-0 z-10">
              <tr className="bg-openbb-bg-secondary border-b border-openbb-border">
                <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium sticky left-0 bg-openbb-bg-secondary z-20 border-r border-openbb-border min-w-[250px]">
                  Name
                </th>
                <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium min-w-[120px] border-r border-openbb-border/50">
                  P/E Ratio
                </th>
                <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium min-w-[120px] border-r border-openbb-border/50">
                  P/S Ratio
                </th>
                <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium min-w-[120px] border-r border-openbb-border/50">
                  P/B Ratio
                </th>
                <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium min-w-[120px] border-r border-openbb-border/50">
                  EV/S Ratio
                </th>
                <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium min-w-[120px] border-r border-openbb-border/50">
                  EV/EBITDA
                </th>
                <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium min-w-[120px]">
                  Dividend Yield
                </th>
              </tr>
            </thead>
            <tbody>
              {companyData.map((company) => (
                <tr
                  key={company.symbol}
                  className={classNames(
                    'hover:bg-openbb-bg-hover/50 transition-colors border-b border-openbb-border/30',
                    company.symbol === ticker ? 'bg-openbb-accent/10' : ''
                  )}
                >
                  <td className="py-2.5 px-4 sticky left-0 bg-inherit z-10 border-r border-openbb-border">
                    <div className="flex items-center gap-2">
                      <div className="relative group">
                        <div className={classNames(
                          "w-6 h-6 rounded flex items-center justify-center text-white font-bold",
                          getCompanyColor(company.symbol),
                          "text-xxs"
                        )}>
                          {company.symbol.slice(0, 2)}
                        </div>
                        <button
                          onClick={() => handleRemoveCompany(company.symbol)}
                          className="absolute inset-0 w-6 h-6 bg-openbb-danger/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                      <div className="flex flex-col">
                        <span className={classNames(
                          "font-semibold",
                          company.symbol === ticker ? "text-openbb-accent" : "text-openbb-text-primary"
                        )}>
                          {company.symbol}
                        </span>
                        <span className="text-xxs text-openbb-text-muted truncate max-w-[200px]">{company.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4 border-r border-openbb-border/30",
                    getColorForValue(company.peRatio, 'peRatio', companyData.map(c => c.peRatio))
                  )}>
                    {formatValue(company.peRatio)}
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4 border-r border-openbb-border/30",
                    getColorForValue(company.psRatio, 'psRatio', companyData.map(c => c.psRatio))
                  )}>
                    {formatValue(company.psRatio)}
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4 border-r border-openbb-border/30",
                    getColorForValue(company.pbRatio, 'pbRatio', companyData.map(c => c.pbRatio))
                  )}>
                    {formatValue(company.pbRatio)}
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4 border-r border-openbb-border/30",
                    getColorForValue(company.evSalesRatio, 'evSalesRatio', companyData.map(c => c.evSalesRatio))
                  )}>
                    {formatValue(company.evSalesRatio)}
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4 border-r border-openbb-border/30",
                    getColorForValue(company.evEbitda, 'evEbitda', companyData.map(c => c.evEbitda))
                  )}>
                    {formatValue(company.evEbitda)}
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4",
                    typeof company.dividendYield === 'number' ? 'text-openbb-text-primary' : 'text-openbb-text-muted'
                  )}>
                    {typeof company.dividendYield === 'number' 
                      ? `${formatValue(company.dividendYield)} %`
                      : company.dividendYield
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ComparisonAnalysis;