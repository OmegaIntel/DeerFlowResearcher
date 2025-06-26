import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';

interface PriceTargetData {
  symbol: string;
  currentPrice: number;
  targetMean: number;
  targetMedian: number;
  targetHigh: number;
  targetLow: number;
  numberOfAnalysts: number;
  recommendation: string;
  provider: string;
}

export const usePriceTarget = (ticker: string) => {
  return useQuery<PriceTargetData>({
    queryKey: ['priceTarget', ticker],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/equity/estimates/price-target?symbol=${ticker}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Failed to fetch price target data');
    },
    enabled: !!ticker,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
  });
};