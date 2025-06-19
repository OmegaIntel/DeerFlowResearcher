import React from 'react';
import { useShareStatisticsRealTime } from '../../hooks/useRealTimeData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';

interface ShareStatisticsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

const ShareStatistics: React.FC<ShareStatisticsProps> = ({ ticker, onTickerChange }) => {
  const { data: statistics, isLoading, error } = useShareStatisticsRealTime(ticker);

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/2 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 bg-openbb-bg-hover rounded w-1/3"></div>
                <div className="h-3 bg-openbb-bg-hover rounded w-1/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <WidgetHeaderWithTicker
          title="Share Statistics"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onRefresh={() => window.location.reload()}
          onAdd={() => console.log('Add to dashboard')}
          onExpand={() => console.log('Expand')}
          onMore={() => console.log('More options')}
        />
        <div className="widget-content flex-1 overflow-auto">
          <p className="text-xs font-mono text-openbb-text-muted">No share statistics available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Share Statistics"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={() => console.log('Refresh')}
        onAdd={() => console.log('Add to dashboard')}
        onExpand={() => console.log('Expand')}
        onMore={() => console.log('More options')}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs font-mono text-openbb-text-muted">Free float</span>
            <span className="text-xs font-mono font-semibold text-openbb-text-primary">{statistics.freeFloat}%</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs font-mono text-openbb-text-muted">Float shares</span>
            <span className="text-xs font-mono font-semibold text-openbb-text-primary">{statistics.floatShares}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs font-mono text-openbb-text-muted">Outstanding shares</span>
            <span className="text-xs font-mono font-semibold text-openbb-text-primary">{statistics.outstandingShares}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs font-mono text-openbb-text-muted">Short % of Float</span>
            <span className="text-xs font-mono font-semibold text-openbb-text-primary">{statistics.shortPercentOfFloat || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs font-mono text-openbb-text-muted">Institutional Ownership</span>
            <span className="text-xs font-mono font-semibold text-openbb-text-primary">{statistics.institutionalOwnership || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs font-mono text-openbb-text-muted">Insider Ownership</span>
            <span className="text-xs font-mono font-semibold text-openbb-text-primary">{statistics.insiderOwnership || 'N/A'}</span>
          </div>
        </div>

        <div className="mt-3 flex justify-between items-center text-xs font-mono">
          <span className="text-openbb-text-muted">Data Provider</span>
          <span className="text-openbb-text-muted">{statistics.provider || 'OpenBB'}</span>
        </div>
      </div>
    </div>
  );
};

export default ShareStatistics;