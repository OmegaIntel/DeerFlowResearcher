import axios from 'axios';
import { withCache } from './cacheService';

const API_URL = import.meta.env.VITE_API_URL || '';

interface InstitutionalOwnershipData {
  date: string;
  investorsHolding: number;
  sharesHeld: number;
  marketValue: number;
  reportedHoldingPercent: number;
  newPositions?: number;
  increasedPositions?: number;
  closedPositions?: number;
  reducedPositions?: number;
  totalCalls?: number;
  totalPuts?: number;
  putCallRatio?: number;
}

interface StockOwnershipData {
  investorName: string;
  sharesHeld: number;
  changeInShares: number;
  percentageChange: number;
  marketValue: number;
  reportDate: string;
  filingDate: string;
  portfolioPercent?: number;
  investmentDiscretion?: string;
}

interface InsiderTradingData {
  filingDate: string;
  transactionDate: string;
  reportingName: string;
  transactionType: string;
  securitiesOwned: number;
  securitiesTransacted: number;
  price?: number;
  securityName: string;
}

class OwnershipService {
  /**
   * Fetch institutional ownership data
   */
  async getInstitutionalOwnership(ticker: string): Promise<InstitutionalOwnershipData[]> {
    try {
      // Try FMP first
      const response = await axios.get(`${API_URL}/api/v1/equity/ownership/institutional`, {
        params: { symbol: ticker, provider: 'fmp' }
      });

      if (response.data && response.data.length > 0) {
        return this.transformInstitutionalData(response.data);
      }

      // Fallback to Yahoo Finance if FMP fails
      const yahooResponse = await axios.get(`${API_URL}/api/v1/equity/ownership/institutional`, {
        params: { symbol: ticker, provider: 'yahoo' }
      });

      return this.transformInstitutionalDataYahoo(yahooResponse.data);
    } catch (error) {
      console.error('Error fetching institutional ownership:', error);
      // Return mock data as fallback
      return this.getMockInstitutionalData();
    }
  }

  /**
   * Fetch major holders/stock ownership data
   */
  async getStockOwnership(ticker: string): Promise<StockOwnershipData[]> {
    try {
      // Try FMP institutional holders endpoint
      const response = await axios.get(`${API_URL}/api/v1/equity/ownership/holders`, {
        params: { symbol: ticker, provider: 'fmp' }
      });

      if (response.data && response.data.length > 0) {
        return this.transformHoldersData(response.data);
      }

      // Fallback to Yahoo Finance
      const yahooResponse = await axios.get(`${API_URL}/api/v1/equity/ownership/holders`, {
        params: { symbol: ticker, provider: 'yahoo' }
      });

      return this.transformHoldersDataYahoo(yahooResponse.data);
    } catch (error) {
      console.error('Error fetching stock ownership:', error);
      return this.getMockStockOwnershipData();
    }
  }

  /**
   * Fetch insider trading data
   */
  async getInsiderTrading(ticker: string): Promise<InsiderTradingData[]> {
    try {
      const response = await axios.get(`${API_URL}/api/v1/equity/ownership/insider-trading`, {
        params: { symbol: ticker }
      });

      return this.transformInsiderData(response.data);
    } catch (error) {
      console.error('Error fetching insider trading:', error);
      return [];
    }
  }

  /**
   * Transform FMP institutional data
   */
  private transformInstitutionalData(data: any[]): InstitutionalOwnershipData[] {
    const grouped = data.reduce((acc, curr) => {
      const quarter = this.getQuarterFromDate(curr.dateReported);
      if (!acc[quarter]) {
        acc[quarter] = {
          date: curr.dateReported,
          investorsHolding: 0,
          sharesHeld: 0,
          marketValue: 0,
          reportedHoldingPercent: 0,
          newPositions: 0,
          increasedPositions: 0,
          closedPositions: 0,
          reducedPositions: 0
        };
      }

      acc[quarter].investorsHolding++;
      acc[quarter].sharesHeld += curr.shares || 0;
      acc[quarter].marketValue += curr.marketValue || 0;
      
      // Track position changes
      if (curr.change > 0 && curr.previousShares === 0) {
        acc[quarter].newPositions++;
      } else if (curr.change > 0) {
        acc[quarter].increasedPositions++;
      } else if (curr.shares === 0 && curr.previousShares > 0) {
        acc[quarter].closedPositions++;
      } else if (curr.change < 0) {
        acc[quarter].reducedPositions++;
      }

      return acc;
    }, {} as Record<string, InstitutionalOwnershipData>);

    return Object.values(grouped).sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  /**
   * Transform Yahoo institutional data
   */
  private transformInstitutionalDataYahoo(data: any): InstitutionalOwnershipData[] {
    if (!data || !data.institutionalHolders) return [];

    const holders = data.institutionalHolders;
    const totalShares = holders.reduce((sum: number, h: any) => sum + (h.shares || 0), 0);
    const totalValue = holders.reduce((sum: number, h: any) => sum + (h.value || 0), 0);

    return [{
      date: new Date().toISOString().split('T')[0],
      investorsHolding: holders.length,
      sharesHeld: totalShares,
      marketValue: totalValue,
      reportedHoldingPercent: (totalShares / data.sharesOutstanding) * 100 || 0
    }];
  }

  /**
   * Transform FMP holders data
   */
  private transformHoldersData(data: any[]): StockOwnershipData[] {
    return data.map(holder => ({
      investorName: holder.holder,
      sharesHeld: holder.shares,
      changeInShares: holder.change || 0,
      percentageChange: holder.changePercentage || 0,
      marketValue: holder.marketValue || holder.shares * holder.price || 0,
      reportDate: holder.dateReported,
      filingDate: holder.dateReported,
      portfolioPercent: holder.weightPercent || 0,
      investmentDiscretion: this.determineInvestmentDiscretion(holder)
    }));
  }

  /**
   * Transform Yahoo holders data
   */
  private transformHoldersDataYahoo(data: any): StockOwnershipData[] {
    if (!data || !data.institutionalHolders) return [];

    return data.institutionalHolders.map((holder: any) => ({
      investorName: holder.holder,
      sharesHeld: holder.shares,
      changeInShares: 0, // Yahoo doesn't provide change data
      percentageChange: 0,
      marketValue: holder.value || 0,
      reportDate: holder.dateReported || new Date().toISOString().split('T')[0],
      filingDate: holder.dateReported || new Date().toISOString().split('T')[0],
      portfolioPercent: holder.pctHeld || 0
    }));
  }

  /**
   * Transform insider trading data
   */
  private transformInsiderData(data: any[]): InsiderTradingData[] {
    return data.map(trade => ({
      filingDate: trade.filingDate,
      transactionDate: trade.transactionDate,
      reportingName: trade.reportingName || trade.insiderName,
      transactionType: trade.transactionType || trade.acquistionOrDisposition,
      securitiesOwned: trade.securitiesOwned || trade.sharesOwned,
      securitiesTransacted: trade.securitiesTransacted || trade.shares,
      price: trade.price,
      securityName: trade.securityName || trade.symbol
    }));
  }

  /**
   * Helper function to get quarter from date
   */
  private getQuarterFromDate(dateStr: string): string {
    const date = new Date(dateStr);
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    return `${date.getFullYear()}-Q${quarter}`;
  }

  /**
   * Determine investment discretion type
   */
  private determineInvestmentDiscretion(holder: any): string {
    if (holder.investmentDiscretion) return holder.investmentDiscretion;
    
    // Logic to determine based on holder type
    if (holder.type === 'sole') return 'SOLE';
    if (holder.type === 'shared') return 'SHRD';
    if (holder.type === 'defined') return 'DFND';
    
    return 'OTR'; // Other
  }

  /**
   * Get mock institutional data for fallback
   */
  private getMockInstitutionalData(): InstitutionalOwnershipData[] {
    const currentQuarter = this.getCurrentQuarter();
    const pastQuarter = this.getPastQuarter();

    return [
      {
        date: currentQuarter,
        investorsHolding: 5709,
        sharesHeld: 9410000000,
        marketValue: 2030000000000,
        reportedHoldingPercent: 61.00,
        newPositions: 158,
        increasedPositions: 2149,
        closedPositions: 271,
        reducedPositions: 3034,
        totalCalls: 163350000,
        totalPuts: 153760000,
        putCallRatio: 0.94
      },
      {
        date: pastQuarter,
        investorsHolding: 5815,
        sharesHeld: 9110000000,
        marketValue: 2350000000000,
        reportedHoldingPercent: 62.42,
        newPositions: 716,
        increasedPositions: 2702,
        closedPositions: 197,
        reducedPositions: 2588,
        totalCalls: 206240000,
        totalPuts: 249680000,
        putCallRatio: 1.21
      }
    ];
  }

  /**
   * Get mock stock ownership data for fallback
   */
  private getMockStockOwnershipData(): StockOwnershipData[] {
    return [
      {
        investorName: 'Vanguard Group Inc',
        sharesHeld: 1328380000,
        changeInShares: 15234000,
        percentageChange: 1.16,
        marketValue: 332950000000,
        reportDate: '2025-03-31',
        filingDate: '2025-04-15',
        portfolioPercent: 8.45,
        investmentDiscretion: 'SOLE'
      },
      {
        investorName: 'BlackRock Inc',
        sharesHeld: 1089560000,
        changeInShares: -8976000,
        percentageChange: -0.82,
        marketValue: 273140000000,
        reportDate: '2025-03-31',
        filingDate: '2025-04-15',
        portfolioPercent: 6.93,
        investmentDiscretion: 'SOLE'
      }
    ];
  }

  private getCurrentQuarter(): string {
    const now = new Date();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${quarter}`;
  }

  private getPastQuarter(): string {
    const now = new Date();
    now.setMonth(now.getMonth() - 3);
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    return `${now.getFullYear()}-Q${quarter}`;
  }
}

// Create cached versions of the methods
const ownershipService = new OwnershipService();

export const getInstitutionalOwnership = withCache(
  ownershipService.getInstitutionalOwnership.bind(ownershipService),
  (ticker: string) => `institutional-ownership-${ticker}`,
  86400 // 24 hour cache
);

export const getStockOwnership = withCache(
  ownershipService.getStockOwnership.bind(ownershipService),
  (ticker: string) => `stock-ownership-${ticker}`,
  86400 // 24 hour cache
);

export const getInsiderTrading = withCache(
  ownershipService.getInsiderTrading.bind(ownershipService),
  (ticker: string) => `insider-trading-${ticker}`,
  3600 // 1 hour cache
);

export default ownershipService;