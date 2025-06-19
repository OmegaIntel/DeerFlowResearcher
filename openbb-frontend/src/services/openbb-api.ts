/**
 * OpenBB Platform API Service
 * 
 * This service provides access to OpenBB's comprehensive functionality
 * while maintaining compatibility with existing components.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const openbbApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1/openbb`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
openbbApi.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('OpenBB API Error:', error);
    // Fallback to existing API if OpenBB fails
    return Promise.reject(error);
  }
);

export const openbbService = {
  // Company Information
  async getCompanyProfile(symbol: string) {
    const response = await openbbApi.get(`/profile/${symbol}`);
    return response.data;
  },

  async getExecutives(symbol: string) {
    const response = await openbbApi.get(`/executives/${symbol}`);
    return response.data;
  },

  // Market Data
  async getQuote(symbol: string) {
    const response = await openbbApi.get(`/quote/${symbol}`);
    return response.data;
  },

  async getHistoricalData(
    symbol: string,
    startDate?: string,
    endDate?: string,
    interval: string = '1d'
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('interval', interval);

    const response = await openbbApi.get(`/historical/${symbol}?${params}`);
    return response.data;
  },

  // Financial Data
  async getFinancialMetrics(symbol: string) {
    const response = await openbbApi.get(`/metrics/${symbol}`);
    return response.data;
  },

  // News
  async getCompanyNews(
    symbol: string,
    startDate?: string,
    endDate?: string,
    limit: number = 20
  ) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('limit', limit.toString());

    const response = await openbbApi.get(`/news/${symbol}?${params}`);
    return response.data;
  },

  // Technical Analysis
  async getTechnicalIndicators(symbol: string) {
    const response = await openbbApi.get(`/technical/${symbol}`);
    return response.data;
  },

  // Multi-Asset Support
  async getCryptoQuote(symbol: string) {
    const response = await openbbApi.get(`/crypto/${symbol}`);
    return response.data;
  },

  async getForexQuote(pair: string) {
    const response = await openbbApi.get(`/forex/${pair}`);
    return response.data;
  },

  // Economic Data
  async getEconomicCalendar(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await openbbApi.get(`/economy/calendar?${params}`);
    return response.data;
  },

  // ETF Data
  async getETFHoldings(symbol: string) {
    const response = await openbbApi.get(`/etf/holdings/${symbol}`);
    return response.data;
  },

  // Advanced Analytics
  async getOptionsChain(symbol: string) {
    const response = await openbbApi.get(`/options/${symbol}`);
    return response.data;
  },

  async getInsiderTrading(symbol: string) {
    const response = await openbbApi.get(`/insider/${symbol}`);
    return response.data;
  },

  async getInstitutionalOwnership(symbol: string) {
    const response = await openbbApi.get(`/institutional/${symbol}`);
    return response.data;
  },

  // Search
  async searchSecurities(query: string, assetClass: string = 'equity') {
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('asset_class', assetClass);

    const response = await openbbApi.get(`/search?${params}`);
    return response.data;
  },

  // Health Check
  async checkHealth() {
    const response = await openbbApi.get('/health');
    return response.data;
  },
};

// Feature flags for gradual migration
export const OPENBB_FEATURES = {
  USE_OPENBB_QUOTES: true,
  USE_OPENBB_PROFILE: true,
  USE_OPENBB_NEWS: true,
  USE_OPENBB_METRICS: true,
  USE_OPENBB_TECHNICAL: false,
  USE_OPENBB_OPTIONS: false,
  USE_OPENBB_OWNERSHIP: false,
};

// Enhanced API service that falls back to existing providers
export const enhancedApi = {
  async getCompanyProfile(symbol: string) {
    if (OPENBB_FEATURES.USE_OPENBB_PROFILE) {
      try {
        return await openbbService.getCompanyProfile(symbol);
      } catch (error) {
        console.warn('OpenBB profile failed, falling back to existing API');
      }
    }
    // Fallback to existing API
    const { api } = await import('./api');
    return api.getFundamentalOverview(symbol);
  },

  async getQuote(symbol: string) {
    if (OPENBB_FEATURES.USE_OPENBB_QUOTES) {
      try {
        return await openbbService.getQuote(symbol);
      } catch (error) {
        console.warn('OpenBB quote failed, falling back to existing API');
      }
    }
    // Fallback to existing API - get latest price from historical data
    const { api } = await import('./api');
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const historicalData = await api.getHistoricalPrice(symbol, startDate, endDate, '1d');
    
    // Transform historical data to quote format
    // Check if historicalData is an array or has a data property
    const dataArray = Array.isArray(historicalData) ? historicalData : (historicalData as any)?.data;
    
    if (dataArray && dataArray.length > 0) {
      const latest = dataArray[dataArray.length - 1];
      const previous = dataArray.length > 1 ? dataArray[dataArray.length - 2] : latest;
      
      return {
        symbol,
        price: latest.close,
        change: latest.close - previous.close,
        changePercent: ((latest.close - previous.close) / previous.close) * 100,
        volume: latest.volume,
        high: latest.high,
        low: latest.low,
        open: latest.open,
        previousClose: previous.close,
      };
    }
    
    throw new Error('No price data available');
  },

  async getCompanyNews(symbol: string, startDate?: string, endDate?: string, limit?: number) {
    if (OPENBB_FEATURES.USE_OPENBB_NEWS) {
      try {
        return await openbbService.getCompanyNews(symbol, startDate, endDate, limit);
      } catch (error) {
        console.warn('OpenBB news failed, falling back to existing API');
      }
    }
    // Fallback to existing API
    const { api } = await import('./api');
    return api.getCompanyNews(symbol, startDate || '', endDate || '', limit || 10);
  },

  async getFinancialMetrics(symbol: string) {
    if (OPENBB_FEATURES.USE_OPENBB_METRICS) {
      try {
        return await openbbService.getFinancialMetrics(symbol);
      } catch (error) {
        console.warn('OpenBB metrics failed, falling back to existing API');
      }
    }
    // Fallback to existing API
    const { api } = await import('./api');
    return api.getValuationMetrics(symbol, 'annual', 10, true);
  },
};