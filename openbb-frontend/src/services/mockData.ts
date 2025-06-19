import type { 
  Stock, 
  CompanyProfile, 
  NewsItem, 
  ManagementMember, 
  KeyMetric,
  RevenueData,
  ValuationMultiple 
} from '../types';

export const mockStockData: { [key: string]: Stock } = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 197.65,
    change: -0.85,
    changePercent: -0.43,
    volume: 9184000,
    marketCap: 2948000000000,
    dayHigh: 197.91,
    dayLow: 196.25,
    yearHigh: 260.10,
    yearLow: 169.21,
    peRatio: 30.42,
    divYield: 0.51,
    beta: 1.21,
    avgVolume: 61133000,
    range: '196.25 - 197.91',
    industry: 'Consumer Electronics',
    exchange: 'NASDAQ',
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 415.32,
    change: -2.76,
    changePercent: -0.66,
    volume: 18542000,
    marketCap: 3089000000000,
    dayHigh: 418.23,
    dayLow: 414.85,
    yearHigh: 468.35,
    yearLow: 362.90,
    peRatio: 35.8,
    divYield: 0.72,
    beta: 0.93,
    avgVolume: 23456000,
    range: '414.85 - 418.23',
    industry: 'Software',
    exchange: 'NASDAQ',
  },
};

export const mockCompanyProfile: { [key: string]: CompanyProfile } = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    address: 'One Apple Park Way',
    phone: '(408) 996-1010',
    website: 'https://www.apple.com',
    sector: 'Technology',
    industry: 'Consumer Electronics',
    fullTimeEmployees: 164000,
    cik: '0000320193',
    isin: 'US0378331005',
    cusip: '037833100',
    exchange: 'NASDAQ',
    ipoDate: '1980-12-12',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide. The company offers iPhone, a line of smartphones; Mac, a line of personal computers; iPad, a line of multi-purpose tablets; and wearables, home, and accessories comprising AirPods, Apple TV, Apple Watch, Beats products, and HomePod.',
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    address: 'One Microsoft Way',
    phone: '(425) 882-8080',
    website: 'https://www.microsoft.com',
    sector: 'Technology',
    industry: 'Software',
    fullTimeEmployees: 221000,
    cik: '0000789019',
    isin: 'US5949181045',
    cusip: '594918104',
    exchange: 'NASDAQ',
    ipoDate: '1986-03-13',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide. The company operates in three segments: Productivity and Business Processes, Intelligent Cloud, and More Personal Computing.',
  },
};

export const mockNewsData: NewsItem[] = [
  {
    id: '1',
    title: 'Alibaba Updates LLMs To Power AI On Apple Devices In China',
    date: 'Jun 17, 2025',
    time: '9:25 AM',
    relatedTickers: ['BABA', 'AAPL'],
    tickerChanges: { BABA: 0.02, AAPL: -0.34 },
  },
  {
    id: '2',
    title: "Trump's Plan To Take On Apple, Samsung With A Smartphone Is A 'Fairytale': Dan Ives Warns",
    date: 'Jun 17, 2025',
    time: '7:49 AM',
    relatedTickers: ['TMUS', 'AAPL', 'SPY', 'QQQ'],
    tickerChanges: { TMUS: -3.97, AAPL: -0.34, SPY: -0.27, QQQ: -0.30 },
  },
  {
    id: '3',
    title: 'STMicro Unveils Smart Sensor To Cut PC Power Use, Boost Privacy',
    date: 'Jun 17, 2025',
    time: '5:02 AM',
    relatedTickers: ['STM', 'AAPL', 'TSLA'],
    tickerChanges: { STM: -1.47, AAPL: -0.34, TSLA: -1.55 },
  },
  {
    id: '4',
    title: "Mark Cuban Casts Doubt On Trump Mobile's 'Made In America' Claim",
    date: 'Jun 17, 2025',
    time: '1:47 AM',
    relatedTickers: ['TMUS', 'T', 'VZ', 'AAPL'],
    tickerChanges: { TMUS: -3.97, T: -0.39, VZ: -0.92, AAPL: -0.34 },
  },
  {
    id: '5',
    title: "10 Information Technology Stocks Whale Activity In Today's Session",
    date: 'Jun 16, 2025',
    time: '12:35 PM',
    relatedTickers: ['AMD', 'PLTR', 'ORCL', 'NVDA', 'MSFT'],
    tickerChanges: { AMD: 2.19, PLTR: -0.39, ORCL: 0.60, NVDA: -0.04, MSFT: -0.66 },
  },
];

