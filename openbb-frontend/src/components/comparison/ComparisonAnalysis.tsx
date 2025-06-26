import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, RefreshCw, Download, Settings, Maximize2, Filter } from 'lucide-react';
import classNames from 'classnames';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';
import { api } from '../../services/api';

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
  evToRevenue: number;
  evToEbitda: number;
  dividendYield: number | string;
  marketCap?: number;
  currentPrice?: number;
  provider?: string;
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
  const [selectedTickers, setSelectedTickers] = useState<string[]>(() => {
    const defaultTickers = ['AAPL', 'GOOGL', 'MSFT', 'AMZN'];
    if (ticker && !defaultTickers.includes(ticker)) {
      return [ticker, ...defaultTickers.slice(0, 3)];
    }
    return defaultTickers;
  });
  const viewType = 'FY Q1 Q2 Q3 Q4 TTM';
  const [newTicker, setNewTicker] = useState<string>('');
  const [companyData, setCompanyData] = useState<CompanyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addWidgetContext } = useCopilot();

  // Fetch real-time data for selected tickers
  useEffect(() => {
    const fetchMetrics = async () => {
      if (selectedTickers.length === 0) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching metrics for:', selectedTickers);
        const data = await api.get(`/equity/fundamental/key-metrics?symbols=${selectedTickers.join(',')}`);
        console.log('Received data:', data);
        
        if (data && Array.isArray(data)) {
          const formattedData = data.map((item: any) => ({
            symbol: item.symbol,
            name: item.name || item.symbol,
            peRatio: item.peRatio || 0,
            psRatio: item.psRatio || 0,
            pbRatio: item.pbRatio || 0,
            evToRevenue: item.evToRevenue || 0,
            evToEbitda: item.evToEbitda || 0,
            dividendYield: item.dividendYield || '-',
            marketCap: item.marketCap,
            currentPrice: item.currentPrice,
            provider: item.provider
          }));
          setCompanyData(formattedData);
        } else {
          setError('Failed to fetch data - invalid response format');
        }
      } catch (err) {
        setError('Failed to fetch comparison data');
        console.error('Error fetching metrics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedTickers]);

  // Add ticker to selected list when ticker prop changes
  useEffect(() => {
    if (ticker && !selectedTickers.includes(ticker)) {
      setSelectedTickers(prev => [ticker, ...prev.filter(t => t !== ticker)]);
    }
  }, [ticker]);

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
            <h2 className="text-lg  font-semibold text-openbb-text-primary">Comparison Analysis</h2>
            <span className="bg-openbb-blue text-white px-2 py-0.5 rounded text-xs  flex items-center gap-1">
              {ticker} <ChevronDown size={12} />
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCompany()}
                placeholder="Add ticker..."
                className="px-2 py-1 bg-openbb-bg-widget border border-openbb-border rounded text-xs text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent  w-24"
              />
              <button 
                onClick={handleAddCompany}
                className="flex items-center gap-1 text-xs  text-openbb-text-secondary hover:text-openbb-accent transition-colors"
              >
                <Plus size={14} />
                Add Ticker
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Type Selector */}
            <div className="flex items-center gap-1 bg-openbb-bg-hover px-2 py-1 rounded">
              <span className="text-xs  text-openbb-text-secondary">
                {viewType}
              </span>
              <ChevronDown size={12} className="text-openbb-text-muted" />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => addWidgetContext(
                  WidgetType.CUSTOM,
                  {
                    selectedCompanies: companyData,
                    metrics: ['peRatio', 'psRatio', 'pbRatio', 'evToRevenue', 'evToEbitda', 'dividendYield']
                  },
                  ticker,
                  'Company Comparison Analysis'
                )}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Add comparison data to Copilot"
              >
                <Plus size={14} />
              </button>
              <button 
                onClick={() => {
                  // Force refresh by clearing and re-setting tickers
                  const current = [...selectedTickers];
                  setSelectedTickers([]);
                  setTimeout(() => setSelectedTickers(current), 0);
                }}
                className={classNames(
                  "p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors",
                  isLoading && "animate-spin"
                )}
              >
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
          <h3 className="text-sm  text-openbb-text-secondary">
            Valuation Multiples Financial Ratios
          </h3>
        </div>

        {/* Table */}
        <div className="overflow-auto" style={{ height: 'calc(100vh - 250px)' }}>
          {error && (
            <div className="p-4 text-center text-openbb-danger">
              {error}
            </div>
          )}
          {isLoading && (
            <div className="p-8 text-center text-openbb-text-secondary">
              Loading comparison data...
            </div>
          )}
          {!isLoading && !error && companyData.length === 0 && (
            <div className="p-8 text-center text-openbb-text-secondary">
              No data available. Add tickers to compare.
            </div>
          )}
          {!isLoading && !error && companyData.length > 0 && (
            <table className="w-full text-xs ">
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
                    EV/Revenue
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
                    getColorForValue(company.evToRevenue, 'evToRevenue', companyData.map(c => c.evToRevenue))
                  )}>
                    {formatValue(company.evToRevenue)}
                  </td>
                  <td className={classNames(
                    "text-center py-2.5 px-4 border-r border-openbb-border/30",
                    getColorForValue(company.evToEbitda, 'evToEbitda', companyData.map(c => c.evToEbitda))
                  )}>
                    {formatValue(company.evToEbitda)}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparisonAnalysis;