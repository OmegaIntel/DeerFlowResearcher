import React from 'react';
import { X, ExternalLink, Building2, Globe, Linkedin, Calendar, MapPin, Users, DollarSign, Tag } from 'lucide-react';
import { usePrivateCompanyDetails } from '../../hooks/usePrivateCompanies';

interface CompanyDetailsProps {
  companyId: string;
  onClose: () => void;
}

const CompanyDetails: React.FC<CompanyDetailsProps> = ({ companyId, onClose }) => {
  const { data: company, isLoading, error } = usePrivateCompanyDetails(companyId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-openbb-bg-widget border border-openbb-border rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-openbb-border">
          <h2 className="text-xl font-bold text-openbb-text-primary">Company Details</h2>
          <button
            onClick={onClose}
            className="p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-openbb-accent mx-auto mb-4"></div>
              <p className="text-openbb-text-muted">Loading company details...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-openbb-danger">
              Error loading company details
            </div>
          )}

          {company && (
            <div className="space-y-6">
              {/* Company Header */}
              <div>
                <h3 className="text-2xl font-bold text-openbb-text-primary mb-2">
                  {company.company_name}
                </h3>
                <div className="flex items-center gap-4 text-sm text-openbb-text-muted">
                  {company.status && (
                    <span className={`inline-flex px-2 py-1 rounded ${
                      company.status === 'active' 
                        ? 'bg-green-500/20 text-green-400'
                        : company.status === 'acquired'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-openbb-bg-hover text-openbb-text-muted'
                    }`}>
                      {company.status}
                    </span>
                  )}
                  {company.founded_year && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      Founded {company.founded_year}
                    </span>
                  )}
                  {company.source_type && (
                    <span className={`inline-flex px-2 py-1 rounded ${
                      company.source_type === 'PPP_LOAN'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-openbb-bg-hover text-openbb-text-muted'
                    }`}>
                      {company.source_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {company.description && (
                <div>
                  <h4 className="text-sm font-medium text-openbb-text-secondary mb-2">Description</h4>
                  <p className="text-openbb-text-primary">{company.description}</p>
                </div>
              )}

              {/* Key Information Grid */}
              <div className="grid grid-cols-2 gap-6">
                {/* Business Information */}
                <div>
                  <h4 className="text-sm font-medium text-openbb-text-secondary mb-3">Business Information</h4>
                  <div className="space-y-2">
                    {company.industry_primary && (
                      <div className="flex items-start gap-2">
                        <Tag size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">Primary Industry</p>
                          <p className="text-sm text-openbb-text-primary">{company.industry_primary}</p>
                        </div>
                      </div>
                    )}
                    {company.industry_secondary && (
                      <div className="flex items-start gap-2">
                        <Tag size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">Secondary Industry</p>
                          <p className="text-sm text-openbb-text-primary">{company.industry_secondary}</p>
                        </div>
                      </div>
                    )}
                    {company.business_model && (
                      <div className="flex items-start gap-2">
                        <Building2 size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">Business Model</p>
                          <p className="text-sm text-openbb-text-primary">{company.business_model}</p>
                        </div>
                      </div>
                    )}
                    {company.business_type && (
                      <div className="flex items-start gap-2">
                        <Building2 size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">Business Type</p>
                          <p className="text-sm text-openbb-text-primary">{company.business_type}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Location & Contact */}
                <div>
                  <h4 className="text-sm font-medium text-openbb-text-secondary mb-3">Location & Contact</h4>
                  <div className="space-y-2">
                    {(company.address || company.city || company.state || company.zip_code) && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">Address</p>
                          <p className="text-sm text-openbb-text-primary">
                            {[company.address, company.city, company.state, company.zip_code]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {company.location && (
                      <div className="flex items-start gap-2">
                        <MapPin size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">General Location</p>
                          <p className="text-sm text-openbb-text-primary">{company.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Company Size */}
                <div>
                  <h4 className="text-sm font-medium text-openbb-text-secondary mb-3">Company Size</h4>
                  <div className="space-y-2">
                    {(company.employees || company.employee_count) && (
                      <div className="flex items-start gap-2">
                        <Users size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">Employee Count</p>
                          <p className="text-sm text-openbb-text-primary">
                            {(company.employees || company.employee_count || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {company.loan_amount && (
                      <div className="flex items-start gap-2">
                        <DollarSign size={16} className="text-openbb-text-muted mt-0.5" />
                        <div>
                          <p className="text-xs text-openbb-text-muted">PPP Loan Amount</p>
                          <p className="text-sm text-openbb-text-primary">
                            ${company.loan_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Links */}
                <div>
                  <h4 className="text-sm font-medium text-openbb-text-secondary mb-3">Links</h4>
                  <div className="space-y-2">
                    {company.website_url && (
                      <a
                        href={company.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-openbb-accent hover:text-openbb-text-primary transition-colors"
                      >
                        <Globe size={16} />
                        <span className="text-sm">{company.website_domain || 'Website'}</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {company.linkedin_url && (
                      <a
                        href={company.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-openbb-accent hover:text-openbb-text-primary transition-colors"
                      >
                        <Linkedin size={16} />
                        <span className="text-sm">LinkedIn Profile</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                    {company.pitchbook_url && (
                      <a
                        href={company.pitchbook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-openbb-accent hover:text-openbb-text-primary transition-colors"
                      >
                        <Building2 size={16} />
                        <span className="text-sm">Pitchbook Profile</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="border-t border-openbb-border pt-4">
                <h4 className="text-sm font-medium text-openbb-text-secondary mb-3">Additional Information</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {company.company_id && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">Company ID</p>
                      <p className="text-openbb-text-primary font-mono">{company.company_id}</p>
                    </div>
                  )}
                  {company.pitchbook_id && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">Pitchbook ID</p>
                      <p className="text-openbb-text-primary font-mono">{company.pitchbook_id}</p>
                    </div>
                  )}
                  {company.naics_code && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">NAICS Code</p>
                      <p className="text-openbb-text-primary font-mono">{company.naics_code}</p>
                    </div>
                  )}
                  {company.data_quality_score !== null && company.data_quality_score !== undefined && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">Data Quality Score</p>
                      <p className="text-openbb-text-primary">{company.data_quality_score}/100</p>
                    </div>
                  )}
                  {company.nonprofit && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">Nonprofit</p>
                      <p className="text-openbb-text-primary">{company.nonprofit}</p>
                    </div>
                  )}
                  {company.franchise_name && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">Franchise</p>
                      <p className="text-openbb-text-primary">{company.franchise_name}</p>
                    </div>
                  )}
                  {company.date_approved && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">PPP Loan Approved</p>
                      <p className="text-openbb-text-primary">{company.date_approved}</p>
                    </div>
                  )}
                  {company.data_source_file && (
                    <div>
                      <p className="text-xs text-openbb-text-muted">Data Source</p>
                      <p className="text-openbb-text-primary text-xs truncate" title={company.data_source_file}>
                        {company.data_source_file}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetails;