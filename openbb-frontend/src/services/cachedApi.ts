/**
 * Cached API Service
 * Wraps all API calls with caching layer
 * Default TTL: 1 week (604800 seconds)
 */

import { api } from './api';
import cacheService from './cacheService';

const ONE_WEEK_IN_SECONDS = 604800; // 7 days
const ONE_DAY_IN_SECONDS = 86400;   // 1 day
const ONE_HOUR_IN_SECONDS = 3600;   // 1 hour

// Define cache TTLs for different data types
const CACHE_TTLS = {
  // Static data - cache for 1 week
  companyProfile: ONE_WEEK_IN_SECONDS,
  fundamentalOverview: ONE_WEEK_IN_SECONDS,
  managementTeam: ONE_WEEK_IN_SECONDS,
  
  // Semi-static data - cache for 1 day
  financialStatements: ONE_DAY_IN_SECONDS,
  keyMetrics: ONE_DAY_IN_SECONDS,
  valuationMetrics: ONE_DAY_IN_SECONDS,
  revenueGeography: ONE_DAY_IN_SECONDS,
  revenueSegment: ONE_DAY_IN_SECONDS,
  shareStatistics: ONE_DAY_IN_SECONDS,
  
  // Dynamic data - cache for 1 hour
  quote: ONE_HOUR_IN_SECONDS,
  historicalData: ONE_HOUR_IN_SECONDS,
  news: ONE_HOUR_IN_SECONDS,
  
  // Real-time data - short cache
  optionsFlow: 300, // 5 minutes
  priceTarget: 300, // 5 minutes
};

class CachedApiService {
  private async cachedRequest<T>(
    cacheKey: string,
    apiCall: () => Promise<T>,
    ttl: number = ONE_WEEK_IN_SECONDS
  ): Promise<T> {
    // Check cache first
    const cachedData = cacheService.get<T>(cacheKey);
    if (cachedData !== null) {
      console.log(`[Cache HIT] ${cacheKey}`);
      return cachedData;
    }

    console.log(`[Cache MISS] ${cacheKey} - Fetching from API`);
    
    try {
      // Make API call
      const data = await apiCall();
      
      // Cache the result
      cacheService.set(cacheKey, data, ttl);
      
      return data;
    } catch (error) {
      console.error(`API call failed for ${cacheKey}:`, error);
      throw error;
    }
  }

  // Company Profile / Overview
  async getCompanyProfile(symbol: string) {
    const cacheKey = cacheService.generateKey('company-profile', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getFundamentalOverview(symbol),
      CACHE_TTLS.companyProfile
    );
  }

  async getFundamentalOverview(symbol: string) {
    const cacheKey = cacheService.generateKey('fundamental-overview', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getFundamentalOverview(symbol),
      CACHE_TTLS.fundamentalOverview
    );
  }

  // Price & Quote Data
  async getQuote(symbol: string) {
    const cacheKey = cacheService.generateKey('quote', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.request(`/equity/price/quote?symbol=${symbol}`),
      CACHE_TTLS.quote
    );
  }

  async getHistoricalData(symbol: string, period: string = '1D', interval: string = '5m') {
    const cacheKey = cacheService.generateKey('historical', { symbol, period, interval });
    return this.cachedRequest(
      cacheKey,
      () => api.getHistoricalData(symbol, period, interval),
      CACHE_TTLS.historicalData
    );
  }

  // Financial Statements
  async getIncomeStatement(symbol: string, period: string = 'annual', limit: number = 12) {
    const cacheKey = cacheService.generateKey('income-statement', { symbol, period, limit });
    return this.cachedRequest(
      cacheKey,
      () => api.getIncomeStatement(symbol, period, limit),
      CACHE_TTLS.financialStatements
    );
  }

  async getBalanceSheet(symbol: string, period: string = 'annual', limit: number = 12) {
    const cacheKey = cacheService.generateKey('balance-sheet', { symbol, period, limit });
    return this.cachedRequest(
      cacheKey,
      () => api.getBalanceSheet(symbol, period, limit),
      CACHE_TTLS.financialStatements
    );
  }

  async getCashFlowStatement(symbol: string, period: string = 'annual', limit: number = 12) {
    const cacheKey = cacheService.generateKey('cash-flow', { symbol, period, limit });
    return this.cachedRequest(
      cacheKey,
      () => api.getCashFlowStatement(symbol, period, limit),
      CACHE_TTLS.financialStatements
    );
  }

  // Metrics & Valuation
  async getKeyMetrics(symbol: string, period: string = 'annual', limit: number = 12) {
    const cacheKey = cacheService.generateKey('key-metrics', { symbol, period, limit });
    return this.cachedRequest(
      cacheKey,
      () => api.getKeyMetrics(symbol, period, limit),
      CACHE_TTLS.keyMetrics
    );
  }

  async getValuationMetrics(symbol: string, period: string = 'annual', limit: number = 12, merge: boolean = false) {
    const cacheKey = cacheService.generateKey('valuation-metrics', { symbol, period, limit, merge });
    return this.cachedRequest(
      cacheKey,
      () => api.getValuationMetrics(symbol, period, limit, merge),
      CACHE_TTLS.valuationMetrics
    );
  }

  // Company Details
  async getShareStatistics(symbol: string) {
    const cacheKey = cacheService.generateKey('share-statistics', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getShareStatistics(symbol),
      CACHE_TTLS.shareStatistics
    );
  }

  async getManagementTeam(symbol: string) {
    const cacheKey = cacheService.generateKey('management-team', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getManagementTeam(symbol),
      CACHE_TTLS.managementTeam
    );
  }

  async getRevenueGeography(symbol: string, period: string = 'annual') {
    const cacheKey = cacheService.generateKey('revenue-geography', { symbol, period });
    return this.cachedRequest(
      cacheKey,
      () => api.getRevenueGeography(symbol, period),
      CACHE_TTLS.revenueGeography
    );
  }

  async getRevenueSegment(symbol: string, period: string = 'annual') {
    const cacheKey = cacheService.generateKey('revenue-segment', { symbol, period });
    return this.cachedRequest(
      cacheKey,
      () => api.getRevenueSegment(symbol, period),
      CACHE_TTLS.revenueSegment
    );
  }

  // News & Analysis
  async getCompanyNews(symbol: string, limit: number = 10) {
    const cacheKey = cacheService.generateKey('company-news', { symbol, limit });
    return this.cachedRequest(
      cacheKey,
      () => api.getCompanyNews(symbol, limit),
      CACHE_TTLS.news
    );
  }

  async getPriceTarget(symbol: string) {
    const cacheKey = cacheService.generateKey('price-target', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getPriceTarget(symbol),
      CACHE_TTLS.priceTarget
    );
  }

  // Options Flow
  async getOptionsFlow(symbol?: string) {
    const cacheKey = cacheService.generateKey('options-flow', { symbol: symbol || 'all' });
    return this.cachedRequest(
      cacheKey,
      () => api.getOptionsFlow(symbol),
      CACHE_TTLS.optionsFlow
    );
  }

  // Ownership Data
  async getInstitutionalOwnership(symbol: string) {
    const cacheKey = cacheService.generateKey('institutional-ownership', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getInstitutionalOwnership(symbol),
      ONE_DAY_IN_SECONDS
    );
  }

  async getInsiderTrading(symbol: string) {
    const cacheKey = cacheService.generateKey('insider-trading', { symbol });
    return this.cachedRequest(
      cacheKey,
      () => api.getInsiderTrading(symbol),
      ONE_DAY_IN_SECONDS
    );
  }

  // Market Overview
  async getMarketOverview() {
    const cacheKey = cacheService.generateKey('market-overview', {});
    return this.cachedRequest(
      cacheKey,
      () => api.getMarketOverview(),
      ONE_HOUR_IN_SECONDS
    );
  }

  // Historical Data
  async getHistoricalPrice(symbol: string, startDate: string, endDate: string, interval: string = '1d') {
    const cacheKey = cacheService.generateKey('historical-price', { symbol, startDate, endDate, interval });
    return this.cachedRequest(
      cacheKey,
      () => api.getHistoricalPrice(symbol, startDate, endDate, interval),
      CACHE_TTLS.historicalData
    );
  }

  // Earnings & Filings
  async getCompanyFilings(symbol: string, limit: number = 20) {
    const cacheKey = cacheService.generateKey('company-filings', { symbol, limit });
    return this.cachedRequest(
      cacheKey,
      () => api.getCompanyFilings(symbol, limit),
      ONE_DAY_IN_SECONDS
    );
  }

  async getEarningsTranscripts(symbol: string, year?: number, quarter?: number) {
    const cacheKey = cacheService.generateKey('earnings-transcripts', { symbol, year, quarter });
    return this.cachedRequest(
      cacheKey,
      () => api.getEarningsTranscripts(symbol, year, quarter),
      ONE_WEEK_IN_SECONDS
    );
  }

  // Generic API method for custom endpoints
  async get<T>(endpoint: string, options?: { ttl?: number }): Promise<T> {
    const cacheKey = cacheService.generateKey(endpoint, {});
    const ttl = options?.ttl || ONE_HOUR_IN_SECONDS;
    
    return this.cachedRequest(
      cacheKey,
      () => api.request<T>(`/${endpoint}`),
      ttl
    );
  }

  // Cache Management
  clearCache() {
    cacheService.clear();
    console.log('Cache cleared');
  }

  clearCacheForSymbol(symbol: string) {
    cacheService.clearByPattern(symbol);
    console.log(`Cache cleared for symbol: ${symbol}`);
  }

  getCacheStats() {
    return cacheService.getStats();
  }
}

// Export singleton instance
export const cachedApi = new CachedApiService();