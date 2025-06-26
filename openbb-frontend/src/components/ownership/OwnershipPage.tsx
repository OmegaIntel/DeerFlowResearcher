import React, { useState } from 'react';
import { Building2, Users, RefreshCw, Download, Settings, Maximize2, Filter, Calendar, Search, Plus } from 'lucide-react';
import classNames from 'classnames';
import { useInstitutionalOwnership, useStockOwnership } from '../../hooks/useOwnershipData';
import { apiCache } from '../../services/cacheService';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface OwnershipPageProps {
  ticker: string;
}

const OwnershipPage: React.FC<OwnershipPageProps> = ({ ticker }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: institutionalData, loading: instLoading, error: instError } = useInstitutionalOwnership(ticker);
  const { data: stockOwnershipData, loading: stockLoading, error: stockError } = useStockOwnership(ticker);
  const { addWidgetContext } = useCopilot();

  const selectedDate = new Date().getFullYear().toString();
  const selectedQuarter = 'Q1 Q2 Q3 Q4';

  const getChangeColor = (value: number | string, isPositive?: boolean): string => {
    if (typeof value === 'string' && value.includes('-')) return 'text-openbb-danger';
    if (typeof value === 'number' && value < 0) return 'text-openbb-danger';
    if (isPositive === false && value !== 0 && value !== '0') return 'text-openbb-danger';
    if (isPositive === true || (typeof value === 'number' && value > 0)) return 'text-openbb-success';
    return 'text-openbb-text-primary';
  };

  const handleRefresh = async () => {
    // Clear cache for this ticker
    apiCache.clearByPattern(`.*${ticker}.*`);
    // Reload the page to trigger fresh data fetch
    window.location.reload();
  };

  const handleDownload = (dataType: 'institutional' | 'stock') => {
    const data = dataType === 'institutional' ? institutionalData : stockOwnershipData;
    const filename = `${ticker}_${dataType}_ownership_${new Date().toISOString().split('T')[0]}.csv`;
    
    // Convert to CSV
    if (data.length > 0) {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => Object.values(row).join(','));
      const csv = [headers, ...rows].join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Filter stock ownership data based on search
  const filteredStockData = stockOwnershipData.filter(row =>
    row.investorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full bg-openbb-bg-primary overflow-y-auto">
      <div className="px-4 py-4 space-y-4">
        {/* Institutional Ownership Table */}
        <div className="bg-openbb-bg-widget rounded border border-openbb-border">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-openbb-accent" />
              <h2 className="text-lg font-semibold text-openbb-text-primary">Institutional Ownership</h2>
              <span className="bg-openbb-blue text-white px-2 py-0.5 rounded text-xs">
                {ticker} → {selectedDate}
              </span>
              <span className="text-xs text-openbb-text-muted">
                {selectedQuarter}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button
                onClick={() => addWidgetContext(
                  WidgetType.INSTITUTIONAL_OWNERSHIP,
                  institutionalData,
                  ticker,
                  'Institutional Ownership'
                )}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Add institutional ownership data to Copilot"
              >
                <Plus size={14} />
              </button>
              <button 
                onClick={handleRefresh}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={14} />
              </button>
              <button 
                onClick={() => handleDownload('institutional')}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Download CSV"
              >
                <Download size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Settings size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: '400px' }}>
            {instLoading ? (
              <div className="p-8 text-center text-openbb-text-muted">
                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                Loading institutional ownership data...
              </div>
            ) : instError ? (
              <div className="p-8 text-center text-openbb-danger">
                {instError}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-openbb-bg-secondary border-b border-openbb-border">
                    <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Index</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Current Quarter</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Past Quarter</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Change</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Percentage Change</th>
                  </tr>
                </thead>
                <tbody>
                  {institutionalData.map((row, index) => (
                    <tr
                      key={row.metric}
                      className={classNames(
                        'hover:bg-openbb-bg-hover transition-colors border-b border-openbb-border/30',
                        index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/10'
                      )}
                    >
                      <td className="py-2.5 px-4 text-openbb-text-primary">{row.metric}</td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.currentQuarter}</td>
                      <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.pastQuarter}</td>
                      <td className={classNames(
                        "text-center py-2.5 px-4",
                        getChangeColor(row.change, row.isPositive)
                      )}>
                        {row.change}
                      </td>
                      <td className={classNames(
                        "text-center py-2.5 px-4",
                        getChangeColor(row.percentageChange, row.isPositive)
                      )}>
                        {row.percentageChange}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-openbb-border bg-openbb-bg-secondary flex justify-between items-center">
            <p className="text-xxs text-openbb-text-muted">
              Current Currency: USD
            </p>
            <p className="text-xxs text-openbb-text-muted">
              Cache Status: {apiCache.getStats().validEntries} entries
            </p>
          </div>
        </div>

        {/* Stock Ownership Table */}
        <div className="bg-openbb-bg-widget rounded border border-openbb-border">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
            <div className="flex items-center gap-3">
              <Users size={16} className="text-openbb-accent" />
              <h2 className="text-lg font-semibold text-openbb-text-primary">Stock Ownership</h2>
              <span className="bg-openbb-blue text-white px-2 py-0.5 rounded text-xs flex items-center gap-1">
                {ticker} → {new Date().toLocaleDateString()}
                <Calendar size={12} />
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-openbb-text-muted" />
                <input
                  type="text"
                  placeholder="Search investors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-3 py-1 bg-openbb-bg-secondary border border-openbb-border rounded text-xs text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent w-48"
                />
              </div>
              
              <button
                onClick={() => addWidgetContext(
                  WidgetType.INSIDER_TRADING,
                  stockOwnershipData,
                  ticker,
                  'Stock Ownership'
                )}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Add stock ownership data to Copilot"
              >
                <Plus size={14} />
              </button>
              <button 
                onClick={handleRefresh}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={14} />
              </button>
              <button 
                onClick={() => handleDownload('stock')}
                className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors"
                title="Download CSV"
              >
                <Download size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Filter size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Settings size={14} />
              </button>
              <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
                <Maximize2 size={14} />
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto" style={{ maxHeight: '500px' }}>
            {stockLoading ? (
              <div className="p-8 text-center text-openbb-text-muted">
                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                Loading stock ownership data...
              </div>
            ) : stockError ? (
              <div className="p-8 text-center text-openbb-danger">
                {stockError}
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-openbb-bg-secondary border-b border-openbb-border">
                    <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium">Investor Name</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Investment Discretion</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Shares Held</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Change in Shares</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Percentage Change [%]</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Market Value</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Portfolio Weight [%]</th>
                    <th className="text-center py-3 px-4 text-openbb-text-secondary font-medium">Prev Portfolio Weight</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStockData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-openbb-text-muted">
                        {searchTerm ? 'No investors found matching your search' : 'No stock ownership data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredStockData.map((row, index) => (
                      <tr
                        key={`${row.investorName}-${index}`}
                        className={classNames(
                          'hover:bg-openbb-bg-hover transition-colors border-b border-openbb-border/30',
                          index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/10'
                        )}
                      >
                        <td className="py-2.5 px-4 text-openbb-text-primary">{row.investorName}</td>
                        <td className="text-center py-2.5 px-4">
                          <span className={classNames(
                            "px-2 py-0.5 rounded text-xxs",
                            row.investmentDiscretion === 'SOLE' ? 'bg-openbb-blue/20 text-openbb-blue' :
                            row.investmentDiscretion === 'DFND' ? 'bg-openbb-warning/20 text-openbb-warning' :
                            row.investmentDiscretion === 'SHRD' ? 'bg-openbb-success/20 text-openbb-success' :
                            'bg-openbb-accent/20 text-openbb-accent'
                          )}>
                            {row.investmentDiscretion}
                          </span>
                        </td>
                        <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.sharesHeld}</td>
                        <td className={classNames(
                          "text-center py-2.5 px-4",
                          getChangeColor(row.changeInShares)
                        )}>
                          {row.changeInShares}
                        </td>
                        <td className={classNames(
                          "text-center py-2.5 px-4",
                          getChangeColor(row.percentageChange)
                        )}>
                          {row.percentageChange.toFixed(2)}
                        </td>
                        <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.marketValue}</td>
                        <td className="text-center py-2.5 px-4 text-openbb-text-primary">{row.portfolioWeight.toFixed(2)}</td>
                        <td className="text-center py-2.5 px-4 text-openbb-text-muted">{row.prevPortfolioWeight?.toFixed(2) || row.portfolioWeight.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-openbb-border bg-openbb-bg-secondary flex justify-between items-center">
            <p className="text-xxs text-openbb-text-muted">
              Showing {filteredStockData.length} of {stockOwnershipData.length} investors
            </p>
            <p className="text-xxs text-openbb-text-muted">
              Data Source: {stockOwnershipData.length > 0 ? 'Live API' : 'Mock Data'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnershipPage;