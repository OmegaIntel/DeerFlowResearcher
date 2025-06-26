/**
 * Copilot Service for managing chat sessions and widget contexts
 */

import { api } from './api';

export const WidgetType = {
  COMPANY_PROFILE: 'company_profile',
  FINANCIAL_STATEMENTS: 'financial_statements',
  INCOME_STATEMENT: 'income_statement',
  BALANCE_SHEET: 'balance_sheet',
  CASH_FLOW: 'cash_flow',
  KEY_METRICS: 'key_metrics',
  VALUATION_MULTIPLES: 'valuation_multiples',
  PRICE_CHART: 'price_chart',
  REVENUE_ANALYSIS: 'revenue_analysis',
  OPTIONS_FLOW: 'options_flow',
  INSIDER_TRADING: 'insider_trading',
  INSTITUTIONAL_OWNERSHIP: 'institutional_ownership',
  NEWS: 'news',
  COMPANY_NEWS: 'company_news',
  MANAGEMENT_TEAM: 'management_team',
  PRICE_PERFORMANCE: 'price_performance',
  REVENUE_CHARTS: 'revenue_charts',
  REVENUE_GEOGRAPHY: 'revenue_geography',
  REVENUE_SEGMENT: 'revenue_segment',
  SHARE_STATISTICS: 'share_statistics',
  TICKER_INFO: 'ticker_info',
  COMPANY_FILINGS: 'company_filings',
  EARNINGS_TRANSCRIPTS: 'earnings_transcripts',
  MARKET_OVERVIEW: 'market_overview',
  PRICE_TARGET: 'price_target',
  CUSTOM: 'custom'
} as const;

export type WidgetType = typeof WidgetType[keyof typeof WidgetType];

export interface WidgetContext {
  widget_id: string;
  widget_type: WidgetType;
  ticker: string;
  title: string;
  data: Record<string, any>;
}

export interface ChatSession {
  session_id: string;
  created_at: string;
  message_count: number;
  context_count: number;
  active_ticker?: string;
  tickers: string[];
  widget_types: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

class CopilotService {
  private baseUrl = '/copilot';
  private currentSessionId: string | null = null;

  /**
   * Create a new chat session
   */
  async createSession(initialTicker?: string): Promise<string> {
    try {
      console.log('Creating copilot session with ticker:', initialTicker);
      const response = await api.post<{ session_id: string; created_at: string }>(`${this.baseUrl}/session`, {
        initial_ticker: initialTicker
      });
      
      console.log('Session creation response:', response);
      
      // The response is the unwrapped data from api.post
      if (response && response.session_id) {
        this.currentSessionId = response.session_id;
        console.log('Session created successfully:', response.session_id);
        return response.session_id;
      }
      
      throw new Error('Invalid response from server - missing session_id');
    } catch (error) {
      console.error('Error creating copilot session:', error);
      throw error;
    }
  }

  /**
   * Get current session ID or create new one
   */
  async getCurrentSessionId(): Promise<string> {
    if (!this.currentSessionId) {
      console.log('No current session, creating new one...');
      await this.createSession();
    }
    console.log('Current session ID:', this.currentSessionId);
    return this.currentSessionId!;
  }

  /**
   * Get session summary
   */
  async getSessionSummary(sessionId?: string): Promise<ChatSession> {
    const id = sessionId || await this.getCurrentSessionId();
    
    try {
      const response = await api.get<ChatSession>(`${this.baseUrl}/session/${id}`);
      return response;
    } catch (error) {
      console.error('Error getting session summary:', error);
      throw error;
    }
  }

  /**
   * Add widget context to the current session
   */
  async addWidgetContext(context: WidgetContext): Promise<void> {
    const sessionId = await this.getCurrentSessionId();
    
    try {
      await api.post(`${this.baseUrl}/context/add`, {
        session_id: sessionId,
        ...context
      });
    } catch (error) {
      console.error('Error adding widget context:', error);
      throw error;
    }
  }

  /**
   * Remove widget context from the current session
   */
  async removeWidgetContext(widgetId: string): Promise<void> {
    const sessionId = await this.getCurrentSessionId();
    
    try {
      await api.post(`${this.baseUrl}/context/remove`, {
        session_id: sessionId,
        widget_id: widgetId
      });
    } catch (error) {
      console.error('Error removing widget context:', error);
      throw error;
    }
  }

