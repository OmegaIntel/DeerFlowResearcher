import React from 'react';
import { Building2, TrendingUp, MapPin, Calendar } from 'lucide-react';
import WidgetHeader from '../../common/WidgetHeader';
import { useCopilot } from '../../../contexts/CopilotContext';
import { WidgetType } from '../../../services/copilotService';

interface CompanyStatisticsProps {
  statistics: any;
  onSettings?: () => void;
  onRemove?: () => void;
}

const CompanyStatistics: React.FC<CompanyStatisticsProps> = ({ statistics, onSettings, onRemove }) => {
  const { addWidgetContext } = useCopilot();

  if (!statistics) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <WidgetHeader 
          title="Company Statistics" 
          onSettings={onSettings}
          onRemove={onRemove}
        />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-openbb-text-muted">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Total Companies',
      value: statistics.total_companies?.toLocaleString() || '0',
      icon: Building2,
      color: 'text-openbb-accent',
      bgColor: 'bg-openbb-accent/10',
    },
    {
      label: 'Active Companies',
      value: statistics.active_companies?.toLocaleString() || '0',
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    {
      label: 'Total States',
      value: statistics.total_states || '0',
      icon: MapPin,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
    },
    {
      label: 'Latest Update',
      value: statistics.last_updated ? new Date(statistics.last_updated).toLocaleDateString() : 'N/A',
      icon: Calendar,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
    },
  ];

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeader 
        title="Company Statistics" 
        onAdd={() => addWidgetContext(
          'company-statistics' as WidgetType,
          statistics,
          'private-companies'
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="widget-content flex-1 overflow-auto">
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-openbb-bg-secondary rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-openbb-text-primary">
                    {stat.value}
                  </p>
                  <p className="text-sm text-openbb-text-muted mt-1">
                    {stat.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Statistics */}
        {statistics.ppp_stats && (
          <div className="mt-6 pt-6 border-t border-openbb-border">
            <h4 className="text-sm font-medium text-openbb-text-primary mb-3">PPP Loan Statistics</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-openbb-text-muted">Total PPP Recipients</span>
                <span className="text-sm text-purple-400 font-medium">
                  {statistics.ppp_stats.total_recipients?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-openbb-text-muted">Total Loan Amount</span>
                <span className="text-sm text-purple-400 font-medium">
                  ${statistics.ppp_stats.total_amount?.toLocaleString() || '0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-openbb-text-muted">Average Loan Size</span>
                <span className="text-sm text-purple-400 font-medium">
                  ${statistics.ppp_stats.avg_loan_size?.toLocaleString() || '0'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyStatistics;