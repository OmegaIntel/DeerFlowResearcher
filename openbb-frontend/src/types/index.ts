export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  yearHigh: number;
  yearLow: number;
  peRatio: number;
  divYield: number;
  beta: number;
  avgVolume: number;
  range: string;
  industry: string;
  exchange: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  address: string;
  phone: string;
  website: string;
  sector: string;
  industry: string;
  fullTimeEmployees: number;
  cik: string;
  isin: string;
  cusip: string;
  exchange: string;
  ipoDate: string;
  description: string;
}

export interface NewsItem {
  id: string;
  title: string;
  date: string;
  time: string;
  relatedTickers: string[];
  tickerChanges: { [key: string]: number };
}

export interface ManagementMember {
  name: string;
  title: string;
  compensation: string;
  currency: string;
}

export interface KeyMetric {
  label: string;
  value: string | number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
    fill?: boolean;
  }[];
}

export interface RevenueData {
  date: string;
  segments: { [key: string]: number };
}

export interface ValuationMultiple {
  date: string;
  peRatio: number;
  psRatio: number;
  pbRatio: number;
  evSales: number;
  evEbitda: number;
  dividendYield?: number;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}