  /**
   * Send a chat message
   */
  async sendMessage(message: string, model?: string): Promise<string> {
    const sessionId = await this.getCurrentSessionId();
    
    try {
      console.log('Sending message with session:', sessionId, 'and model:', model);
      const response = await api.post<{ response: string; session_id: string; contexts_used: number }>(`${this.baseUrl}/chat`, {
        session_id: sessionId,
        message: message,
        model: model || 'O4-mini-high'
      });
      
      console.log('Chat response:', response);
      
      // Handle different response formats
      if (typeof response === 'string') {
        // If response is already a string, return it directly
        return response;
      } else if (response && typeof response.response === 'string') {
        // If response has a response property
        return response.response;
      } else if (response && typeof response === 'object') {
        // Log the unexpected format
        console.error('Unexpected response format:', response);
        throw new Error('Invalid response format from server: ' + JSON.stringify(response));
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get all contexts for the current session
   */
  async getContexts(): Promise<WidgetContext[]> {
    const sessionId = await this.getCurrentSessionId();
    
    try {
      const response = await api.get<{ contexts: WidgetContext[]; session_id: string; total: number }>(`${this.baseUrl}/contexts/${sessionId}`);
      return response.contexts;
    } catch (error) {
      console.error('Error getting contexts:', error);
      throw error;
    }
  }

  /**
   * Extract data from a widget for context
   */
  extractWidgetData(widgetType: WidgetType, widgetData: any, ticker: string): WidgetContext {
    // Generate unique widget ID
    const widgetId = `${widgetType}_${ticker}_${Date.now()}`;
    
    // Extract relevant data based on widget type
    let extractedData: Record<string, any> = {};
    let title = '';
    
    switch (widgetType) {
      case WidgetType.INCOME_STATEMENT:
        title = `Income Statement - ${ticker}`;
        extractedData = this.extractIncomeStatementData(widgetData);
        break;
        
      case WidgetType.BALANCE_SHEET:
        title = `Balance Sheet - ${ticker}`;
        extractedData = this.extractBalanceSheetData(widgetData);
        break;
        
      case WidgetType.CASH_FLOW:
        title = `Cash Flow - ${ticker}`;
        extractedData = this.extractCashFlowData(widgetData);
        break;
        
      case WidgetType.KEY_METRICS:
        title = `Key Metrics - ${ticker}`;
        extractedData = this.extractKeyMetricsData(widgetData);
        break;
        
      case WidgetType.VALUATION_MULTIPLES:
        title = `Valuation Multiples - ${ticker}`;
        extractedData = this.extractValuationData(widgetData);
        break;
        
      case WidgetType.OPTIONS_FLOW:
        title = `Options Flow - ${ticker}`;
        extractedData = this.extractOptionsFlowData(widgetData);
        break;
        
      case WidgetType.COMPANY_PROFILE:
        title = `Company Profile - ${ticker}`;
        extractedData = widgetData;
        break;
        
      case WidgetType.COMPANY_NEWS:
        title = `Company News - ${ticker}`;
        extractedData = this.extractNewsData(widgetData);
        break;
        
      case WidgetType.SHARE_STATISTICS:
        title = `Share Statistics - ${ticker}`;
        extractedData = widgetData;
        break;
        
      case WidgetType.MANAGEMENT_TEAM:
        title = `Management Team - ${ticker}`;
        // Wrap array data in object for backend compatibility
        extractedData = Array.isArray(widgetData) ? { team: widgetData } : widgetData;
        break;
        
      case WidgetType.INSIDER_TRADING:
        title = `Insider Trading - ${ticker}`;
        // Wrap array data in object for backend compatibility
        extractedData = Array.isArray(widgetData) ? { trades: widgetData } : widgetData;
        break;
        
      case WidgetType.INSTITUTIONAL_OWNERSHIP:
        title = `Institutional Ownership - ${ticker}`;
        // Wrap array data in object for backend compatibility
        extractedData = Array.isArray(widgetData) ? { holders: widgetData } : widgetData;
        break;
        
      case WidgetType.TICKER_INFO:
        title = `Ticker Information - ${ticker}`;
        extractedData = widgetData;
        break;
        
      case WidgetType.COMPANY_FILINGS:
        title = `Company Filings - ${ticker}`;
        extractedData = this.extractFilingsData(widgetData);
        break;
        
      case WidgetType.EARNINGS_TRANSCRIPTS:
        title = `Earnings Transcripts - ${ticker}`;
        extractedData = widgetData;
        break;
        
      default:
        title = `${widgetType} - ${ticker}`;
        extractedData = widgetData;
    }
    
    return {
      widget_id: widgetId,
      widget_type: widgetType,
      ticker: ticker,
      title: title,
      data: extractedData
    };
  }

  private extractIncomeStatementData(data: any): Record<string, any> {
    // Extract latest period data
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      return {
        period: latest.date || latest.period,
        revenue: latest.revenue || latest.totalRevenue,
        gross_profit: latest.grossProfit,
        operating_income: latest.operatingIncome,
        net_income: latest.netIncome,
        eps: latest.eps || latest.epsBasic,
        operating_expenses: latest.operatingExpenses,
        rd_expenses: latest.researchAndDevelopmentExpenses,
        historical_data: data.slice(0, 5) // Include last 5 periods
      };
    }
    return data;
  }

  private extractBalanceSheetData(data: any): Record<string, any> {
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      return {
        period: latest.date || latest.period,
        total_assets: latest.totalAssets,
        total_liabilities: latest.totalLiabilities,
        total_equity: latest.totalEquity || latest.totalStockholdersEquity,
        cash: latest.cashAndCashEquivalents,
        current_assets: latest.totalCurrentAssets,
        current_liabilities: latest.totalCurrentLiabilities,
        long_term_debt: latest.longTermDebt,
        historical_data: data.slice(0, 5)
      };
    }
    return data;
  }

  private extractCashFlowData(data: any): Record<string, any> {
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      return {
        period: latest.date || latest.period,
        operating_cash_flow: latest.operatingCashFlow,
        investing_cash_flow: latest.netCashUsedForInvestingActivites,
        financing_cash_flow: latest.netCashUsedProvidedByFinancingActivities,
        free_cash_flow: latest.freeCashFlow,
        capital_expenditures: latest.capitalExpenditure,
        historical_data: data.slice(0, 5)
      };
    }
    return data;
  }

