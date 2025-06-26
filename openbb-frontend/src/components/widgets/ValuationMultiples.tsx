import React, { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { RefreshCw, Download, Settings, Maximize2, BarChart3, Table } from 'lucide-react';
import { useValuationMultiplesRealTime } from '../../hooks/useRealTimeDataExtended';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import classNames from 'classnames';
import { useCopilot } from '../../contexts/CopilotContext';
import { WidgetType } from '../../services/copilotService';
import { safeDate } from '../../utils/dateUtils';

interface ValuationMultiplesProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

type ViewType = 'chart' | 'table';
type PeriodType = 'FY' | 'QTR' | 'TTM';

const ValuationMultiples: React.FC<ValuationMultiplesProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const [viewType, setViewType] = useState<ViewType>('table');
  const [periodType, setPeriodType] = useState<PeriodType>('FY');
  
  // Fetch valuation data based on selected period
  const { data: metricsData = [], isLoading, error } = useValuationMultiplesRealTime(
    ticker,
    periodType === 'FY' ? 'annual' : periodType === 'QTR' ? 'quarter' : 'ttm'
  );

  const { addWidgetContext } = useCopilot();

  // Add dividend yield to the data
  const enhancedMetricsData = useMemo(() => {
    return metricsData.map(item => ({
      ...item,
      dividendYield: item.dividendYield || 0
    }));
  }, [metricsData]);

  // Process data for chart view
  const chartData = useMemo(() => {
    if (!enhancedMetricsData || enhancedMetricsData.length === 0) {
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
    
    const sortedData = [...enhancedMetricsData].sort((a, b) => {
      const dateA = safeDate(a.date);
      const dateB = safeDate(b.date);
      
      // Handle null dates
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1; // null dates go to end
      if (!dateB) return -1;
      
      return dateA.getTime() - dateB.getTime();
    });
    
    const labels = sortedData.map(item => {
      const date = safeDate(item.date);
      if (periodType === 'TTM') {
        return 'TTM';
      } else if (!date) {
        return 'N/A';
      } else if (periodType === 'QTR' && item.period) {
        return `${item.period} ${date.getFullYear()}`;
      } else {
        return `FY ${date.getFullYear()}`;
      }
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
  }, [enhancedMetricsData]);

  const chartOptions = {
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

  // Process data for table view
  const tableData = useMemo(() => {
    if (!enhancedMetricsData || enhancedMetricsData.length === 0) {
      return { years: [], metrics: {} };
    }

    const maxItems = periodType === 'TTM' ? 1 : (periodType === 'QTR' ? 8 : 5); // TTM: 1, QTR: 2 years (8 quarters), FY: 5 years
    const sortedData = [...enhancedMetricsData].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, maxItems);

    const years = sortedData.map(item => {
      const date = new Date(item.date);
      if (periodType === 'TTM') {
        return 'TTM';
      } else if (periodType === 'QTR' && item.period) {
        return `${item.period} ${date.getFullYear()}`;
      } else {
        return date.getFullYear().toString();
      }
    });

    const metrics = {
      'P/E Ratio': sortedData.map(item => item.peRatio || 0),
      'P/S Ratio': sortedData.map(item => item.psRatio || 0),
      'P/B Ratio': sortedData.map(item => item.pbRatio || 0),
      'EV/Sales Ratio': sortedData.map(item => item.evSales || 0),
      'EV/EBITDA': sortedData.map(item => item.evEbitda || 0),
      'Dividend Yield': sortedData.map(item => item.dividendYield || 0),
    };

    return { years, metrics };
  }, [enhancedMetricsData]);

  const formatValue = (metricName: string, value: number) => {
    if (value === 0 || value === null || value === undefined) return '-';
    
    if (metricName === 'Dividend Yield') {
      return `${value.toFixed(2)}%`;
    }
    
    return value.toFixed(2);
  };

  if (isLoading && !enhancedMetricsData.length) {
    return (
      <div className="h-full bg-openbb-bg-widget border border-openbb-border">
        <WidgetHeaderWithTicker
          title="Valuation Multiples"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => {
            const valuationData = {
              periodType,
              viewType,
              metricsData: enhancedMetricsData,
              chartData,
              tableData
            };
            addWidgetContext(WidgetType.VALUATION_MULTIPLES, valuationData, `Valuation Multiples - ${ticker}`);
          }}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="h-full bg-openbb-bg-widget border border-openbb-border flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
            <p className="text-openbb-text-muted  text-sm">Loading valuation data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-openbb-bg-widget border border-openbb-border flex flex-col">
      <WidgetHeaderWithTicker
        title="Valuation Multiples"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onAdd={() => {
          const valuationData = {
            periodType,
            viewType,
            metricsData: enhancedMetricsData,
            chartData,
            tableData
          };
          addWidgetContext(WidgetType.VALUATION_MULTIPLES, valuationData, `Valuation Multiples - ${ticker}`);
        }}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          {metricsData.length > 0 ? (
            <span className="text-xs text-openbb-accent  bg-openbb-bg-hover px-2 py-1 rounded">LIVE</span>
          ) : (
            <span className="text-xs text-yellow-500  bg-openbb-bg-hover px-2 py-1 rounded">DEMO</span>
          )}
          
          {/* Period selector */}
          <div className="flex items-center gap-1">
            {(['FY', 'QTR', 'TTM'] as PeriodType[]).map((period) => (
              <button
                key={period}
                onClick={() => setPeriodType(period)}
                className={classNames(
                  'px-2 py-1 text-xs  rounded transition-colors',
                  periodType === period
                    ? 'bg-openbb-accent text-openbb-bg-primary'
                    : 'text-openbb-text-secondary hover:text-openbb-text-primary hover:bg-openbb-bg-hover'
                )}
                // All periods are now implemented
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* View type toggle */}
          <div className="flex items-center gap-1 bg-openbb-bg-secondary p-0.5 rounded mr-2">
            <button
              onClick={() => setViewType('table')}
              className={classNames(
                'p-1.5 transition-colors rounded',
                viewType === 'table'
                  ? 'text-openbb-accent bg-openbb-bg-hover'
                  : 'text-openbb-text-muted hover:text-openbb-text-primary'
              )}
              title="Table view"
            >
              <Table size={14} />
            </button>
            <button
              onClick={() => setViewType('chart')}
              className={classNames(
                'p-1.5 transition-colors rounded',
                viewType === 'chart'
                  ? 'text-openbb-accent bg-openbb-bg-hover'
                  : 'text-openbb-text-muted hover:text-openbb-text-primary'
              )}
              title="Chart view"
            >
              <BarChart3 size={14} />
            </button>
          </div>
          
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <RefreshCw size={14} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Download size={14} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Settings size={14} />
          </button>
          <button className="p-1.5 text-openbb-text-muted hover:text-openbb-text-primary transition-colors">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Content based on view type */}
      {viewType === 'table' ? (
        <div className="overflow-auto flex-grow">
          <table className="w-full text-xs ">
            <thead>
              <tr className="border-b border-openbb-border bg-openbb-bg-secondary sticky top-0 z-10">
                <th className="text-left py-3 px-4 text-openbb-text-secondary font-medium sticky left-0 bg-openbb-bg-secondary border-r border-openbb-border">
                  Index
                </th>
                {tableData.years.map((year) => (
                  <th key={year} className="text-right py-3 px-4 text-openbb-text-secondary font-medium min-w-[100px]">
                    {year}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(tableData.metrics).map(([metricName, values], index) => (
                <tr
                  key={metricName}
                  className={classNames(
                    'hover:bg-openbb-bg-hover transition-colors',
                    index % 2 === 0 ? '' : 'bg-openbb-bg-secondary/20'
                  )}
                >
                  <td className="py-2.5 px-4 sticky left-0 bg-inherit border-r border-openbb-border text-openbb-text-primary">
                    {metricName}
                  </td>
                  {values.map((value, idx) => (
                    <td key={idx} className="text-right py-2.5 px-4 text-openbb-text-primary">
                      {formatValue(metricName, value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          
          {tableData.years.length === 0 && (
            <div className="text-center py-8 text-openbb-text-muted  text-sm">
              No valuation data available for {ticker}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-grow p-4">
          <div className="h-full min-h-[300px]">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-openbb-border bg-openbb-bg-secondary flex-shrink-0">
        <div className="p-3">
          <p className="text-xxs text-openbb-text-muted ">
            Valuation multiples from Financial Modeling Prep • Updated in real-time
          </p>
        </div>
      </div>
    </div>
  );
};

export default ValuationMultiples;