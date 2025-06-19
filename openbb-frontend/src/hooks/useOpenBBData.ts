/**
 * OpenBB Platform Data Hooks
 * 
 * These hooks provide access to OpenBB's enhanced data capabilities
 * with automatic fallback to existing providers.
 */

import { useQuery } from '@tanstack/react-query';
import { enhancedApi, openbbService, OPENBB_FEATURES } from '../services/openbb-api';
import { api } from '../services/api';

// Enhanced Company Profile Hook
export const useEnhancedCompanyProfile = (ticker: string) => {
  return useQuery({
    queryKey: ['enhanced-profile', ticker],
    queryFn: () => enhancedApi.getCompanyProfile(ticker),
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Enhanced Quote Hook with Real-time Updates
export const useEnhancedQuote = (ticker: string) => {
  return useQuery({
    queryKey: ['enhanced-quote', ticker],
    queryFn: () => enhancedApi.getQuote(ticker),
    enabled: !!ticker,
    staleTime: 30 * 1000, // 30 seconds for quotes
    refetchInterval: 30 * 1000,
  });
};

// Enhanced News Hook with Sentiment Analysis
export const useEnhancedNews = (ticker: string, limit: number = 20) => {
  return useQuery({
    queryKey: ['enhanced-news', ticker, limit],
    queryFn: () => enhancedApi.getCompanyNews(ticker, undefined, undefined, limit),
    enabled: !!ticker,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  });
};

// Technical Indicators Hook (OpenBB Exclusive)
export const useTechnicalIndicators = (ticker: string) => {
  return useQuery({
    queryKey: ['technical-indicators', ticker],
    queryFn: () => openbbService.getTechnicalIndicators(ticker),
    enabled: !!ticker && OPENBB_FEATURES.USE_OPENBB_TECHNICAL,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Options Chain Hook (OpenBB Exclusive)
export const useOptionsChain = (ticker: string) => {
  return useQuery({
    queryKey: ['options-chain', ticker],
    queryFn: () => openbbService.getOptionsChain(ticker),
    enabled: !!ticker && OPENBB_FEATURES.USE_OPENBB_OPTIONS,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Insider Trading Hook (OpenBB Exclusive)
export const useInsiderTrading = (ticker: string) => {
  return useQuery({
    queryKey: ['insider-trading', ticker],
    queryFn: () => openbbService.getInsiderTrading(ticker),
    enabled: !!ticker && OPENBB_FEATURES.USE_OPENBB_OWNERSHIP,
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000,
  });
};

// Institutional Ownership Hook (OpenBB Exclusive)
export const useInstitutionalOwnership = (ticker: string) => {
  return useQuery({
    queryKey: ['institutional-ownership', ticker],
    queryFn: () => openbbService.getInstitutionalOwnership(ticker),
    enabled: !!ticker && OPENBB_FEATURES.USE_OPENBB_OWNERSHIP,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
};

// Economic Calendar Hook (OpenBB Exclusive)
export const useEconomicCalendar = () => {
  return useQuery({
    queryKey: ['economic-calendar'],
    queryFn: () => openbbService.getEconomicCalendar(),
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
};

// Multi-Asset Hooks
export const useCryptoQuote = (symbol: string) => {
  return useQuery({
    queryKey: ['crypto-quote', symbol],
    queryFn: () => openbbService.getCryptoQuote(symbol),
    enabled: !!symbol,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
};

export const useForexQuote = (pair: string) => {
  return useQuery({
    queryKey: ['forex-quote', pair],
    queryFn: () => openbbService.getForexQuote(pair),
    enabled: !!pair,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
};

// ETF Holdings Hook
export const useETFHoldings = (symbol: string) => {
  return useQuery({
    queryKey: ['etf-holdings', symbol],
    queryFn: () => openbbService.getETFHoldings(symbol),
    enabled: !!symbol,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
  });
};

// Search Hook
export const useSecuritySearch = (query: string, assetClass: string = 'equity') => {
  return useQuery({
    queryKey: ['security-search', query, assetClass],
    queryFn: () => openbbService.searchSecurities(query, assetClass),
    enabled: !!query && query.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// OpenBB Health Check Hook
export const useOpenBBHealth = () => {
  return useQuery({
    queryKey: ['openbb-health'],
    queryFn: () => openbbService.checkHealth(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
};

// Historical Price Hook
export const useHistoricalPrice = (ticker: string, startDate?: string, endDate?: string, interval: string = '1d') => {
  return useQuery({
    queryKey: ['historical-price', ticker, startDate, endDate, interval],
    queryFn: () => api.getHistoricalPrice(ticker, startDate, endDate, interval),
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

// Fundamental Overview Hook
export const useFundamentalOverview = (ticker: string) => {
  return useQuery({
    queryKey: ['fundamental-overview', ticker],
    queryFn: () => api.getFundamentalOverview(ticker),
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};