import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useValuationMultiplesRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import classNames from 'classnames';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface ValuationMultiplesProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const ValuationMultiples: React.FC<ValuationMultiplesProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const { data: metricsData, isLoading, error } = useValuationMultiplesRealTime(ticker);
  const { addWidgetContext } = useCopilot();
  
  const valuationData = useMemo(() => {
    if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
      // Return placeholder data if no real data available
      return {
        labels: ['No Data'],
        datasets: [
          { label: 'P/E Ratio', data: [], borderColor: '#FFD700', backgroundColor: '#FFD700' },
          { label: 'P/S Ratio', data: [], borderColor: '#00D9FF', backgroundColor: '#00D9FF' },
          { label: 'P/B Ratio', data: [], borderColor: '#32CD32', backgroundColor: '#32CD32' },
          { label: 'EV/Sales', data: [], borderColor: '#FF6347', backgroundColor: '#FF6347' },
          { label: 'EV/EBITDA', data: [], borderColor: '#9370DB', backgroundColor: '#9370DB' },
        ],
      };
    }
    
    // Process real data
    const sortedData = [...metricsData].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    const labels = sortedData.map(item => {
      const date = new Date(item.date);
      return `FY ${date.getFullYear()}`;
    });
    
    const datasets = [
      {
        label: 'P/E Ratio',
        data: sortedData.map(item => item.peRatio || null),
        borderColor: '#FFD700',
        backgroundColor: '#FFD700',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'P/S Ratio',
        data: sortedData.map(item => item.psRatio || null),
        borderColor: '#00D9FF',
        backgroundColor: '#00D9FF',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'P/B Ratio',
        data: sortedData.map(item => item.pbRatio || null),
        borderColor: '#32CD32',
        backgroundColor: '#32CD32',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'EV/Sales',
        data: sortedData.map(item => item.evSales || null),
        borderColor: '#FF6347',
        backgroundColor: '#FF6347',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: 'EV/EBITDA',
        data: sortedData.map(item => item.evEbitda || null),
        borderColor: '#9370DB',
        backgroundColor: '#9370DB',
        tension: 0.1,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ];
    
    return { labels, datasets };
  }, [metricsData]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
          color: '#333333',
        },
        ticks: {
          color: '#888888',
          font: {
            family: 'monospace',
            size: 10,
          },
          maxRotation: 45,
          minRotation: 45,
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
        },
        title: {
          display: false,
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          color: '#CCCCCC',
          font: {
            family: 'monospace',
            size: 10,
          },
          boxWidth: 12,
          padding: 8,
          usePointStyle: true,
        },
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
  };

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/3 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="h-80 bg-openbb-bg-hover rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !metricsData || metricsData.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <WidgetHeaderWithTicker
          title="Valuation Multiples"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(
            WidgetType.VALUATION_MULTIPLES,
            metricsData,
            ticker,
            'Valuation Multiples'
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="widget-content flex-1 overflow-auto">
          <p className="text-xs  text-openbb-text-muted">No valuation data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <WidgetHeaderWithTicker
          title="Valuation Multiples"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(
            WidgetType.VALUATION_MULTIPLES,
            metricsData,
            ticker,
            'Valuation Multiples'
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        
        <div className="flex items-center gap-1 bg-openbb-bg-secondary p-0.5 rounded">
          <button
            className={classNames(
              'px-2 py-1 text-xs  rounded transition-colors',
              'bg-openbb-accent text-openbb-bg-primary'
            )}
          >
            TTM
          </button>
        </div>
      </div>

      <div className="widget-content flex-1 overflow-auto">
        <div className="h-80">
          <Line data={valuationData} options={options} />
        </div>
      </div>
    </div>
  );
};

export default ValuationMultiples;