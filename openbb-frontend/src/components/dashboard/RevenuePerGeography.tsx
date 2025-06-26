import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { useRevenueGeographyRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import classNames from 'classnames';
import { BarChart3, Table } from 'lucide-react';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface RevenuePerGeographyProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

type ChartView = 'FY' | 'QTR';
type DisplayMode = 'chart' | 'table';

const RevenuePerGeography: React.FC<RevenuePerGeographyProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const [chartView, setChartView] = useState<ChartView>('FY');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('chart');
  const { data: revenueData, isLoading, error } = useRevenueGeographyRealTime(ticker);
  const { addWidgetContext } = useCopilot();

  // Process real-time data into chart format
  const processGeographyData = () => {
    if (!revenueData || revenueData.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    // Extract years and segment names
    const years = revenueData.map(item => {
      const year = new Date(item.date).getFullYear();
      return `FY ${year}`;
    }).reverse();

    // Get all unique segment names
    const segmentNames = new Set<string>();
    revenueData.forEach(item => {
      Object.keys(item.segments).forEach(segment => segmentNames.add(segment));
    });

    // Define colors for segments
    const segmentColors: { [key: string]: string } = {
      'Americas': '#1E90FF',
      'Europe': '#FF8C00',
      'China': '#32CD32',
      'Greater China': '#32CD32',
      'Japan': '#FFD700',
      'Asia Pacific': '#FF1493',
      'Rest of Asia Pacific': '#FF1493',
      'Other': '#9370DB',
    };

    // Create datasets for each segment
    const datasets = Array.from(segmentNames).map((segment, index) => {
      const data = revenueData.map(item => {
        const value = item.segments[segment] || 0;
        return value / 1e9; // Convert to billions
      }).reverse();

      // Find matching color or use a default
      let color = segmentColors[segment];
      if (!color) {
        // Default colors if segment name doesn't match
        const defaultColors = ['#1E90FF', '#FF8C00', '#32CD32', '#FFD700', '#FF1493', '#9370DB'];
        color = defaultColors[index % defaultColors.length];
      }

      return {
        label: segment,
        data: data,
        backgroundColor: color,
      };
    });

    return {
      labels: years,
      datasets: datasets,
    };
  };

  const geographyData = processGeographyData();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
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
        },
      },
      y: {
        stacked: true,
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
            return value + ' B';
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
        position: 'bottom' as const,
        labels: {
          color: '#CCCCCC',
          font: {
            family: 'monospace',
            size: 10,
          },
          boxWidth: 12,
          padding: 8,
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
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 animate-pulse">
        <div className="h-5 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="h-80 bg-openbb-bg-hover rounded"></div>
      </div>
    );
  }

  if (error || !revenueData || revenueData.length === 0) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4">
        <WidgetHeaderWithTicker
          title="Revenue Per Geography"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(WidgetType.REVENUE_GEOGRAPHY, revenueData, ticker, 'Revenue Per Geography')}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <p className="text-xs  text-openbb-text-muted">No geographic revenue data available</p>
      </div>
    );
  }

  // Format value as billions
  const formatValue = (value: number) => {
    return `$${(value / 1e9).toFixed(2)}B`;
  };

  // Calculate percentage
  const calculatePercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
  };

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <WidgetHeaderWithTicker
          title="Revenue Per Geography"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(WidgetType.REVENUE_GEOGRAPHY, revenueData, ticker, 'Revenue Per Geography')}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        
        <div className="flex items-center gap-2">
          {/* View toggle (Chart/Table) */}
          <div className="flex items-center gap-1 bg-openbb-bg-secondary p-0.5 rounded">
            <button
              onClick={() => setDisplayMode('chart')}
              className={classNames(
                'p-1.5 rounded transition-colors',
                displayMode === 'chart'
                  ? 'bg-openbb-accent text-openbb-bg-primary'
                  : 'text-openbb-text-secondary hover:text-openbb-text-primary'
              )}
              title="Chart View"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDisplayMode('table')}
              className={classNames(
                'p-1.5 rounded transition-colors',
                displayMode === 'table'
                  ? 'bg-openbb-accent text-openbb-bg-primary'
                  : 'text-openbb-text-secondary hover:text-openbb-text-primary'
              )}
              title="Table View"
            >
              <Table className="w-3.5 h-3.5" />
            </button>
          </div>
          
          {/* Period toggle (FY/QTR) - only show in chart mode */}
          {displayMode === 'chart' && (
            <div className="flex items-center gap-1 bg-openbb-bg-secondary p-0.5 rounded">
              {(['FY', 'QTR'] as ChartView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  className={classNames(
                    'px-2 py-1 text-xs  rounded transition-colors',
                    chartView === view
                      ? 'bg-openbb-accent text-openbb-bg-primary'
                      : 'text-openbb-text-secondary hover:text-openbb-text-primary'
                  )}
                >
                  {view}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="widget-content flex-1 overflow-hidden min-h-[200px]">
        {displayMode === 'chart' ? (
          <Bar data={geographyData} options={options} />
        ) : (
          <div className="h-full overflow-auto">
            <table className="w-full text-xs ">
              <thead className="sticky top-0 bg-openbb-bg-widget border-b border-openbb-border">
                <tr>
                  <th className="text-left p-2 text-openbb-text-muted">Region</th>
                  {revenueData && revenueData.slice(0, 5).reverse().map((item, index) => (
                    <th key={index} className="text-right p-2 text-openbb-text-muted">
                      FY{new Date(item.date).getFullYear()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revenueData && (() => {
                  // Get all unique segments
                  const allSegments = new Set<string>();
                  revenueData.forEach(item => {
                    Object.keys(item.segments).forEach(segment => allSegments.add(segment));
                  });
                  
                  return Array.from(allSegments).map((segment, segmentIndex) => {
                    const segmentData = revenueData.slice(0, 5).reverse();
                    const yearTotals = segmentData.map(item => 
                      Object.values(item.segments).reduce((sum, val) => sum + val, 0)
                    );
                    
                    return (
                      <tr key={segmentIndex} className="border-b border-openbb-border hover:bg-openbb-bg-hover">
                        <td className="p-2 text-openbb-text-primary">{segment}</td>
                        {segmentData.map((item, index) => {
                          const value = item.segments[segment] || 0;
                          const percentage = calculatePercentage(value, yearTotals[index]);
                          return (
                            <td key={index} className="text-right p-2">
                              <div className="text-openbb-text-primary">{formatValue(value)}</div>
                              <div className="text-openbb-text-muted text-xxs">{percentage}</div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  });
                })()}
                {/* Total row */}
                {revenueData && revenueData.length > 0 && (
                  <tr className="border-t-2 border-openbb-border font-semibold">
                    <td className="p-2 text-openbb-text-primary">Total</td>
                    {revenueData.slice(0, 5).reverse().map((item, index) => {
                      const total = Object.values(item.segments).reduce((sum, val) => sum + val, 0);
                      return (
                        <td key={index} className="text-right p-2 text-openbb-text-primary">
                          {formatValue(total)}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenuePerGeography;