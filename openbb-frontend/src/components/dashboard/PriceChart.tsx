import React from 'react';
import { Line } from 'react-chartjs-2';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';
import { useHistoricalData } from '../../hooks/useStockData';

interface PriceChartProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const PriceChart: React.FC<PriceChartProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { addWidgetContext } = useCopilot();
  const { data: historicalData, isLoading, error } = useHistoricalData(ticker, '1d');
  
  // Process historical data for chart
  const priceData = React.useMemo(() => {
    if (!historicalData || !historicalData.data || historicalData.data.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: 'Price',
          data: [],
          borderColor: '#00D9FF',
          backgroundColor: '#00D9FF20',
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: true,
        }],
      };
    }
    
    const data = historicalData.data.slice(-20); // Last 20 data points
    return {
      labels: data.map((d: any) => new Date(d.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })),
      datasets: [{
        label: 'Price',
        data: data.map((d: any) => d.close),
        borderColor: '#00D9FF',
        backgroundColor: '#00D9FF20',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
      }],
    };
  }, [historicalData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1A1A1A',
        titleColor: '#FFFFFF',
        bodyColor: '#CCCCCC',
        borderColor: '#333333',
        borderWidth: 1,
        titleFont: {
          family: 'monospace',
          size: 12,
        },
        bodyFont: {
          family: 'monospace',
          size: 11,
        },
        padding: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: '#333333',
          display: false,
        },
        ticks: {
          color: '#888888',
          font: {
            family: 'monospace',
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: '#333333',
        },
        ticks: {
          color: '#888888',
          font: {
            family: 'monospace',
            size: 10,
          },
          callback: function(value: any) {
            return '$' + value;
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/2 mb-4"></div>
        <div className="widget-content flex-1">
          <div className="h-full bg-openbb-bg-hover rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !priceData.labels.length) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <WidgetHeaderWithTicker
          title="Price Chart"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(WidgetType.PRICE_CHART, priceData, ticker, 'Price Chart')}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="widget-content flex-1 flex items-center justify-center">
          <p className="text-openbb-text-muted">No price data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Price Chart"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => addWidgetContext(WidgetType.PRICE_CHART, priceData, ticker, 'Price Chart')}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="widget-content flex-1 overflow-hidden min-h-[200px]">
        <Line data={priceData} options={options} />
      </div>
    </div>
  );
};

export default PriceChart;