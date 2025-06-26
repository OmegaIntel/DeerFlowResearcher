import React from 'react';
import { useKeyMetricsRealTime } from '../../hooks/useRealTimeData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import { downloadTableAsCSV } from '../../utils/csvExport';

interface KeyMetricsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const KeyMetrics: React.FC<KeyMetricsProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: metrics, isLoading, error } = useKeyMetricsRealTime(ticker);
  const { addWidgetContext } = useCopilot();

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/2 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
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

  if (error || !metrics || metrics.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <WidgetHeaderWithTicker
          title="Key Metrics"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(
            WidgetType.KEY_METRICS,
            metrics,
            ticker,
            'Key Metrics'
          )}
          onDownload={() => downloadTableAsCSV(
            metrics,
            [
              { label: 'Metric', value: 'label' },
              { label: 'Value', value: 'value' }
            ],
            `${ticker}_key_metrics.csv`
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="widget-content flex-1 overflow-auto">
          <p className="text-xs  text-openbb-text-muted">No metrics data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Key Metrics"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(
          WidgetType.KEY_METRICS,
          metrics,
          ticker,
          'Key Metrics'
        )}
        onDownload={() => downloadTableAsCSV(
          metrics,
          [
            { label: 'Metric', value: 'label' },
            { label: 'Value', value: 'value' }
          ],
          `${ticker}_key_metrics.csv`
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">

        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center py-1.5 border-b border-openbb-border last:border-b-0">
              <span className="text-xs  text-openbb-text-muted">{metric.label}</span>
              <span className="text-xs  font-semibold text-openbb-text-primary">{metric.value}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 text-left">
          <span className="text-xs  text-openbb-text-muted">Current Currency: USD</span>
        </div>
      </div>
    </div>
  );
};

export default KeyMetrics;