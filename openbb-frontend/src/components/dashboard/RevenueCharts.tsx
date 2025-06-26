import React, { useState } from 'react';
import { BarChart2, Calendar, Filter } from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import { mockRevenueByGeography, mockRevenueByBusiness } from '../../services/mockData';
import { chartColors, defaultChartOptions } from '../../utils/chartConfig';
import classNames from 'classnames';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

interface RevenueChartsProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

type ChartView = 'FY' | 'QTR' | 'TTM';
type ChartType = 'geography' | 'business';

const RevenueCharts: React.FC<RevenueChartsProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const [chartView, setChartView] = useState<ChartView>('FY');
  const [chartType, setChartType] = useState<ChartType>('geography');
  const { addWidgetContext } = useCopilot();

  // Process geography data
  const geographyData = {
    labels: mockRevenueByGeography.map(item => item.date.split('-')[0]),
    datasets: Object.keys(mockRevenueByGeography[0].segments).map((segment, index) => ({
      label: segment,
      data: mockRevenueByGeography.map(item => item.segments[segment]),
      borderColor: Object.values(chartColors)[index],
      backgroundColor: Object.values(chartColors)[index] + '20',
      tension: 0.1,
    })),
  };

  // Process business line data
  const businessData = {
    labels: mockRevenueByBusiness.map(item => item.date.split('-')[0]),
    datasets: Object.keys(mockRevenueByBusiness[0].segments).map((segment, index) => ({
      label: segment,
      data: mockRevenueByBusiness.map(item => item.segments[segment]),
      backgroundColor: Object.values(chartColors)[index + 6],
    })),
  };

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <WidgetHeaderWithTicker
          title="Revenue Analysis"
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(
            WidgetType.REVENUE_CHARTS,
            {
              chartType,
              chartView,
              geographyData,
              businessData
            },
            ticker,
            'Revenue Analysis'
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        
        <div className="flex items-center gap-4">
          {/* Chart View Selector */}
          <div className="flex items-center gap-1 bg-openbb-bg-secondary p-0.5 rounded">
            {(['FY', 'QTR', 'TTM'] as ChartView[]).map((view) => (
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

          {/* Chart Type Selector */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setChartType('geography')}
              className={classNames(
                'flex items-center gap-1 px-2 py-1 rounded text-xs  transition-colors',
                chartType === 'geography'
                  ? 'bg-openbb-blue text-white'
                  : 'bg-openbb-bg-secondary text-openbb-text-secondary hover:text-openbb-text-primary'
              )}
            >
              <BarChart2 size={14} />
              Geography
            </button>
            <button
              onClick={() => setChartType('business')}
              className={classNames(
                'flex items-center gap-1 px-2 py-1 rounded text-xs  transition-colors',
                chartType === 'business'
                  ? 'bg-openbb-blue text-white'
                  : 'bg-openbb-bg-secondary text-openbb-text-secondary hover:text-openbb-text-primary'
              )}
            >
              <BarChart2 size={14} />
              Business Line
            </button>
          </div>
        </div>
      </div>

      <div className="widget-content flex-1 overflow-hidden min-h-[250px] bg-openbb-bg-primary p-2">
        {chartType === 'geography' ? (
          <Line data={geographyData} options={defaultChartOptions} />
        ) : (
          <Bar 
            data={businessData} 
            options={{
              ...defaultChartOptions,
              scales: {
                ...defaultChartOptions.scales,
                x: {
                  ...defaultChartOptions.scales.x,
                  stacked: true,
                },
                y: {
                  ...defaultChartOptions.scales.y,
                  stacked: true,
                },
              },
            }} 
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-openbb-text-muted ">
        <div className="flex items-center gap-1">
          <Calendar size={12} />
          <span>Last Updated: {new Date().toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Filter size={12} />
          <span>Showing: {chartType === 'geography' ? 'Revenue Per Geography' : 'Revenue Per Business Line'}</span>
        </div>
      </div>
    </div>
  );
};

export default RevenueCharts;