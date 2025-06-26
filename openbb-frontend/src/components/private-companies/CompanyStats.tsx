import React from 'react';
import { Building2, TrendingUp, MapPin, Database } from 'lucide-react';

interface CompanyStatsProps {
  statistics: {
    total_companies: number;
    by_status: { [key: string]: number };
    by_source: { [key: string]: number };
    by_industry: { [key: string]: number };
    by_state: { [key: string]: number };
  };
}

const CompanyStats: React.FC<CompanyStatsProps> = ({ statistics }) => {
  const topIndustries = Object.entries(statistics.by_industry || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topStates = Object.entries(statistics.by_state || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="bg-openbb-bg-widget border-b border-openbb-border p-4">
      <div className="grid grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="bg-openbb-bg-secondary rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-openbb-accent" />
            <span className="text-xs text-openbb-text-secondary uppercase">Total Companies</span>
          </div>
          <p className="text-2xl font-bold text-openbb-text-primary">
            {statistics.total_companies?.toLocaleString()}
          </p>
        </div>

        {/* By Source */}
        <div className="bg-openbb-bg-secondary rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-openbb-accent" />
            <span className="text-xs text-openbb-text-secondary uppercase">By Source</span>
          </div>
          <div className="space-y-1">
            {Object.entries(statistics.by_source || {}).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between text-xs">
                <span className="text-openbb-text-muted">{source}</span>
                <span className="text-openbb-text-primary font-medium">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Industries */}
        <div className="bg-openbb-bg-secondary rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-openbb-accent" />
            <span className="text-xs text-openbb-text-secondary uppercase">Top Industries</span>
          </div>
          <div className="space-y-1">
            {topIndustries.map(([industry, count]) => (
              <div key={industry} className="flex items-center justify-between text-xs">
                <span className="text-openbb-text-muted truncate" title={industry}>
                  {industry.length > 20 ? industry.substring(0, 20) + '...' : industry}
                </span>
                <span className="text-openbb-text-primary font-medium">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top States */}
        <div className="bg-openbb-bg-secondary rounded p-3">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-openbb-accent" />
            <span className="text-xs text-openbb-text-secondary uppercase">Top States</span>
          </div>
          <div className="space-y-1">
            {topStates.map(([state, count]) => (
              <div key={state} className="flex items-center justify-between text-xs">
                <span className="text-openbb-text-muted">{state}</span>
                <span className="text-openbb-text-primary font-medium">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyStats;