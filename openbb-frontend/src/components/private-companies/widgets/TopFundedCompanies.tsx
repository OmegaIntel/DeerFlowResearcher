import React from 'react';
import { DollarSign, ExternalLink } from 'lucide-react';
import WidgetHeader from '../../common/WidgetHeader';
import { useCopilot } from '../../../contexts/CopilotContext';
import { WidgetType } from '../../../services/copilotService';
import type { PrivateCompany } from '../../../services/privateCompanyService';

interface TopFundedCompaniesProps {
  companies: PrivateCompany[];
  onCompanyClick?: (companyId: string) => void;
  onSettings?: () => void;
  onRemove?: () => void;
}

const TopFundedCompanies: React.FC<TopFundedCompaniesProps> = ({ 
  companies, 
  onCompanyClick,
  onSettings, 
  onRemove 
}) => {
  const { addWidgetContext } = useCopilot();

  // Filter and sort companies by loan amount
  const topFunded = companies
    .filter(company => company.loan_amount && company.loan_amount > 0)
    .sort((a, b) => (b.loan_amount || 0) - (a.loan_amount || 0))
    .slice(0, 10);

  return (
    <div className="bg-openbb-bg-widget rounded-lg border border-openbb-border p-4 h-full flex flex-col">
      <WidgetHeader 
        title="Top PPP Loan Recipients" 
        onAdd={() => addWidgetContext(
          'top-funded-companies' as WidgetType,
          topFunded,
          'private-companies'
        )}
        onSettings={onSettings}
        onRemove={onRemove}
      />
      
      <div className="widget-content flex-1 overflow-auto">
        {topFunded.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-openbb-text-muted">No PPP loan data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topFunded.map((company, index) => (
              <div 
                key={company.company_id}
                className="flex items-start gap-3 p-3 rounded-lg bg-openbb-bg-secondary hover:bg-openbb-bg-hover transition-colors cursor-pointer"
                onClick={() => onCompanyClick?.(company.company_id)}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-400">
                    {index + 1}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-openbb-text-primary truncate">
                        {company.company_name}
                      </h4>
                      <p className="text-xs text-openbb-text-muted mt-0.5">
                        {company.city}, {company.state} • {company.industry_primary || 'Unknown Industry'}
                      </p>
                    </div>
                    
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-semibold text-purple-400">
                        ${company.loan_amount?.toLocaleString()}
                      </p>
                      {company.date_approved && (
                        <p className="text-xs text-openbb-text-muted">
                          {new Date(company.date_approved).toLocaleDateString()}
                        </p>
                      )}
                    </div>
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopFundedCompanies;