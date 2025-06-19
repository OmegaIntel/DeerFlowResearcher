import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// Hook for Management Team
export const useManagementTeamRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['management-team-rt', ticker],
    queryFn: async () => {
      const data = await api.getManagementTeam(ticker) as any[];
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Transform to match the expected format
      return data.map(exec => ({
        name: exec.name || 'N/A',
        title: exec.title || 'N/A',
        compensation: exec.pay || exec.compensation || 0,
        currency: exec.currencyPay || exec.currency || 'USD',
        yearBorn: exec.yearBorn,
        titleSince: exec.titleSince,
      }));
    },
    enabled: !!ticker,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook for Revenue Per Geography
export const useRevenueGeographyRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['revenue-geography-rt', ticker],
    queryFn: async () => {
      const data = await api.getRevenueGeography(ticker, 'annual') as any[];
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
      }
      
      // Transform FMP data to match expected format
      // FMP returns data like: { date, segments: { region: value } }
      return data.slice(0, 5).map(item => {
        const segments: { [key: string]: number } = {};
        
        // FMP might return data in different formats, handle both
        if (item.segments) {
          Object.entries(item.segments).forEach(([key, value]) => {
            segments[key] = Number(value) || 0;
          });
        } else {
          // Alternative format where regions are direct properties
          Object.entries(item).forEach(([key, value]) => {
            if (key !== 'date' && key !== 'symbol' && key !== 'period') {
              segments[key] = Number(value) || 0;
            }
          });
        }
        
        return {
          date: item.date,
          segments,
        };
      });
    },
    enabled: !!ticker,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook for Revenue Per Business Line
export const useRevenueBusinessLineRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['revenue-business-line-rt', ticker],
    queryFn: async () => {
      const data = await api.getRevenueSegment(ticker, 'annual') as any[];
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
      }
      
      // Transform FMP data to match expected format
      return data.slice(0, 5).map(item => {
        const segments: { [key: string]: number } = {};
        
        // FMP might return data in different formats, handle both
        if (item.segments) {
          Object.entries(item.segments).forEach(([key, value]) => {
            segments[key] = Number(value) || 0;
          });
        } else {
          // Alternative format where products are direct properties
          Object.entries(item).forEach(([key, value]) => {
            if (key !== 'date' && key !== 'symbol' && key !== 'period') {
              segments[key] = Number(value) || 0;
            }
          });
        }
        
        return {
          date: item.date,
          segments,
        };
      });
    },
    enabled: !!ticker,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook for Valuation Multiples with period support
export const useValuationMultiplesRealTime = (ticker: string, period: 'annual' | 'quarter' | 'ttm' = 'annual') => {
  return useQuery({
    queryKey: ['valuation-multiples-rt', ticker, period],
    queryFn: async () => {
      // Adjust parameters based on period
      let apiPeriod = period === 'quarter' ? 'quarter' : 'annual';
      let limit = period === 'quarter' ? 20 : 10; // Get 20 quarters (5 years) or 10 years
      let withTtm = period === 'ttm';
      
      const data = await api.getValuationMetrics(ticker, apiPeriod, limit, withTtm) as any[];
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
      }
      
      // For TTM, filter to only show TTM data
      if (period === 'ttm' && data.length > 0) {
        const ttmData = data.filter(item => item.period === 'TTM');
        if (ttmData.length === 0 && data.length > 0) {
          // If no TTM data, use the most recent data point
          return [data[0]];
        }
        return ttmData;
      }
      
      // Transform to match expected format
      return data.map(item => ({
        date: item.date,
        period: item.period,
        peRatio: item.peRatio || item.trailingPE || 0,
        psRatio: item.priceToSalesRatio || item.priceToSales || 0,
        pbRatio: item.priceToBookRatio || item.priceToBook || 0,
        evSales: item.evToSales || item.enterpriseValueToSales || 0,
        evEbitda: item.evToEbitda || item.enterpriseValueToEbitda || 0,
        dividendYield: item.dividendYield || 0,
      }));
    },
    enabled: !!ticker,
    staleTime: 10 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

// Hook for Company News with more articles
export const useCompanyNewsExtended = (ticker: string, limit: number = 15) => {
  return useQuery({
    queryKey: ['company-news-extended', ticker, limit],
    queryFn: async () => {
      // Get news from the last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const newsData = await api.getCompanyNews(ticker, startDate, endDate, limit) as any[];
      
      if (!newsData || !Array.isArray(newsData)) {
        return [];
      }
      
      // Filter out articles without proper titles and transform data
      return newsData
        .filter((item) => {
          // Only include articles that have a valid title
          const hasValidTitle = item.title && 
                               typeof item.title === 'string' && 
                               item.title.trim() !== '' &&
                               item.title.trim() !== 'Untitled Article' &&
                               item.title.trim() !== 'null' &&
                               item.title.trim() !== 'undefined';
          return hasValidTitle;
        })
        .map((item, index) => {
          const publishedDate = new Date(item.published || item.date || new Date());
          
          return {
            id: item.id || `news-${index}`,
            title: item.title.trim(),
            url: item.url || '#',
            published: item.published || publishedDate.toISOString(),
            date: publishedDate.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            }),
            time: publishedDate.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            source: item.source || 'Unknown Source',
            summary: item.summary || '',
            provider: item.provider || 'N/A',
            relatedTickers: item.tickers || item.stocks || [ticker],
          };
        });
    },
    enabled: !!ticker,
    staleTime: 2 * 60 * 1000, // 2 minutes for news
    refetchInterval: 2 * 60 * 1000,
  });
};

// Hook for Financial Statements
export const useFinancialStatementsRealTime = (ticker: string, statementType: 'income' | 'balance' | 'cashflow', period: 'annual' | 'quarter' = 'annual') => {
  return useQuery({
    queryKey: ['financial-statements', ticker, statementType, period],
    queryFn: async () => {
      let data;
      // For quarterly data, request 40 quarters (10 years), for annual request 10 years
      const limit = period === 'quarter' ? 40 : 10;
      
      switch (statementType) {
        case 'income':
          data = await api.getIncomeStatement(ticker, period, limit);
          break;
        case 'balance':
          data = await api.getBalanceSheet(ticker, period, limit);
          break;
        case 'cashflow':
          data = await api.getCashFlowStatement(ticker, period, limit);
          break;
        default:
          data = [];
      }
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      return data;
    },
    enabled: !!ticker,
    staleTime: 10 * 60 * 1000, // 10 minutes for financial data
    refetchInterval: 10 * 60 * 1000,
    retry: 1, // Only retry once
    retryDelay: 1000, // 1 second retry delay
  });
};

// Hook for SEC Filings
export const useSECFilingsRealTime = (ticker: string, period: 'annual' | 'quarter' = 'annual') => {
  return useQuery({
    queryKey: ['sec-filings', ticker, period],
    queryFn: async () => {
      const data = await api.getCompanyFilings(ticker);
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      // Filter for 10-K (annual) or 10-Q (quarterly) filings
      const targetType = period === 'annual' ? '10-K' : '10-Q';
      const filteredFilings = data.filter(filing => filing.type === targetType);
      
      // Return the most recent filings (limit to 5)
      return filteredFilings.slice(0, 5);
    },
    enabled: !!ticker,
    staleTime: 60 * 60 * 1000, // 1 hour for filing data
    retry: 1,
    retryDelay: 1000,
  });
};

// Hook for Analyst Ratings
export const useAnalystRatingsRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['analyst-ratings', ticker],
    queryFn: async () => {
      const data = await api.getAnalystRatings(ticker, 20) as any[];
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      return data;
    },
    enabled: !!ticker,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
};

// Hook for SEC Filings
export const useSecFilingsRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['sec-filings', ticker],
    queryFn: async () => {
      const data = await api.getSecFilings(ticker, 100) as any[];
      
      if (!data || !Array.isArray(data)) {
        return [];
      }
      
      return data;
    },
    enabled: !!ticker,
    staleTime: 60 * 60 * 1000, // 1 hour for filing data
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
    retryDelay: 1000,
  });
};

// Hook for Earnings Transcript
export const useEarningsTranscriptRealTime = (ticker: string, year: number, quarter: number) => {
  return useQuery({
    queryKey: ['earnings-transcript-v3', ticker, year, quarter],
    queryFn: async () => {
      const response = await api.getEarningsTranscript(ticker, year, quarter);
      return response;
    },
    enabled: !!ticker && !!year && !!quarter,
    staleTime: 1 * 60 * 1000, // 1 minute cache
    retry: 1,
    retryDelay: 1000,
  });
};

// Hook for Earnings Transcript Dates
export const useEarningsTranscriptDatesRealTime = (ticker: string) => {
  return useQuery({
    queryKey: ['earnings-transcript-dates-v3', ticker],
    queryFn: async () => {
      const response = await api.getEarningsTranscriptDates(ticker);
      return Array.isArray(response) ? response : [];
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1,
    retryDelay: 1000,
  });
};