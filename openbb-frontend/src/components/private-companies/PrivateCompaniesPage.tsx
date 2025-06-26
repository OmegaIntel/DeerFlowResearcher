import React, { useState, useEffect, useRef } from 'react';
import { Building2, Search, Filter, Download, RefreshCw, X, LayoutGrid, List, Sparkles } from 'lucide-react';
import CompanyList from './CompanyList';
import CompanyFilters from './CompanyFilters';
import CompanyStats from './CompanyStats';
import CompanyDetails from './CompanyDetails';
import { usePrivateCompanies } from '../../hooks/usePrivateCompanies';
import { privateCompanyService } from '../../services/privateCompanyService';
import CompanyStatistics from './widgets/CompanyStatistics';
import TopFundedCompanies from './widgets/TopFundedCompanies';
import IndustryBreakdown from './widgets/IndustryBreakdown';
import GeographicDistribution from './widgets/GeographicDistribution';
import RecentlyAddedCompanies from './widgets/RecentlyAddedCompanies';

const PrivateCompaniesPage: React.FC = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [showWidgets, setShowWidgets] = useState(true);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);
  const [semanticResults, setSemanticResults] = useState<any>(null);
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const {
    companies,
    pagination,
    filterOptions,
    statistics,
    isLoading,
    error,
    filters,
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handleLimitChange,
    exportCurrentView,
    clearFilters,
    refetch,
  } = usePrivateCompanies();

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length;

  // Semantic search handler
  const handleSemanticSearch = async (query: string) => {
    if (!query.trim()) {
      setSemanticResults(null);
      return;
    }

    setIsSemanticSearching(true);
    try {
      const results = await privateCompanyService.semanticSearch(query, 100);
      setSemanticResults(results);
    } catch (error) {
      console.error('Semantic search error:', error);
      // Fallback to regular search
      handleSearch(query);
    } finally {
      setIsSemanticSearching(false);
    }
  };

  // Determine which companies to show
  const displayCompanies = useSemanticSearch && semanticResults 
    ? semanticResults.companies 
    : companies;
  
  const displayPagination = useSemanticSearch && semanticResults
    ? {
        page: 1,
        limit: semanticResults.companies.length,
        total_count: semanticResults.total_count,
        total_pages: 1
      }
    : pagination;

  // Handle click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  return (
    <div className="h-full flex flex-col bg-openbb-bg-primary">
      {/* Header */}
      <div className="bg-openbb-bg-widget border-b border-openbb-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-openbb-accent" />
            <h1 className="text-2xl font-bold text-openbb-text-primary">Private Companies</h1>
            {statistics && (
              <span className="text-sm text-openbb-text-muted">
                ({statistics.total_companies?.toLocaleString()} total companies)
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWidgets(!showWidgets)}
              className={`p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors ${
                showWidgets ? 'bg-openbb-bg-hover text-openbb-text-primary' : ''
              }`}
              title={showWidgets ? 'Hide widgets' : 'Show widgets'}
            >
              {showWidgets ? <List size={18} /> : <LayoutGrid size={18} />}
            </button>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors relative ${
                showFilters ? 'bg-openbb-bg-hover text-openbb-text-primary' : ''
              }`}
              title={showFilters ? 'Hide filters' : 'Show filters'}
            >
              <Filter size={18} />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-openbb-accent text-openbb-bg-primary text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            
            <button
              onClick={exportCurrentView}
              disabled={companies.length === 0}
              className="p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export current view to CSV"
            >
              <Download size={18} />
            </button>
            
            <button
              onClick={() => refetch()}
              className="p-2 rounded text-openbb-text-muted hover:text-openbb-text-primary hover:bg-openbb-bg-hover transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-openbb-text-muted" size={18} />
            <input
              type="text"
              placeholder={useSemanticSearch 
                ? "Ask in natural language: 'tech companies in California', 'companies with 100+ employees'..."
                : "Search by company name, website, description, industry, or location..."}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (useSemanticSearch) {
                  // Debounce semantic search
                  if (e.target.value.length > 3) {
                    handleSemanticSearch(e.target.value);
                  }
                } else {
                  handleSearch(e.target.value);
                }
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && useSemanticSearch) {
                  handleSemanticSearch(searchInput);
                }
              }}
              className="w-full pl-10 pr-10 py-2 bg-openbb-bg-secondary border border-openbb-border rounded text-openbb-text-primary placeholder-openbb-text-muted focus:outline-none focus:border-openbb-accent"
            />
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSemanticResults(null);
                  handleSearch('');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-openbb-text-muted hover:text-openbb-text-primary"
              >
                <X size={18} />
              </button>
            )}
          </div>
          
          {/* Semantic Search Toggle */}
          <button
            onClick={() => {
              setUseSemanticSearch(!useSemanticSearch);
              setSemanticResults(null);
              if (!useSemanticSearch && searchInput) {
                handleSemanticSearch(searchInput);
              } else if (useSemanticSearch && searchInput) {
                handleSearch(searchInput);
              }
            }}
            className={`p-2 rounded flex items-center gap-2 transition-colors ${
              useSemanticSearch 
                ? 'bg-openbb-accent text-openbb-bg-primary' 
                : 'bg-openbb-bg-secondary text-openbb-text-muted hover:text-openbb-text-primary'
            }`}
            title={useSemanticSearch ? 'Switch to keyword search' : 'Switch to AI-powered semantic search'}
          >
            <Sparkles size={18} />
            <span className="text-sm font-medium">AI Search</span>
          </button>
        </div>
        
        {/* Show parsed query for semantic search */}
        {useSemanticSearch && semanticResults?.parsed_query && (
          <div className="mt-2 p-2 bg-openbb-bg-secondary rounded text-xs">
            <span className="text-openbb-text-muted">AI understood: </span>
            <span className="text-openbb-accent">
              {Object.entries(semanticResults.parsed_query)
                .filter(([key, value]) => value)
                .map(([key, value]) => {
                  if (key === 'keywords' && Array.isArray(value)) {
                    return `keywords: ${value.join(', ')}`;
                  }
                  return `${key}: ${value}`;
                })
                .join(' • ')
              }
            </span>
          </div>
        )}
      </div>

      {/* Statistics */}
      {statistics && <CompanyStats statistics={statistics} />}

      {/* Filters Dropdown */}
      {showFilters && (
        <div ref={filterDropdownRef} className="absolute top-20 right-16 z-50 w-96 max-h-[calc(100vh-120px)] overflow-y-auto bg-openbb-bg-widget border border-openbb-border rounded-lg shadow-xl">
          <div className="relative">
            <CompanyFilters
              filters={filters}
              filterOptions={filterOptions}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
            {/* Close button */}
            <button
              onClick={() => setShowFilters(false)}
              className="absolute top-2 right-2 p-1 rounded hover:bg-openbb-bg-hover text-openbb-text-muted hover:text-openbb-text-primary"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Widgets Section */}
        {showWidgets && (
          <div className="w-96 border-r border-openbb-border overflow-y-auto bg-openbb-bg-secondary p-4">
            <div className="space-y-4">
              {/* Company Statistics */}
              <div className="h-64">
                <CompanyStatistics statistics={statistics} />
              </div>
              
              {/* Top Funded Companies */}
              <div className="h-96">
                <TopFundedCompanies 
                  companies={displayCompanies}
                  onCompanyClick={setSelectedCompanyId}
                />
              </div>
              
              {/* Industry Breakdown */}
              <div className="h-96">
                <IndustryBreakdown companies={displayCompanies} />
              </div>
              
              {/* Geographic Distribution */}
              <div className="h-96">
                <GeographicDistribution companies={displayCompanies} />
              </div>
              
              {/* Recently Added Companies */}
              <div className="h-96">
                <RecentlyAddedCompanies 
                  companies={displayCompanies}
                  onCompanyClick={setSelectedCompanyId}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Company List */}
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="p-4 text-center text-openbb-danger">
              Error loading companies: {error instanceof Error ? error.message : 'Unknown error'}
            </div>
          ) : (
            <CompanyList
              companies={displayCompanies}
              pagination={displayPagination}
              isLoading={isLoading || isSemanticSearching}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              onCompanyClick={setSelectedCompanyId}
            />
          )}
        </div>
      </div>

      {/* Company Details Modal */}
      {selectedCompanyId && (
        <CompanyDetails
          companyId={selectedCompanyId}
          onClose={() => setSelectedCompanyId(null)}
        />
      )}
    </div>
  );
};

export default PrivateCompaniesPage;