export const mockManagementData: { [key: string]: ManagementMember[] } = {
  AAPL: [
    {
      name: 'Mr. Timothy D. Cook',
      title: 'Chief Executive Officer & Director',
      compensation: '16.24 M',
      currency: 'USD',
    },
    {
      name: 'Mr. Jeffrey E. Williams',
      title: 'Chief Operating Officer',
      compensation: '4.64 M',
      currency: 'USD',
    },
    {
      name: 'Ms. Katherine L. Adams',
      title: 'Senior Vice President, General Counsel & Secretary',
      compensation: '4.62 M',
      currency: 'USD',
    },
    {
      name: 'Ms. Deirdre O\'Brien',
      title: 'Chief People Officer & Senior Vice President of Retail',
      compensation: '4.61 M',
      currency: 'USD',
    },
    {
      name: 'Mr. Kevan Parekh',
      title: 'Senior Vice President & Chief Financial Officer',
      compensation: '-',
      currency: 'USD',
    },
  ],
  MSFT: [
    {
      name: 'Mr. Satya Nadella',
      title: 'Chairman & Chief Executive Officer',
      compensation: '54.95 M',
      currency: 'USD',
    },
    {
      name: 'Ms. Amy E. Hood',
      title: 'Executive Vice President & Chief Financial Officer',
      compensation: '12.24 M',
      currency: 'USD',
    },
  ],
};

export const mockKeyMetrics: { [key: string]: KeyMetric[] } = {
  AAPL: [
    { label: 'Beta', value: '1.21' },
    { label: 'Vol Avg', value: '61.133 M' },
    { label: 'Market Cap', value: '2.948 T' },
    { label: 'Range', value: '196.25 - 197.91' },
    { label: '52-week High', value: '260.10' },
    { label: '52-week Low', value: '169.21' },
    { label: 'Div Yield', value: '0.51 %' },
    { label: 'P/E Ratio', value: '30.42' },
  ],
  MSFT: [
    { label: 'Beta', value: '0.93' },
    { label: 'Vol Avg', value: '23.456 M' },
    { label: 'Market Cap', value: '3.089 T' },
    { label: 'Range', value: '414.85 - 418.23' },
    { label: '52-week High', value: '468.35' },
    { label: '52-week Low', value: '362.90' },
    { label: 'Div Yield', value: '0.72 %' },
    { label: 'P/E Ratio', value: '35.8' },
  ],
};

export const mockShareStatistics: { [key: string]: any } = {
  AAPL: {
    freeFloat: '99.904',
    floatShares: '14.921 B',
    outstandingShares: '14.936 B',
  },
  MSFT: {
    freeFloat: '99.96',
    floatShares: '7.426 B',
    outstandingShares: '7.430 B',
  },
};

