import React from 'react';
import { useInstitutionalOwnership } from '../../hooks/useOpenBBData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { Building2, TrendingUp, TrendingDown } from 'lucide-react';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import { safeDateString } from '../../utils/dateUtils';

interface InstitutionalOwnershipProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const InstitutionalOwnership: React.FC<InstitutionalOwnershipProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: ownershipData, isLoading, error } = useInstitutionalOwnership(ticker);
  const { addWidgetContext } = useCopilot();

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-openbb-bg-hover rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !ownershipData || ownershipData.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <WidgetHeaderWithTicker
          title="Institutional Ownership"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(
            WidgetType.INSTITUTIONAL_OWNERSHIP,
            ownershipData,
            ticker,
            'Institutional Ownership'
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <p className="text-xs  text-openbb-text-muted">
          No institutional ownership data available
        </p>
      </div>
    );
  }

  // Sort by shares held
  const topHolders = ownershipData
    .sort((a: any, b: any) => (b.shares || 0) - (a.shares || 0))
    .slice(0, 10);

  // Calculate total institutional ownership
  const totalShares = ownershipData.reduce((sum: number, holder: any) => sum + (holder.shares || 0), 0);
  const totalValue = ownershipData.reduce((sum: number, holder: any) => sum + (holder.value || 0), 0);

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
      <WidgetHeaderWithTicker
        title="Institutional Ownership"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(
          WidgetType.INSTITUTIONAL_OWNERSHIP,
          ownershipData,
          ticker,
          'Institutional Ownership'
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-openbb-bg-primary rounded p-2 border border-openbb-border">
          <div className="text-xs  text-openbb-text-secondary">Total Holders</div>
          <div className="text-lg  font-semibold text-openbb-text-primary">
            {ownershipData.length}
          </div>
        </div>
        <div className="bg-openbb-bg-primary rounded p-2 border border-openbb-border">
          <div className="text-xs  text-openbb-text-secondary">Total Shares</div>
          <div className="text-lg  font-semibold text-openbb-text-primary">
            {(totalShares / 1e6).toFixed(1)}M
          </div>
        </div>
        <div className="bg-openbb-bg-primary rounded p-2 border border-openbb-border">
          <div className="text-xs  text-openbb-text-secondary">Total Value</div>
          <div className="text-lg  font-semibold text-openbb-text-primary">
            ${(totalValue / 1e9).toFixed(1)}B
          </div>
        </div>
      </div>

      {/* Top Holders */}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-openbb-border scrollbar-track-openbb-bg-primary">
        {topHolders.map((holder: any, idx: number) => {
          const percentChange = holder.change_in_shares_percentage || 0;
          const isIncrease = percentChange > 0;

          return (
            <div
              key={idx}
              className="bg-openbb-bg-primary rounded p-3 border border-openbb-border hover:border-openbb-accent transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2 flex-1">
                  <Building2 size={16} className="text-openbb-text-secondary mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs  font-semibold text-openbb-text-primary">
                      {holder.investor_name || 'Unknown Institution'}
                    </div>
                    <div className="text-xs  text-openbb-text-secondary">
                      {holder.shares?.toLocaleString() || 'N/A'} shares
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs  font-semibold text-openbb-text-primary">
                    ${(holder.value / 1e6).toFixed(1)}M
                  </div>
                  {percentChange !== 0 && (
                    <div className={`flex items-center justify-end gap-1 text-xs  ${
                      isIncrease ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {isIncrease ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{Math.abs(percentChange).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-2 text-xs ">
                <div>
                  <span className="text-openbb-text-secondary">% of Portfolio: </span>
                  <span className="text-openbb-text-primary">
                    {holder.portfolio_percentage?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
                <div>
                  <span className="text-openbb-text-secondary">% of Shares Out: </span>
                  <span className="text-openbb-text-primary">
                    {holder.ownership_percentage?.toFixed(2) || 'N/A'}%
                  </span>
                </div>
                <div>
                  <span className="text-openbb-text-secondary">Filed: </span>
                  <span className="text-openbb-text-primary">
                    {safeDateString(holder.date_reported)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InstitutionalOwnership;