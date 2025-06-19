import React from 'react';
import { Line } from 'react-chartjs-2';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';

interface PriceChartProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

const PriceChart: React.FC<PriceChartProps> = ({ ticker, onTickerChange }) => {
  // Mock price data
  const priceData = {
    labels: ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'],
    datasets: [
      {
        label: 'Price',
        data: [195.5, 196.2, 197.1, 196.8, 197.5, 198.2, 197.8, 197.65],
        borderColor: '#00D9FF',
        backgroundColor: '#00D9FF20',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
      },
    ],
  };

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

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Price Chart"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={() => console.log('Refresh')}
        onAdd={() => console.log('Add to dashboard')}
        onExpand={() => console.log('Expand')}
        onMore={() => console.log('More options')}
      />
      
      <div className="widget-content flex-1 overflow-hidden min-h-[200px]">
        <Line data={priceData} options={options} />
      </div>
    </div>
  );
};

export default PriceChart;