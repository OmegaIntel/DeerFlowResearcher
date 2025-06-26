import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : '/api/v1';

interface PricePerformanceData {
  currentPrice: number;
  currency: string;
  volume: number;
  performance: {
    '1D': number | null;
    '5D': number | null;
    '1W': number | null;
    '1M': number | null;
    '3M': number | null;
    '6M': number | null;
    'YTD': number | null;
    '1Y': number | null;
    '3Y': number | null;
    '5Y': number | null;
  };
  yearHigh: number;
  yearLow: number;
  peRatio?: number | null;
  marketCap?: number;
  averageVolume?: number;
  provider?: string;
}

export const usePricePerformance = (ticker: string) => {
  return useQuery<PricePerformanceData>({
    queryKey: ['pricePerformance', ticker],
    queryFn: async () => {
      const response = await axios.get(`${API_BASE_URL}/equity/price/performance?symbol=${ticker}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      throw new Error('Failed to fetch price performance data');
    },
    enabled: !!ticker,
    refetchInterval: 300000, // Refetch every 5 minutes
    staleTime: 240000, // Consider data stale after 4 minutes
  });
};