import { useQuery } from '@tanstack/react-query';
import { useState, useCallback, useMemo } from 'react';
import { privateCompanyService } from '../services/privateCompanyService';
import type { CompanyFilters } from '../services/privateCompanyService';
import debounce from 'lodash/debounce';

export const usePrivateCompanies = () => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CompanyFilters>({});

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setSearch(value);
      setPage(1); // Reset to first page on new search
    }, 300),
    []
  );

  // Fetch companies
  const {
    data: companiesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['private-companies', page, limit, search, filters],
    queryFn: () => privateCompanyService.getCompanies(page, limit, search, filters),
    staleTime: 60 * 60 * 1000, // 1 hour - data stays fresh longer
    gcTime: 24 * 60 * 60 * 1000, // 24 hours - keep in cache longer
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data exists in cache
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['private-companies-filters'],
    queryFn: () => privateCompanyService.getFilterOptions(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - filters rarely change
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
    refetchOnMount: false,
  });

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['private-companies-stats'],
    queryFn: () => privateCompanyService.getStatistics(),
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: false,
  });

  // Handlers
  const handleSearch = useCallback((value: string) => {
    debouncedSearch(value);
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((newFilters: CompanyFilters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page on filter change
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page on limit change
  }, []);

  const exportCurrentView = useCallback(() => {
    if (companiesData?.companies) {
      privateCompanyService.exportToCSV(companiesData.companies);
    }
  }, [companiesData]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearch('');
    setPage(1);
  }, []);

  return {
    // Data
    companies: companiesData?.companies || [],
    pagination: companiesData?.pagination || {
      page: 1,
      limit: 100,
      total_count: 0,
      total_pages: 0
    },
    filterOptions,
    statistics,
    
    // State
    isLoading,
    error,
    search,
    filters,
    
    // Handlers
    handleSearch,
    handleFilterChange,
    handlePageChange,
    handleLimitChange,
    exportCurrentView,
    clearFilters,
    refetch,
  };
};

// Hook for individual company details
export const usePrivateCompanyDetails = (companyId: string | null) => {
  return useQuery({
    queryKey: ['private-company-details', companyId],
    queryFn: () => companyId ? privateCompanyService.getCompanyById(companyId) : null,
    enabled: !!companyId,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    refetchOnMount: false,
  });
};