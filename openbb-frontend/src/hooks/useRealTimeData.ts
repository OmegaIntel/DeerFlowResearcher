import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import type { KeyMetric } from '../types';

// Hook for Company Profile (Ticker Profile)
export const useCompanyProfileRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['company-profile-rt', ticker],
    queryFn: async () => {
      const data: any = await api.getFundamentalOverview(ticker);
      // Transform API data to match CompanyProfile interface
      return {
        symbol: data.symbol,
        name: data.name,
        address: data.country, // FMP doesn't provide full address
        phone: '(408) 996-1010', // Default for now
        website: data.website,
        sector: data.sector,
        industry: data.industry,
        fullTimeEmployees: parseInt(data.employees) || 0,
        cik: data.cik || '0000320193', // Default if not provided
        isin: data.isin || 'US0378331005', // Default if not provided
        cusip: data.cusip || '037833100', // Default if not provided
        exchange: data.exchange,
        ipoDate: data.ipoDate || '1980-12-12', // Default if not provided
        description: data.description,
        ceo: data.ceo,
        marketCap: data.marketCap,
        price: data.price,
        beta: data.beta,
        country: data.country,
      };
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook for Key Metrics
export const useKeyMetricsRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['key-metrics-rt', ticker],
    queryFn: async () => {
      const metricsData: any = await api.getValuationMetrics(ticker, 'annual', 1, true);
      
      if (!metricsData || !Array.isArray(metricsData) || metricsData.length === 0) {
        return [];
      }
      
      const latestMetrics = metricsData[0];
      const metrics: KeyMetric[] = [];
      
      // Format market cap
      if (latestMetrics.marketCap) {
        const marketCapB = (latestMetrics.marketCap / 1e9).toFixed(2);
        metrics.push({ label: 'Market Cap', value: `$${marketCapB}B` });
      }
      
      // Format enterprise value
      if (latestMetrics.enterpriseValue) {
        const evB = (latestMetrics.enterpriseValue / 1e9).toFixed(2);
        metrics.push({ label: 'Enterprise Value', value: `$${evB}B` });
      }
      
      // P/E Ratio
      if (latestMetrics.peRatio) {
        metrics.push({ label: 'P/E Ratio', value: latestMetrics.peRatio.toFixed(2) });
      }
      
      // Price to Sales
      if (latestMetrics.priceToSalesRatio) {
        metrics.push({ label: 'P/S Ratio', value: latestMetrics.priceToSalesRatio.toFixed(2) });
      }
      
      // Price to Book
      if (latestMetrics.priceToBookRatio) {
        metrics.push({ label: 'P/B Ratio', value: latestMetrics.priceToBookRatio.toFixed(2) });
      }
      
      // EV/EBITDA
      if (latestMetrics.evToEbitda) {
        metrics.push({ label: 'EV/EBITDA', value: latestMetrics.evToEbitda.toFixed(2) });
      }
      
      // Debt to Equity
      if (latestMetrics.debtToEquity) {
        metrics.push({ label: 'Debt/Equity', value: latestMetrics.debtToEquity.toFixed(2) });
      }
      
      // Current Ratio
      if (latestMetrics.currentRatio) {
        metrics.push({ label: 'Current Ratio', value: latestMetrics.currentRatio.toFixed(2) });
      }
      
      // ROE
      if (latestMetrics.roe) {
        const roePercent = (latestMetrics.roe * 100).toFixed(1);
        metrics.push({ label: 'ROE', value: `${roePercent}%` });
      }
      
      return metrics;
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};

// Hook for Share Statistics
export const useShareStatisticsRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['share-stats-rt', ticker],
    queryFn: async () => {
      const data: any = await api.getShareStatistics(ticker);
      
      // Format the numbers
      const formatNumber = (num: number) => {
        if (num >= 1e9) return `${(num / 1e9).toFixed(3)} B`;
        if (num >= 1e6) return `${(num / 1e6).toFixed(3)} M`;
        return num.toLocaleString();
      };
      
      return {
        freeFloat: data.freeFloat ? `${data.freeFloat.toFixed(3)}` : 
                   (data.institutionalOwnership ? `${data.institutionalOwnership.toFixed(3)}` : 'N/A'),
        floatShares: formatNumber(data.sharesFloat || 0),
        outstandingShares: formatNumber(data.sharesOutstanding || 0),
        shortPercentOfFloat: data.shortPercentOfFloat ? `${data.shortPercentOfFloat.toFixed(2)}%` : 'N/A',
        institutionalOwnership: data.institutionalOwnership ? `${data.institutionalOwnership.toFixed(2)}%` : 'N/A',
        insiderOwnership: data.insiderOwnership ? `${data.insiderOwnership.toFixed(2)}%` : 'N/A',
        provider: data.provider,
      };
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
};