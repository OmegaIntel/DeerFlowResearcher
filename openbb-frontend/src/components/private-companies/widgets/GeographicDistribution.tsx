import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { MapPin } from 'lucide-react';
import WidgetHeader from '../../common/WidgetHeader';
import { useCopilot } from '../../../contexts/CopilotContext';
import { WidgetType } from '../../../services/copilotService';
import type { PrivateCompany } from '../../../services/privateCompanyService';

interface GeographicDistributionProps {
  companies: PrivateCompany[];
  onSettings?: () => void;
  onRemove?: () => void;
}

const GeographicDistribution: React.FC<GeographicDistributionProps> = ({ 
  companies, 
  onSettings, 
  onRemove 
}) => {
  const { addWidgetContext } = useCopilot();

  const stateData = useMemo(() => {
    // Count companies by state
    const stateCount: { [key: string]: number } = {};
    
    companies.forEach(company => {
      const state = company.state || 'Unknown';
      stateCount[state] = (stateCount[state] || 0) + 1;
    });

    // Sort by count and take top 15
    const sortedStates = Object.entries(stateCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15);

    return {
      labels: sortedStates.map(([state]) => state),
      data: sortedStates.map(([, count]) => count),
      total: companies.length,
    };
  }, [companies]);

  const chartData = {
    labels: stateData.labels,
    datasets: [{
      label: 'Number of Companies',
      data: stateData.data,
      backgroundColor: '#00D9FF',
      borderColor: '#00B8E0',
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.x || 0;
            const percentage = ((value / stateData.total) * 100).toFixed(1);
            return `Companies: ${value} (${percentage}%)`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#A0A0A0',
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#E5E5E5',
        },
      },
    },
  };

  // Calculate additional stats
  const topState = stateData.labels[0];
  const topStateCount = stateData.data[0];
  const topStatePercentage = ((topStateCount / stateData.total) * 100).toFixed(1);

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeader 
        title="Geographic Distribution" 
        onAdd={() => addWidgetContext(
          'geographic-distribution' as WidgetType,
          stateData,
          'private-companies'
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="widget-content flex-1 overflow-auto">
        {companies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-openbb-text-muted">No company data available</p>
          </div>
        ) : (
          <>
            {/* Top State Highlight */}
            <div className="bg-openbb-bg-secondary rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin size={16} className="text-openbb-accent" />
                <span className="text-sm text-openbb-text-muted">Top State</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-openbb-text-primary">
                  {topState}
                </span>
                <span className="text-sm text-openbb-accent">
                  {topStateCount.toLocaleString()} companies ({topStatePercentage}%)
                </span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-full min-h-[350px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GeographicDistribution;