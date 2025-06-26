import React from 'react';
import { useInsiderTrading } from '../../hooks/useOpenBBData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import { safeDate, safeDateString } from '../../utils/dateUtils';

interface InsiderTradingProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const InsiderTrading: React.FC<InsiderTradingProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: insiderData, isLoading, error } = useInsiderTrading(ticker);
  const { addWidgetContext } = useCopilot();

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-openbb-bg-hover rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !insiderData || insiderData.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <WidgetHeaderWithTicker
          title="Insider Trading"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => {
            addWidgetContext(WidgetType.INSIDER_TRADING, insiderData || [], ticker, 'Insider Trading');
          }}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <p className="text-xs  text-openbb-text-muted">
          No insider trading data available
        </p>
      </div>
    );
  }

  // Process and sort transactions by date
  const recentTransactions = insiderData
    .sort((a: any, b: any) => {
      const dateA = safeDate(a.filing_date);
      const dateB = safeDate(b.filing_date);
      
      // Handle null dates
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // null dates go to end
      if (!dateB) return -1;
      
      // Sort descending (newest first)
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
      <WidgetHeaderWithTicker
        title="Insider Trading"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => {
          addWidgetContext(WidgetType.INSIDER_TRADING, insiderData, ticker, 'Insider Trading');
        }}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-openbb-border scrollbar-track-openbb-bg-primary">
        {recentTransactions.map((transaction: any, idx: number) => {
          const isBuy = transaction.transaction_type?.toLowerCase().includes('buy') || 
                       transaction.transaction_type?.toLowerCase().includes('acquisition');
          
          return (
            <div
              key={idx}
              className="bg-openbb-bg-primary rounded p-3 border border-openbb-border hover:border-openbb-accent transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="text-xs  font-semibold text-openbb-text-primary">
                    {transaction.insider_name || 'Unknown'}
                  </div>
                  <div className="text-xs  text-openbb-text-secondary">
                    {transaction.insider_title || 'N/A'}
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${isBuy ? 'text-green-500' : 'text-red-500'}`}>
                  {isBuy ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span className="text-xs  font-semibold">
                    {isBuy ? 'BUY' : 'SELL'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs ">
                <div>
                  <span className="text-openbb-text-secondary">Shares: </span>
                  <span className="text-openbb-text-primary">
                    {transaction.shares?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-openbb-text-secondary">Price: </span>
                  <span className="text-openbb-text-primary">
                    ${transaction.price_per_share?.toFixed(2) || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-openbb-text-secondary">Value: </span>
                  <span className="text-openbb-text-primary font-semibold">
                    ${((transaction.shares || 0) * (transaction.price_per_share || 0)).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-openbb-text-secondary">Date: </span>
                  <span className="text-openbb-text-primary">
                    {safeDateString(transaction.filing_date)}
                  </span>
                </div>
              </div>

              {transaction.remarks && (
                <div className="mt-2 text-xs  text-openbb-text-muted">
                  {transaction.remarks}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-openbb-border">
        <div className="grid grid-cols-2 gap-4 text-xs ">
          <div>
            <span className="text-openbb-text-secondary">Total Transactions: </span>
            <span className="text-openbb-text-primary">{insiderData.length}</span>
          </div>
          <div>
            <span className="text-openbb-text-secondary">Net Activity: </span>
            <span className={`font-semibold ${
              insiderData.filter((t: any) => 
                t.transaction_type?.toLowerCase().includes('buy') || 
                t.transaction_type?.toLowerCase().includes('acquisition')
              ).length > 
              insiderData.filter((t: any) => 
                t.transaction_type?.toLowerCase().includes('sell') || 
                t.transaction_type?.toLowerCase().includes('disposition')
              ).length
                ? 'text-green-500' 
                : 'text-red-500'
            }`}>
              {insiderData.filter((t: any) => 
                t.transaction_type?.toLowerCase().includes('buy') || 
                t.transaction_type?.toLowerCase().includes('acquisition')
              ).length > 
              insiderData.filter((t: any) => 
                t.transaction_type?.toLowerCase().includes('sell') || 
                t.transaction_type?.toLowerCase().includes('disposition')
              ).length
                ? 'Net Buying' 
                : 'Net Selling'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsiderTrading;