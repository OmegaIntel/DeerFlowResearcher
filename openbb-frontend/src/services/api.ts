const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/v1`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data: ApiResponse<T> = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.data as T;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Equity endpoints
  async getHistoricalPrice(
    symbol: string,
    startDate?: string,
    endDate?: string,
    interval: string = '1d'
  ) {
    const params = new URLSearchParams({
      symbol,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      interval,
    });
    return this.request(`/equity/price/historical?${params}`);
  }

  async getFundamentalOverview(symbol: string) {
    return this.request(`/equity/fundamental/overview?symbol=${symbol}`);
  }

  async getShareStatistics(symbol: string) {
    return this.request(`/equity/ownership/share-statistics?symbol=${symbol}`);
  }

  async getManagementTeam(symbol: string) {
    return this.request(`/equity/fundamental/management?symbol=${symbol}`);
  }

  async getRevenueGeography(symbol: string, period: string = 'annual') {
    const params = new URLSearchParams({ symbol, period });
    return this.request(`/equity/fundamental/revenue-geography?${params}`);
  }

  async getRevenueSegment(symbol: string, period: string = 'annual') {
    const params = new URLSearchParams({ symbol, period });
    return this.request(`/equity/fundamental/revenue-segment?${params}`);
  }

  async getValuationMetrics(
    symbol: string,
    period: string = 'annual',
    limit: number = 100,
    withTtm: boolean = true
  ) {
    const params = new URLSearchParams({
      symbol,
      period,
      limit: limit.toString(),
      with_ttm: withTtm.toString(),
    });
    return this.request(`/equity/fundamental/metrics?${params}`);
  }

  async getCompanyFilings(symbol: string) {
    return this.request(`/equity/fundamental/filings?symbol=${symbol}`);
  }

  async getPriceTarget(symbol: string) {
    return this.request(`/equity/estimates/price-target?symbol=${symbol}`);
  }

  // News endpoints
  async getCompanyNews(
    symbol: string,
    startDate?: string,
    endDate?: string,
    limit: number = 50
  ) {
    const params = new URLSearchParams({
      symbol,
      ...(startDate && { start_date: startDate }),
      ...(endDate && { end_date: endDate }),
      limit: limit.toString(),
    });
    return this.request(`/news/company?${params}`);
  }

  // Financial Statements endpoints
  async getIncomeStatement(symbol: string, period: string = 'annual', limit: number = 10) {
    const params = new URLSearchParams({
      symbol,
      period,
      limit: limit.toString(),
    });
    return this.request(`/equity/fundamental/income-statement?${params}`);
  }

  async getBalanceSheet(symbol: string, period: string = 'annual', limit: number = 10) {
    const params = new URLSearchParams({
      symbol,
      period,
      limit: limit.toString(),
    });
    return this.request(`/equity/fundamental/balance-sheet?${params}`);
  }

  async getCashFlowStatement(symbol: string, period: string = 'annual', limit: number = 10) {
    const params = new URLSearchParams({
      symbol,
      period,
      limit: limit.toString(),
    });
    return this.request(`/equity/fundamental/cash-flow-statement?${params}`);
  }

  // ETF endpoints
  async getEtfInfo(symbol: string) {
    return this.request(`/etf/info?symbol=${symbol}`);
  }

  // Analyst ratings
  async getAnalystRatings(symbol: string, limit: number = 20) {
    const params = new URLSearchParams({
      symbol,
      limit: limit.toString(),
    });
    return this.request(`/equity/fundamental/analyst-ratings?${params}`);
  }

  // SEC filings
  async getSecFilings(symbol: string, limit: number = 100) {
    const params = new URLSearchParams({
      symbol,
      limit: limit.toString(),
    });
    return this.request(`/equity/fundamental/sec-filings?${params}`);
  }

  // Earnings transcript
  async getEarningsTranscript(symbol: string, year: number, quarter: number) {
    const params = new URLSearchParams({
      symbol,
      year: year.toString(),
      quarter: quarter.toString(),
      t: Date.now().toString(), // Cache bust
    });
    return this.request(`/equity/fundamental/earnings-transcript?${params}`);
  }

  // Earnings transcript dates
  async getEarningsTranscriptDates(symbol: string) {
    const params = new URLSearchParams({
      symbol,
      t: Date.now().toString(), // Cache bust
    });
    return this.request(`/equity/fundamental/earnings-transcript-dates?${params}`);
  }
}

export const api = new ApiService();