export const mockRevenueByGeography: RevenueData[] = [
  { date: '2020-09-26', segments: { 'Americas': 124.556, 'Europe': 68.640, 'Greater China': 40.308, 'Japan': 21.418, 'Rest of Asia Pacific': 19.593 } },
  { date: '2021-09-25', segments: { 'Americas': 153.306, 'Europe': 89.307, 'Greater China': 68.366, 'Japan': 28.482, 'Rest of Asia Pacific': 26.356 } },
  { date: '2022-09-24', segments: { 'Americas': 169.658, 'Europe': 95.118, 'Greater China': 74.200, 'Japan': 25.977, 'Rest of Asia Pacific': 29.375 } },
  { date: '2023-09-30', segments: { 'Americas': 162.560, 'Europe': 94.294, 'Greater China': 72.559, 'Japan': 24.257, 'Rest of Asia Pacific': 29.615 } },
  { date: '2024-09-28', segments: { 'Americas': 167.043, 'Europe': 93.829, 'Greater China': 66.955, 'Japan': 24.971, 'Rest of Asia Pacific': 32.226 } },
];

export const mockRevenueByBusiness: RevenueData[] = [
  { date: '2020-09-26', segments: { 'iPhone': 137.781, 'Mac': 28.622, 'iPad': 23.724, 'Wearables': 30.620, 'Services': 53.768 } },
  { date: '2021-09-25', segments: { 'iPhone': 191.973, 'Mac': 35.190, 'iPad': 31.862, 'Wearables': 38.367, 'Services': 68.425 } },
  { date: '2022-09-24', segments: { 'iPhone': 205.489, 'Mac': 40.177, 'iPad': 29.292, 'Wearables': 41.241, 'Services': 78.129 } },
  { date: '2023-09-30', segments: { 'iPhone': 200.583, 'Mac': 29.357, 'iPad': 28.300, 'Wearables': 39.845, 'Services': 85.200 } },
  { date: '2024-09-28', segments: { 'iPhone': 201.183, 'Mac': 28.983, 'iPad': 26.694, 'Wearables': 37.005, 'Services': 91.159 } },
];

export const mockValuationMultiples: ValuationMultiple[] = [
  { date: '2019-09-28', peRatio: 17.6, psRatio: 3.7, pbRatio: 9.4, evSales: 3.9, evEbitda: 13.4, dividendYield: 1.3 },
  { date: '2020-09-26', peRatio: 35.1, psRatio: 7.9, pbRatio: 30.1, evSales: 8.2, evEbitda: 26.5, dividendYield: 0.7 },
  { date: '2021-09-25', peRatio: 28.6, psRatio: 7.5, pbRatio: 44.7, evSales: 7.5, evEbitda: 23.1, dividendYield: 0.5 },
  { date: '2022-09-24', peRatio: 23.8, psRatio: 5.8, pbRatio: 43.5, evSales: 5.7, evEbitda: 18.9, dividendYield: 0.6 },
  { date: '2023-09-30', peRatio: 29.9, psRatio: 7.5, pbRatio: 46.9, evSales: 7.7, evEbitda: 24.8, dividendYield: 0.5 },
  { date: '2024-09-28', peRatio: 30.4, psRatio: 7.9, pbRatio: 50.3, evSales: 8.1, evEbitda: 25.2, dividendYield: 0.5 },
];

// Mock API functions
export const fetchStockData = async (ticker: string): Promise<Stock> => {
  await new Promise(resolve => setTimeout(resolve, 300)); // Simulate API delay
  return mockStockData[ticker] || mockStockData.AAPL;
};

export const fetchCompanyProfile = async (ticker: string): Promise<CompanyProfile> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockCompanyProfile[ticker] || mockCompanyProfile.AAPL;
};

export const fetchNews = async (ticker: string): Promise<NewsItem[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockNewsData.filter(news => news.relatedTickers.includes(ticker));
};

export const fetchManagement = async (ticker: string): Promise<ManagementMember[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockManagementData[ticker] || mockManagementData.AAPL;
};

export const fetchKeyMetrics = async (ticker: string): Promise<KeyMetric[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockKeyMetrics[ticker] || mockKeyMetrics.AAPL;
};

export const fetchShareStatistics = async (ticker: string): Promise<any> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return mockShareStatistics[ticker] || mockShareStatistics.AAPL;
};