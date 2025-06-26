import React from 'react';
import { X } from 'lucide-react';
import type { CompanyFilters as ICompanyFilters, FilterOptions } from '../../services/privateCompanyService';

interface CompanyFiltersProps {
  filters: ICompanyFilters;
  filterOptions?: FilterOptions;
  onFilterChange: (filters: ICompanyFilters) => void;
  onClearFilters: () => void;
}

const CompanyFilters: React.FC<CompanyFiltersProps> = ({
  filters,
  filterOptions,
  onFilterChange,
  onClearFilters,
}) => {
  const handleFilterChange = (key: keyof ICompanyFilters, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-openbb-text-primary">Filters</h3>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm text-openbb-accent hover:text-openbb-text-primary transition-colors flex items-center gap-1"
          >
            <X size={14} />
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Industry Filter */}
        <div>
          <label className="block text-sm font-medium text-openbb-text-secondary mb-2">
            Industry
          </label>
          <select
            value={filters.industry_primary || ''}
            onChange={(e) => handleFilterChange('industry_primary', e.target.value)}
            className="w-full px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
          >
            <option value="">All Industries</option>
            {filterOptions?.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
        </div>

        {/* State Filter */}
        <div>
          <label className="block text-sm font-medium text-openbb-text-secondary mb-2">
            State
          </label>
          <select
            value={filters.state || ''}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="w-full px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
          >
            <option value="">All States</option>
            {filterOptions?.states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-openbb-text-secondary mb-2">
            Status
          </label>
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
          >
            <option value="">All Statuses</option>
            {filterOptions?.statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {/* Data Source Filter */}
        <div>
          <label className="block text-sm font-medium text-openbb-text-secondary mb-2">
            Data Source
          </label>
          <select
            value={filters.data_source || ''}
            onChange={(e) => handleFilterChange('data_source', e.target.value)}
            className="w-full px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
          >
            <option value="">All Sources</option>
            {filterOptions?.sources.filter(s => s !== 'All Sources').map((source) => (
              <option key={source} value={source}>
                {source === 'PPP_LOAN' ? 'PPP Loan Recipients' : 
                 source === 'Non-PPP Companies' ? 'Non-PPP Companies' : 
                 source}
              </option>
            ))}
          </select>
        </div>

        {/* Founded Year Range */}
        <div>
          <label className="block text-sm font-medium text-openbb-text-secondary mb-2">
            Founded Year
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.founded_year_min || ''}
              onChange={(e) => handleFilterChange('founded_year_min', e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
              min="1800"
              max="2024"
            />
            <span className="text-openbb-text-muted self-center">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.founded_year_max || ''}
              onChange={(e) => handleFilterChange('founded_year_max', e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
              min="1800"
              max="2024"
            />
          </div>
        </div>

        {/* Employee Count Range */}
        <div>
          <label className="block text-sm font-medium text-openbb-text-secondary mb-2">
            Employee Count
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.employee_count_min || ''}
              onChange={(e) => handleFilterChange('employee_count_min', e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
              min="0"
            />
            <span className="text-openbb-text-muted self-center">-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.employee_count_max || ''}
              onChange={(e) => handleFilterChange('employee_count_max', e.target.value ? Number(e.target.value) : undefined)}
              className="flex-1 px-3 py-2 bg-openbb-bg-primary border border-openbb-border rounded text-openbb-text-primary text-sm focus:outline-none focus:border-openbb-accent"
              min="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyFilters;