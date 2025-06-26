import React, { useState } from 'react';
import { BarChart2 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';
import { useCopilot } from '../../contexts/CopilotContext';
import type { WidgetType } from '../../services/copilotService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface SegmentedRevenueProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const SegmentedRevenue: React.FC<SegmentedRevenueProps> = ({ ticker, onTickerChange, onSettings, onRemove }) => {
  const [viewType, setViewType] = useState<'geography' | 'business'>('geography');
  const [chartType, setChartType] = useState<'FY' | 'QTR'>('FY');
  const { addWidgetContext } = useCopilot();

  // Mock data for Revenue Per Geography
  const geographyData = {
    labels: ['FY 2018', 'FY 2019', 'FY 2020', 'FY 2021', 'FY 2022', 'FY 2023'],
    datasets: [
      {
        label: 'Americas Segment',
        data: [45000, 48000, 52000, 55000, 58000, 62000],
        backgroundColor: '#3B82F6',
      },
      {
        label: 'Europe Segment',
        data: [35000, 37000, 40000, 42000, 45000, 48000],
        backgroundColor: '#EF4444',
      },
      {
        label: 'Greater China Segment',
        data: [18000, 20000, 22000, 24000, 26000, 28000],
        backgroundColor: '#10B981',
      },
      {
        label: 'Japan Segment',
        data: [12000, 13000, 14000, 15000, 16000, 17000],
        backgroundColor: '#F59E0B',
      },
      {
        label: 'Rest Of Asia Pacific Segment',
        data: [8000, 9000, 10000, 11000, 12000, 13000],
        backgroundColor: '#8B5CF6',
      },
      {
        label: 'Asia-Pacific',
        data: [38000, 42000, 46000, 50000, 54000, 58000],
        backgroundColor: '#EC4899',
      },
    ],
  };

  // Mock data for Revenue Per Business Line
  const businessData = {
    labels: ['FY 2018', 'FY 2019', 'FY 2020', 'FY 2021', 'FY 2022', 'FY 2023'],
    datasets: [
      {
        label: 'Mac',
        data: [25000, 26000, 28000, 35000, 40000, 45000],
        backgroundColor: '#3B82F6',
      },
      {
        label: 'iPhone',
        data: [65000, 70000, 75000, 80000, 85000, 90000],
        backgroundColor: '#8B5CF6',
      },
      {
        label: 'iPad',
        data: [18000, 19000, 20000, 22000, 24000, 26000],
        backgroundColor: '#10B981',
      },
      {
        label: 'Wearables, Home And Accessories',
        data: [12000, 15000, 18000, 22000, 26000, 30000],
        backgroundColor: '#F59E0B',
      },
      {
        label: 'Service',
        data: [30000, 35000, 40000, 45000, 50000, 55000],
        backgroundColor: '#EC4899',
      },
      {
        label: 'iTunes, Software And Service',
        data: [8000, 9000, 10000, 11000, 12000, 13000],
        backgroundColor: '#6366F1',
      },
      {
        label: 'Desktops',
        data: [5000, 5500, 6000, 6500, 7000, 7500],
        backgroundColor: '#DC2626',
      },
    ],
  };

  const chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        stacked: true,
        grid: {
          display: false,
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9ca3af',
          font: {
            family: 'monospace',
            size: 10,
          },
        },
      },
      y: {
        stacked: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#9ca3af',
          font: {
            family: 'monospace',
            size: 10,
          },
          callback: function(value) {
            return value.toLocaleString() + ' B';
          }
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#9ca3af',
          font: {
            family: 'monospace',
            size: 10,
          },
          boxWidth: 12,
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: '#333',
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
        callbacks: {
          label: function(context) {
            return context.dataset.label + ': $' + context.parsed.y.toLocaleString() + 'B';
          },
        },
      },
    },
  };

  const currentData = viewType === 'geography' ? geographyData : businessData;

  return (
    <div className="bg-openbb-bg-widget rounded border border-openbb-border h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-openbb-border bg-openbb-bg-secondary">
        <WidgetHeaderWithTicker
          title={`Revenue Per ${viewType === 'geography' ? 'Geography' : 'Business Line'}`}
          ticker={ticker}
          onTickerChange={onTickerChange || (() => {})}
          onAdd={() => addWidgetContext(
            viewType === 'geography' ? WidgetType.REVENUE_GEOGRAPHY : WidgetType.REVENUE_SEGMENT,
            currentData,
            ticker,
            `Revenue Per ${viewType === 'geography' ? 'Geography' : 'Business Line'}`
          )}
          onSettings={onSettings}
          onRemove={onRemove}
        />
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setChartType(chartType === 'FY' ? 'QTR' : 'FY')}
            className="text-xs  text-openbb-text-secondary hover:text-openbb-accent transition-colors flex items-center gap-1"
          >
            <BarChart2 size={12} />
            {chartType} {chartType === 'FY' ? 'QTR' : 'FY'}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 p-4" style={{ minHeight: '300px' }}>
        <Bar data={currentData} options={chartOptions} />
      </div>

      {/* Toggle Button */}
      <div className="p-3 border-t border-openbb-border bg-openbb-bg-secondary">
        <button
          onClick={() => setViewType(viewType === 'geography' ? 'business' : 'geography')}
          className="text-xs  text-openbb-text-secondary hover:text-openbb-accent transition-colors"
        >
          Switch to Revenue Per {viewType === 'geography' ? 'Business Line' : 'Geography'} →
        </button>
      </div>
    </div>
  );
};

export default SegmentedRevenue;