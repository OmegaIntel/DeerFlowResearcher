const API_BASE_URL = import.meta.env.VITE_API_URL || '';

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
      const url = `${this.baseUrl}${endpoint}`;
      console.log('API Request:', { url, endpoint, baseUrl: this.baseUrl });
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const responseText = await response.text();
      console.log('API Response:', { status: response.status, text: responseText.substring(0, 200) });
      
      let data: ApiResponse<T>;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse API response:', e);
        throw new Error('Invalid JSON response from server');
      }

      if (!data.success) {
        console.error('API request failed:', { endpoint, error: data.error, fullResponse: data });
        throw new Error(data.error || 'API request failed');
      }

      console.log('API Success:', { endpoint, dataKeys: Object.keys(data.data || {}).slice(0, 5) });
      return data.data as T;
    } catch (error: any) {
      console.error('API Error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        endpoint: endpoint,
        options: options
      });
      throw error;
    }
  }

  // HTTP method helpers
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
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