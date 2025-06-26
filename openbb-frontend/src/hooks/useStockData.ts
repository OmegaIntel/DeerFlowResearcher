import { useQuery } from '@tanstack/react-query';
import { 
  fetchStockData, 
  fetchCompanyProfile, 
  fetchNews, 
  fetchManagement,
  fetchKeyMetrics,
  fetchShareStatistics 
} from '../services/mockData';

export const useStockData = (ticker: string) => {
  return useQuery({
    queryKey: ['stock', ticker],
    queryFn: () => fetchStockData(ticker),
    enabled: !!ticker,
  });
};

export const useCompanyProfile = (ticker: string) => {
  return useQuery({
    queryKey: ['profile', ticker],
    queryFn: () => fetchCompanyProfile(ticker),
    enabled: !!ticker,
  });
};

export const useCompanyNews = (ticker: string) => {
  return useQuery({
    queryKey: ['news', ticker],
    queryFn: () => fetchNews(ticker),
    enabled: !!ticker,
  });
};

export const useManagement = (ticker: string) => {
  return useQuery({
    queryKey: ['management', ticker],
    queryFn: () => fetchManagement(ticker),
    enabled: !!ticker,
  });
};

export const useKeyMetrics = (ticker: string) => {
  return useQuery({
    queryKey: ['metrics', ticker],
    queryFn: () => fetchKeyMetrics(ticker),
    enabled: !!ticker,
  });
};

export const useShareStatistics = (ticker: string) => {
  return useQuery({
    queryKey: ['shares', ticker],
    queryFn: () => fetchShareStatistics(ticker),
    enabled: !!ticker,
  });
};

export const useHistoricalData = (ticker: string) => {
  return useQuery({
    queryKey: ['historical', ticker],
    queryFn: () => fetchStockData(ticker), // Using stock data as historical for now
    enabled: !!ticker,
  });
};