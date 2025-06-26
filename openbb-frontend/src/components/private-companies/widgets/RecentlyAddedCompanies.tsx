import React from 'react';
import { Clock, ExternalLink, Calendar } from 'lucide-react';
import WidgetHeader from '../../common/WidgetHeader';
import { useCopilot } from '../../../contexts/CopilotContext';
import { WidgetType } from '../../../services/copilotService';
import type { PrivateCompany } from '../../../services/privateCompanyService';

interface RecentlyAddedCompaniesProps {
  companies: PrivateCompany[];
  onCompanyClick?: (companyId: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const RecentlyAddedCompanies: React.FC<RecentlyAddedCompaniesProps> = ({ 
  companies, 
  onCompanyClick,
  onSettings, 
  onRemove 
}) => {
  const { addWidgetContext } = useCopilot();

  // Sort by date_approved or founded_year (most recent first)
  const recentCompanies = [...companies]
    .filter(company => company.date_approved || company.founded_year)
    .sort((a, b) => {
      // First try to sort by date_approved
      if (a.date_approved && b.date_approved) {
        return new Date(b.date_approved).getTime() - new Date(a.date_approved).getTime();
      }
      // If no date_approved, sort by founded_year
      const yearA = a.founded_year || 0;
      const yearB = b.founded_year || 0;
      return yearB - yearA;
    })
    .slice(0, 8);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeader 
        title="Recently Added Companies" 
        onAdd={() => addWidgetContext(
          'recently-added-companies' as WidgetType,
          recentCompanies,
          'private-companies'
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="widget-content flex-1 overflow-auto">
        {recentCompanies.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-openbb-text-muted">No recent companies available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentCompanies.map((company) => (
              <div 
                key={company.company_id}
                className="group p-3 rounded-lg bg-openbb-bg-secondary hover:bg-openbb-bg-hover transition-colors cursor-pointer"
                onClick={() => onCompanyClick?.(company.company_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-openbb-text-primary truncate">
                      {company.company_name}
                    </h4>
                    
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-openbb-text-muted">
                        {company.city}, {company.state}
                      </span>
                      {company.industry_primary && (
                        <span className="text-xs text-openbb-text-muted">
                          {company.industry_primary}
                        </span>
                      )}
                    </div>
                    
                    {company.website_domain && (
                      <a
                        href={company.website_url || `https://${company.website_domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-openbb-accent hover:underline mt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {company.website_domain}
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 text-right">
                    {company.date_approved ? (
                      <div className="flex items-center gap-1 text-xs text-openbb-text-muted">
                        <Clock size={12} />
                        <span>{formatDate(company.date_approved)}</span>
                      </div>
                    ) : company.founded_year ? (
                      <div className="flex items-center gap-1 text-xs text-openbb-text-muted">
                        <Calendar size={12} />
                        <span>{company.founded_year}</span>
                      </div>
                    ) : null}
                    
                    {company.loan_amount && company.loan_amount > 0 && (
                      <p className="text-xs text-purple-400 font-medium mt-1">
                        ${company.loan_amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                
                {company.status && (
                  <div className="mt-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs rounded ${
                      company.status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : company.status === 'acquired'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-openbb-bg-hover text-openbb-text-muted'
                    }`}>
                      {company.status}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentlyAddedCompanies;