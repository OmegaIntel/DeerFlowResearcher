import React from 'react';
import { useShareStatisticsRealTime } from '../../hooks/useRealTimeData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';
import { downloadTableAsCSV } from '../../utils/csvExport';

interface ShareStatisticsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const ShareStatistics: React.FC<ShareStatisticsProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: statistics, isLoading, error } = useShareStatisticsRealTime(ticker);
  const { addWidgetContext } = useCopilot();

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
          onAdd={() => addWidgetContext(
            WidgetType.SHARE_STATISTICS,
            statistics,
            ticker,
            'Share Statistics'
          )}
          onDownload={() => {
            const data = [
              { label: 'Free float', value: `${statistics.freeFloat}%` },
              { label: 'Float shares', value: statistics.floatShares },
              { label: 'Outstanding shares', value: statistics.outstandingShares },
              { label: 'Short % of Float', value: statistics.shortPercentOfFloat || 'N/A' },
              { label: 'Institutional Ownership', value: statistics.institutionalOwnership || 'N/A' },
              { label: 'Insider Ownership', value: statistics.insiderOwnership || 'N/A' },
            ];
            downloadTableAsCSV(
              data,
              [
                { label: 'Metric', value: 'label' },
                { label: 'Value', value: 'value' }
              ],
              `${ticker}_share_statistics.csv`
            );
          }}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="widget-content flex-1 overflow-auto">
          <p className="text-xs  text-openbb-text-muted">No share statistics available</p>
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
        onAdd={() => addWidgetContext(
          WidgetType.SHARE_STATISTICS,
          statistics,
          ticker,
          'Share Statistics'
        )}
        onDownload={() => {
          const data = [
            { label: 'Free float', value: `${statistics.freeFloat}%` },
            { label: 'Float shares', value: statistics.floatShares },
            { label: 'Outstanding shares', value: statistics.outstandingShares },
            { label: 'Short % of Float', value: statistics.shortPercentOfFloat || 'N/A' },
            { label: 'Institutional Ownership', value: statistics.institutionalOwnership || 'N/A' },
            { label: 'Insider Ownership', value: statistics.insiderOwnership || 'N/A' },
          ];
          downloadTableAsCSV(
            data,
            [
              { label: 'Metric', value: 'label' },
              { label: 'Value', value: 'value' }
            ],
            `${ticker}_share_statistics.csv`
          );
        }}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">

        <div className="space-y-2">
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs  text-openbb-text-muted">Free float</span>
            <span className="text-xs  font-semibold text-openbb-text-primary">{statistics.freeFloat}%</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs  text-openbb-text-muted">Float shares</span>
            <span className="text-xs  font-semibold text-openbb-text-primary">{statistics.floatShares}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs  text-openbb-text-muted">Outstanding shares</span>
            <span className="text-xs  font-semibold text-openbb-text-primary">{statistics.outstandingShares}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs  text-openbb-text-muted">Short % of Float</span>
            <span className="text-xs  font-semibold text-openbb-text-primary">{statistics.shortPercentOfFloat || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs  text-openbb-text-muted">Institutional Ownership</span>
            <span className="text-xs  font-semibold text-openbb-text-primary">{statistics.institutionalOwnership || 'N/A'}</span>
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-openbb-border">
            <span className="text-xs  text-openbb-text-muted">Insider Ownership</span>
            <span className="text-xs  font-semibold text-openbb-text-primary">{statistics.insiderOwnership || 'N/A'}</span>
          </div>
        </div>

        <div className="mt-3 flex justify-between items-center text-xs ">
          <span className="text-openbb-text-muted">Data Provider</span>
          <span className="text-openbb-text-muted">{statistics.provider || 'OpenBB'}</span>
        </div>
      </div>
    </div>
  );
};

export default ShareStatistics;