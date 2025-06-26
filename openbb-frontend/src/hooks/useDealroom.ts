import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealroomService } from '../services/dealroomService';

interface DealFilters {
  status?: string;
  assignee?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const useDealroom = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<DealFilters>({});

  // Fetch deals
  const { data: dealsData, isLoading, error } = useQuery({
    queryKey: ['dealroom-deals', filters],
    queryFn: () => dealroomService.getDeals(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['dealroom-categories'],
    queryFn: () => dealroomService.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Update deal status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ dealId, status }: { dealId: string; status: string }) =>
      dealroomService.updateDealStatus(dealId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealroom-deals'] });
    },
  });

  // Add deal mutation
  const addDealMutation = useMutation({
    mutationFn: (deal: any) => dealroomService.addDeal(deal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealroom-deals'] });
    },
  });

  // Handlers
  const updateFilters = useCallback((newFilters: DealFilters) => {
    setFilters(newFilters);
  }, []);

  const updateDealStatus = useCallback((dealId: string, status: string) => {
    updateStatusMutation.mutate({ dealId, status });
  }, [updateStatusMutation]);

  const addDeal = useCallback((deal: any) => {
    addDealMutation.mutate(deal);
  }, [addDealMutation]);

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dealroom-deals'] });
  }, [queryClient]);

  return {
    deals: dealsData?.deals || [],
    categories: categories || [],
    isLoading,
    error,
    filters,
    updateFilters,
    updateDealStatus,
    addDeal,
    refetch,
  };
};