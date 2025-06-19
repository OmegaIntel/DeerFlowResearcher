import React from 'react';
import { Globe, Phone, MapPin, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useCompanyProfileRealTime } from '../../hooks/useRealTimeData';
import WidgetHeaderWithTicker from '../common/WidgetHeaderWithTicker';

interface CompanyProfileProps {
  ticker: string;
  onTickerChange?: (ticker: string) => void;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ ticker, onTickerChange }) => {
  const { data: profile, isLoading, error } = useCompanyProfileRealTime(ticker);

  if (isLoading) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col animate-pulse">
        <div className="h-6 bg-openbb-bg-hover rounded w-1/4 mb-4"></div>
        <div className="widget-content flex-1 overflow-auto">
          <div className="space-y-3">
            <div className="h-4 bg-openbb-bg-hover rounded w-full"></div>
            <div className="h-4 bg-openbb-bg-hover rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
        <p className="text-openbb-danger">Error loading company profile</p>
      </div>
    );
  }

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeaderWithTicker
        title="Ticker Profile"
        ticker={ticker}
        onTickerChange={onTickerChange || (() => {})}
        onRefresh={() => console.log('Refresh')}
        onAdd={() => console.log('Add to dashboard')}
        onExpand={() => console.log('Expand')}
        onMore={() => console.log('More options')}
      />

      <div className="widget-content flex-1 overflow-y-auto overflow-x-hidden">
        <div className="space-y-4">
        <div>
          <h4 className="text-lg font-mono font-bold mb-2 text-openbb-text-primary">{profile.name}</h4>
          
          {/* CEO and Market Info */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
            {profile.ceo && (
              <div className="col-span-2">
                <span className="text-openbb-text-muted">CEO:</span>
                <span className="ml-2 text-openbb-text-secondary">{profile.ceo}</span>
              </div>
            )}
            {profile.marketCap && (
              <div className="flex items-center gap-1">
                <DollarSign size={12} className="text-openbb-accent" />
                <span className="text-openbb-text-muted">Market Cap:</span>
                <span className="ml-1 text-openbb-text-secondary">${(profile.marketCap / 1e9).toFixed(2)}B</span>
              </div>
            )}
            {profile.price && (
              <div className="flex items-center gap-1">
                <TrendingUp size={12} className="text-openbb-accent" />
                <span className="text-openbb-text-muted">Price:</span>
                <span className="ml-1 text-openbb-text-secondary">${profile.price.toFixed(2)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-start gap-2 text-xs text-openbb-text-secondary mb-2 font-mono">
            <MapPin size={14} className="mt-0.5 flex-shrink-0 text-openbb-accent" />
            <span>{profile.address || profile.country}</span>
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-openbb-text-secondary mb-3 font-mono">
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="flex items-center gap-1 hover:text-openbb-accent transition-colors">
                <Phone size={14} />
                {profile.phone}
              </a>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-openbb-accent transition-colors">
                <Globe size={14} />
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
            <div>
              <span className="text-openbb-text-muted">Sector:</span>
              <span className="ml-2 text-openbb-text-secondary">{profile.sector}</span>
            </div>
            <div>
              <span className="text-openbb-text-muted">Industry:</span>
              <span className="ml-2 text-openbb-text-secondary">{profile.industry}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} className="text-openbb-accent" />
              <span className="text-openbb-text-muted">Employees:</span>
              <span className="ml-1 text-openbb-text-secondary">{profile.fullTimeEmployees.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-openbb-text-muted">IPO Date:</span>
              <span className="ml-2 text-openbb-text-secondary">{profile.ipoDate}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs mb-3 font-mono">
            <div>
              <span className="text-openbb-text-muted">CIK:</span>
              <span className="ml-1 text-openbb-text-secondary">{profile.cik}</span>
            </div>
            <div>
              <span className="text-openbb-text-muted">ISIN:</span>
              <span className="ml-1 text-openbb-text-secondary">{profile.isin}</span>
            </div>
            <div>
              <span className="text-openbb-text-muted">CUSIP:</span>
              <span className="ml-1 text-openbb-text-secondary">{profile.cusip}</span>
            </div>
          </div>

          <div className="border-t border-openbb-border pt-3">
            <h5 className="font-mono font-semibold mb-2 text-sm text-openbb-text-primary">Description</h5>
            <p className="text-xs text-openbb-text-secondary leading-relaxed font-mono">{profile.description}</p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default CompanyProfile;