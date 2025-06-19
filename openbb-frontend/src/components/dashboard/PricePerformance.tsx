import React from 'react';
import { useStockData } from '../../hooks/useStockData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';

interface PricePerformanceProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

const PricePerformance: React.FC<PricePerformanceProps> = ({ ticker, onTickerChange }) => {
  const { data: stock, isLoading } = useStockData(ticker);

  if (isLoading || !stock) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/2 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="h-28 bg-openbb-bg-hover rounded"></div>
        </div>
      </div>
    );
  }

  const performanceData = [
    { period: '1D', value: stock.changePercent, color: stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600' },
    { period: '1W', value: -2.5, color: 'text-red-600' },
    { period: '1M', value: 5.8, color: 'text-green-600' },
    { period: '3M', value: 12.3, color: 'text-green-600' },
    { period: '6M', value: -8.2, color: 'text-red-600' },
    { period: '1Y', value: 16.7, color: 'text-green-600' },
  ];

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Price Performance"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={() => console.log('Refresh')}
        onAdd={() => console.log('Add to dashboard')}
        onExpand={() => console.log('Expand')}
        onMore={() => console.log('More options')}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mb-2">
          <div className="text-xs font-mono text-openbb-text-muted">Outstanding Shares</div>
          <div className="text-xs font-mono font-semibold text-openbb-text-primary">
            {(stock.marketCap / stock.price / 1000000000).toFixed(3)} B
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {performanceData.map((item) => (
            <div key={item.period} className="text-center p-1.5 bg-openbb-bg-hover rounded-lg">
              <div className="text-xs font-mono text-openbb-text-muted">{item.period}</div>
              <div className={`text-xs font-mono font-semibold ${item.color}`}>
                {item.value >= 0 ? '+' : ''}{item.value.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 p-2 bg-openbb-bg-hover rounded-lg">
          <div className="text-xs font-mono text-openbb-accent">
            52-Week Range: ${stock.yearLow.toFixed(2)} - ${stock.yearHigh.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricePerformance;