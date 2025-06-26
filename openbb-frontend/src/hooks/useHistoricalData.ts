import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export const useHistoricalData = (ticker: string, interval: string = '1d') => {
  return useQuery({
    queryKey: ['historical', ticker, interval],
    queryFn: async () => {
      const response = await api.getHistoricalPrice(ticker, undefined, undefined, interval);
      return response;
    },
    enabled: !!ticker,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 1 * 60 * 1000, // Refetch every minute
  });
};