  private extractKeyMetricsData(data: any): Record<string, any> {
    // Check if data is array of { label, value } objects (from KeyMetrics widget)
    if (Array.isArray(data) && data.length > 0 && data[0].label && data[0].value) {
      const extractedMetrics: Record<string, any> = {};
      data.forEach((metric: { label: string, value: string }) => {
        // Convert label to snake_case key
        const key = metric.label.toLowerCase().replace(/[\/\s]+/g, '_').replace(/[^a-z0-9_]/g, '');
        extractedMetrics[key] = metric.value;
      });
      return extractedMetrics;
    }
    
    // Otherwise handle raw metrics data
    if (data) {
      return {
        market_cap: data.marketCap || data.marketCapitalization,
        pe_ratio: data.peRatio || data.trailingPE,
        forward_pe: data.forwardPE,
        peg_ratio: data.pegRatio,
        dividend_yield: data.dividendYield,
        beta: data.beta,
        eps: data.eps,
        revenue_per_share: data.revenuePerShare,
        profit_margin: data.profitMargin,
        operating_margin: data.operatingMargin,
        roe: data.returnOnEquity || data.roe,
        roa: data.returnOnAssets || data.roa,
        roic: data.roic,
        debt_to_equity: data.debtToEquity,
        current_ratio: data.currentRatio,
        quick_ratio: data.quickRatio
      };
    }
    return data;
  }

  private extractValuationData(data: any): Record<string, any> {
    return {
      pe_ratio: data.peRatio || data.priceEarningsRatio,
      forward_pe: data.forwardPE || data.forwardPriceEarningsRatio,
      peg_ratio: data.pegRatio,
      price_to_book: data.priceToBookRatio || data.pbRatio,
      price_to_sales: data.priceToSalesRatio || data.psRatio,
      ev_to_ebitda: data.enterpriseValueToEbitda || data.evToEbitda,
      ev_to_revenue: data.enterpriseValueToRevenue || data.evToRevenue,
      price_to_fcf: data.priceToFreeCashFlowsRatio,
      market_cap: data.marketCap,
      enterprise_value: data.enterpriseValue
    };
  }

  private extractOptionsFlowData(data: any): Record<string, any> {
    if (Array.isArray(data)) {
      return {
        total_volume: data.reduce((sum, item) => sum + (item.volume || 0), 0),
        call_volume: data.filter(item => item.type === 'CALL').reduce((sum, item) => sum + item.volume, 0),
        put_volume: data.filter(item => item.type === 'PUT').reduce((sum, item) => sum + item.volume, 0),
        unusual_activity: data.filter(item => item.unusual || item.volume > 1000),
        large_trades: data.filter(item => item.premium > 100000),
        flow_data: data.slice(0, 20) // Include top 20 trades
      };
    }
    return data;
  }

  private extractNewsData(data: any): Record<string, any> {
    if (Array.isArray(data)) {
      return {
        total_articles: data.length,
        recent_news: data.slice(0, 5).map((article: any) => ({
          title: article.title,
          source: article.source,
          date: article.publishedDate || article.date,
          sentiment: article.sentiment
        }))
      };
    }
    return data;
  }

  private extractFilingsData(data: any): Record<string, any> {
    if (Array.isArray(data)) {
      return {
        total_filings: data.length,
        recent_filings: data.slice(0, 10).map((filing: any) => ({
          form_type: filing.formType || filing.form,
          filing_date: filing.filingDate || filing.date,
          acceptance_date: filing.acceptanceDate,
          url: filing.url
        }))
      };
    }
    return data;
  }
}

// Export singleton instance
export const copilotService = new CopilotService();