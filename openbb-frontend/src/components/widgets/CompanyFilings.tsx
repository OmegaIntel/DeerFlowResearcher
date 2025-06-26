import React from 'react';
import { RefreshCw, Download, Settings, Maximize2, ExternalLink } from 'lucide-react';
import { useSecFilingsRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface CompanyFilingsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const CompanyFilings: React.FC<CompanyFilingsProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: filingsData = [], isLoading, error } = useSecFilingsRealTime(ticker);
  const { addWidgetContext } = useCopilot();

  // Format date to match screenshot
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  // Format CIK with leading zeros
  const formatCIK = (cik: string) => {
    if (!cik) return '';
    // Ensure CIK is 10 digits with leading zeros
    return cik.padStart(10, '0');
  };

  if (isLoading && !filingsData.length) {
    return (
      <div className="h-full bg-openbb-bg-widget border border-openbb-border">
        <WidgetHeaderWithTicker
          title="Company Filings"
          ticker={ticker}
          onTickerChange={onTickerChange}
          onAdd={() => addWidgetContext(WidgetType.COMPANY_FILINGS, filingsData, ticker, 'Company Filings')}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="h-full bg-openbb-bg-widget border border-openbb-border flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
            <p className="text-openbb-text-muted  text-sm">Loading SEC filings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-openbb-bg-widget border border-openbb-border flex flex-col">
      <WidgetHeaderWithTicker
        title="Company Filings"
        ticker={ticker}
        onTickerChange={onTickerChange}
        onAdd={() => addWidgetContext(WidgetType.COMPANY_FILINGS, filingsData, ticker, 'Company Filings')}
      />
      
      <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {filingsData.length > 0 && filingsData[0].provider === 'fmp' ? (
            <span className="text-xs text-openbb-accent  bg-openbb-bg-hover px-2 py-1 rounded">LIVE</span>
          ) : (
            <span className="text-xs text-yellow-500  bg-openbb-bg-hover px-2 py-1 rounded">DEMO</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
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
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto flex-grow">
        <table className="w-full text-xs ">
          <thead>
            <tr className="border-b border-openbb-border bg-openbb-bg-secondary sticky top-0 z-10">
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium w-1/4">Date</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium w-1/4">CIK</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium w-1/4">Type</th>
              <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium w-1/4">Source</th>
            </tr>
          </thead>
          <tbody>
            {filingsData.map((filing, index) => (
              <tr
                key={index}
                className="hover:bg-openbb-bg-hover transition-colors border-b border-openbb-border/50"
              >
                <td className="py-3 px-4 text-openbb-text-primary">{formatDate(filing.date)}</td>
                <td className="py-3 px-4 text-openbb-text-primary">{formatCIK(filing.cik)}</td>
                <td className="py-3 px-4 text-openbb-text-primary">{filing.type}</td>
                <td className="py-3 px-4">
                  {filing.url ? (
                    <a
                      href={filing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-openbb-accent hover:underline inline-flex items-center gap-1"
                    >
                      Link
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-openbb-text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filingsData.length === 0 && !isLoading && (
          <div className="text-center py-8 text-openbb-text-muted  text-sm">
            No SEC filings available for {ticker}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="p-3">
          <p className="text-xxs text-openbb-text-muted ">
            SEC filings from EDGAR database • Updated in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompanyFilings;