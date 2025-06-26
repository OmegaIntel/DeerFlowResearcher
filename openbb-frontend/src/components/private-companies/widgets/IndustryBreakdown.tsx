import React, { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';
import { Building2 } from 'lucide-react';
import WidgetHeader from '../../common/WidgetHeader';
import { useCopilot } from '../../../contexts/CopilotContext';
import { WidgetType } from '../../../services/copilotService';
import type { PrivateCompany } from '../../../services/privateCompanyService';

interface IndustryBreakdownProps {
  companies: PrivateCompany[];
  onSettings?: () => void;
  onRemove?: () => void;
}

const IndustryBreakdown: React.FC<IndustryBreakdownProps> = ({ 
  companies, 
  onSettings, 
  onRemove 
}) => {
  const { addWidgetContext } = useCopilot();

  const industryData = useMemo(() => {
    // Count companies by industry
    const industryCount: { [key: string]: number } = {};
    
    companies.forEach(company => {
      const industry = company.industry_primary || 'Unknown';
      industryCount[industry] = (industryCount[industry] || 0) + 1;
    });

    // Sort by count and take top 10
    const sortedIndustries = Object.entries(industryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Calculate "Others" if there are more industries
    const topCount = sortedIndustries.reduce((sum, [, count]) => sum + count, 0);
    const othersCount = companies.length - topCount;
    
    if (othersCount > 0) {
      sortedIndustries.push(['Others', othersCount]);
    }

    return {
      labels: sortedIndustries.map(([industry]) => industry),
      data: sortedIndustries.map(([, count]) => count),
      total: companies.length,
    };
  }, [companies]);

  const chartData = {
    labels: industryData.labels,
    datasets: [{
      data: industryData.data,
      backgroundColor: [
        '#00D9FF', // OpenBB accent
        '#FF6B6B',
        '#4ECDC4',
        '#45B7D1',
        '#F7DC6F',
        '#BB8FCE',
        '#85C1E9',
        '#F8C471',
        '#82E0AA',
        '#F1948A',
        '#999999', // Others
      ],
      borderColor: '#1A1A1A',
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: '#E5E5E5',
          font: {
            size: 11,
          },
          padding: 10,
          generateLabels: (chart: any) => {
            const data = chart.data;
            return data.labels.map((label: string, i: number) => ({
              text: `${label} (${data.datasets[0].data[i]})`,
              fillStyle: data.datasets[0].backgroundColor[i],
              strokeStyle: data.datasets[0].borderColor,
              lineWidth: data.datasets[0].borderWidth,
              hidden: false,
              index: i,
            }));
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = ((value / industryData.total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeader 
        title="Industry Distribution" 
        onAdd={() => addWidgetContext(
          'industry-breakdown' as WidgetType,
          industryData,
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
          <div className="h-full min-h-[300px]">
            <Pie data={chartData} options={chartOptions} />
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-openbb-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-openbb-text-muted">Total Companies</span>
            <span className="font-medium text-openbb-text-primary">
              {industryData.total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-openbb-text-muted">Industries Shown</span>
            <span className="font-medium text-openbb-text-primary">
              {industryData.labels.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryBreakdown;