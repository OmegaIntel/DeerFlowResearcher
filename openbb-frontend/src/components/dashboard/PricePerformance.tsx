import React from 'react';
import { useStockData } from '../../hooks/useStockData';
import { usePricePerformance } from '../../hooks/usePricePerformance';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface PricePerformanceProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const PricePerformance: React.FC<PricePerformanceProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: stock } = useStockData(ticker);
  const { data: performanceData, isLoading } = usePricePerformance(ticker);
  const { addWidgetContext } = useCopilot();

  const downloadCSV = () => {
    if (!performanceData) return;

    const csvContent = [
      ['Period', 'Return (%)'],
      ['1 Day', performanceData.performance['1D']?.toFixed(2) || 'N/A'],
      ['5 Days', performanceData.performance['5D']?.toFixed(2) || 'N/A'],
      ['1 Week', performanceData.performance['1W']?.toFixed(2) || 'N/A'],
      ['1 Month', performanceData.performance['1M']?.toFixed(2) || 'N/A'],
      ['3 Months', performanceData.performance['3M']?.toFixed(2) || 'N/A'],
      ['6 Months', performanceData.performance['6M']?.toFixed(2) || 'N/A'],
      ['Year to Date', performanceData.performance['YTD']?.toFixed(2) || 'N/A'],
      ['1 Year', performanceData.performance['1Y']?.toFixed(2) || 'N/A'],
      ['3 Years', performanceData.performance['3Y']?.toFixed(2) || 'N/A'],
      ['5 Years', performanceData.performance['5Y']?.toFixed(2) || 'N/A'],
      ['', ''],
      ['Current Price', `$${performanceData.currentPrice?.toFixed(2) || 'N/A'}`],
      ['52 Week High', `$${performanceData.yearHigh?.toFixed(2) || 'N/A'}`],
      ['52 Week Low', `$${performanceData.yearLow?.toFixed(2) || 'N/A'}`],
      ['Volume', performanceData.volume?.toLocaleString() || 'N/A'],
      ['Average Volume', performanceData.averageVolume?.toLocaleString() || 'N/A'],
      ['P/E Ratio', performanceData.peRatio?.toFixed(2) || 'N/A'],
      ['Market Cap', performanceData.marketCap ? `$${(performanceData.marketCap / 1e9).toFixed(2)}B` : 'N/A'],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${ticker}_price_performance.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading || !performanceData) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/2 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="h-96 bg-openbb-bg-hover rounded"></div>
        </div>
      </div>
    );
  }

  const performanceRows = [
    { label: '1 Day', value: performanceData.performance['1D'], key: '1D' },
    { label: '5 Days', value: performanceData.performance['5D'], key: '5D' },
    { label: '1 Week', value: performanceData.performance['1W'], key: '1W' },
    { label: '1 Month', value: performanceData.performance['1M'], key: '1M' },
    { label: '3 Months', value: performanceData.performance['3M'], key: '3M' },
    { label: '6 Months', value: performanceData.performance['6M'], key: '6M' },
    { label: 'YTD', value: performanceData.performance['YTD'], key: 'YTD' },
    { label: '1 Year', value: performanceData.performance['1Y'], key: '1Y' },
    { label: '3 Years', value: performanceData.performance['3Y'], key: '3Y' },
    { label: '5 Years', value: performanceData.performance['5Y'], key: '5Y' },
  ];

  const getColorClass = (value: number | undefined) => {
    if (value === undefined || value === null) return 'text-gray-500';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Price Performance"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(WidgetType.PRICE_PERFORMANCE, performanceData, ticker, 'Price Performance')}
        onDownload={downloadCSV}
        onSettings={onSettings}
        onRemove={onRemove}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">

        {/* Price Information */}
        <div className="mb-4 p-3 bg-openbb-bg-hover rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-openbb-text-muted">Current Price</div>
              <div className="text-lg font-semibold text-openbb-text-primary">
                ${performanceData.currentPrice?.toFixed(2) || '-'}
              </div>
            </div>
            <div>
              <div className="text-xs text-openbb-text-muted">Volume</div>
              <div className="text-sm font-medium text-openbb-text-primary">
                {performanceData.volume?.toLocaleString() || '-'}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Table */}
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-openbb-text-primary mb-2">Returns</h4>
          <div className="bg-openbb-bg-hover rounded-lg overflow-hidden">
            <table className="w-full">
              <tbody>
                {performanceRows.map((row, index) => (
                  <tr key={row.key} className={index % 2 === 0 ? 'bg-openbb-bg-hover' : 'bg-openbb-bg-widget'}>
                    <td className="px-3 py-2 text-xs text-openbb-text-secondary">{row.label}</td>
                    <td className={`px-3 py-2 text-xs font-medium text-right ${getColorClass(row.value)}`}>
                      {row.value !== undefined && row.value !== null 
                        ? `${row.value >= 0 ? '+' : ''}${row.value.toFixed(2)}%` 
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="space-y-3">
          <div className="p-3 bg-openbb-bg-hover rounded-lg">
            <div className="text-xs text-openbb-text-muted mb-1">52-Week Range</div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-openbb-text-primary">
                ${performanceData.yearLow?.toFixed(2) || '-'}
              </span>
              <div className="flex-1 mx-3 h-1 bg-openbb-bg-widget rounded-full relative">
                {performanceData.yearLow && performanceData.yearHigh && performanceData.currentPrice && (
                  <div 
                    className="absolute h-1 bg-openbb-accent rounded-full"
                    style={{
                      width: `${((performanceData.currentPrice - performanceData.yearLow) / (performanceData.yearHigh - performanceData.yearLow)) * 100}%`
                    }}
                  />
                )}
              </div>
              <span className="text-xs font-medium text-openbb-text-primary">
                ${performanceData.yearHigh?.toFixed(2) || '-'}
              </span>
            </div>
          </div>

          {performanceData.peRatio && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2 bg-openbb-bg-hover rounded-lg">
                <div className="text-xs text-openbb-text-muted">P/E Ratio</div>
                <div className="text-sm font-medium text-openbb-text-primary">
                  {performanceData.peRatio.toFixed(2)}
                </div>
              </div>
              {performanceData.marketCap && (
                <div className="p-2 bg-openbb-bg-hover rounded-lg">
                  <div className="text-xs text-openbb-text-muted">Market Cap</div>
                  <div className="text-sm font-medium text-openbb-text-primary">
                    ${(performanceData.marketCap / 1e9).toFixed(2)}B
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PricePerformance;