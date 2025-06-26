export interface DataSource {
  id: string;
  name: string;
  requiresKey: boolean;
  apiKeyEnvVar?: string;
  signupUrl?: string;
  docsUrl: string;
  limits: string;
  dataPoints: {
    category: string;
    endpoints: string[];
  }[];
}

export const dataSources: DataSource[] = [
  // FREE - No API Key Required
  {
    id: 'yfinance',
    name: 'Yahoo Finance',
    requiresKey: false,
    docsUrl: 'https://github.com/ranaroussi/yfinance',
    limits: 'No official limits (be respectful)',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices', 'Real-time Quotes', 'Volume Data']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Company Overview', 'Key Metrics', 'Income Statement', 'Balance Sheet', 'Cash Flow']
      },
      {
        category: 'Ownership',
        endpoints: ['Share Statistics', 'Institutional Holdings', 'Insider Trading']
      },
      {
        category: 'News',
        endpoints: ['Company News']
      }
    ]
  },
  {
    id: 'cboe',
    name: 'Chicago Board Options Exchange',
    requiresKey: false,
    docsUrl: 'https://www.cboe.com/delayed_quotes/',
    limits: 'No official limits',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices']
      },
      {
        category: 'Options',
        endpoints: ['Options Chains']
      }
    ]
  },
  {
    id: 'sec',
    name: 'SEC (Securities and Exchange Commission)',
    requiresKey: false,
    docsUrl: 'https://www.sec.gov/edgar/sec-api-documentation',
    limits: '10 requests/second',
    dataPoints: [
      {
        category: 'Filings',
        endpoints: ['SEC Filings', '10-K', '10-Q', '8-K', 'DEF 14A']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Income Statement', 'Balance Sheet']
      }
    ]
  },

  // FREE TIER AVAILABLE - API Key Required
  {
    id: 'alpha_vantage',
    name: 'Alpha Vantage',
    requiresKey: true,
    apiKeyEnvVar: 'ALPHA_VANTAGE_API_KEY',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
    docsUrl: 'https://www.alphavantage.co/documentation/',
    limits: '5 calls/minute, 500 calls/day (free tier)',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices', 'Intraday Prices', 'Real-time Quotes']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Company Overview', 'Income Statement', 'Balance Sheet', 'Cash Flow', 'Earnings']
      },
      {
        category: 'Technical Indicators',
        endpoints: ['SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands', 'Stochastic']
      }
    ]
  },
  {
    id: 'polygon',
    name: 'Polygon.io',
    requiresKey: true,
    apiKeyEnvVar: 'POLYGON_API_KEY',
    signupUrl: 'https://polygon.io/dashboard/signup',
    docsUrl: 'https://polygon.io/docs/stocks',
    limits: '5 calls/minute (free tier)',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices', 'Real-time Quotes', 'Last Trade']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Income Statement', 'Balance Sheet', 'Cash Flow']
      },
      {
        category: 'Options',
        endpoints: ['Options Chain', 'Options Activity']
      },
      {
        category: 'News',
        endpoints: ['Company News']
      }
    ]
  },
  {
    id: 'fmp',
    name: 'Financial Modeling Prep',
    requiresKey: true,
    apiKeyEnvVar: 'FMP_API_KEY',
    signupUrl: 'https://site.financialmodelingprep.com/register',
    docsUrl: 'https://site.financialmodelingprep.com/developer/docs',
    limits: '250 calls/day (free tier)',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices', 'Real-time Quotes']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Company Profile', 'Key Metrics', 'Income Statement', 'Balance Sheet', 'Cash Flow', 'Ratios', 'Enterprise Value']
      },
      {
        category: 'Company Info',
        endpoints: ['Management Team', 'SEC Filings']
      },
      {
        category: 'Revenue Analysis',
        endpoints: ['Revenue by Geography', 'Revenue by Segment']
      },
      {
        category: 'Estimates',
        endpoints: ['Price Target', 'Analyst Ratings']
      }
    ]
  },
  {
    id: 'benzinga',
    name: 'Benzinga',
    requiresKey: true,
    apiKeyEnvVar: 'BENZINGA_API_KEY',
    signupUrl: 'https://www.benzinga.com/apis',
    docsUrl: 'https://docs.benzinga.io/benzinga/introduction',
    limits: 'Varies by plan',
    dataPoints: [
      {
        category: 'News',
        endpoints: ['Company News', 'Market News', 'Press Releases']
      },
      {
        category: 'Options',
        endpoints: ['Options Activity', 'Unusual Options']
      },
      {
        category: 'Estimates',
        endpoints: ['Price Target', 'Analyst Ratings']
      }
    ]
  },
  {
    id: 'api_ninjas',
    name: 'API Ninjas',
    requiresKey: true,
    apiKeyEnvVar: 'API_NINJAS_KEY',
    signupUrl: 'https://api-ninjas.com/register',
    docsUrl: 'https://api-ninjas.com/api/earningstranscript',
    limits: '10,000 calls/month (free tier)',
    dataPoints: [
      {
        category: 'Earnings',
        endpoints: ['Earnings Call Transcripts']
      }
    ]
  },
  {
    id: 'tiingo',
    name: 'Tiingo',
    requiresKey: true,
    apiKeyEnvVar: 'TIINGO_TOKEN',
    signupUrl: 'https://api.tiingo.com/account/api/token',
    docsUrl: 'https://api.tiingo.com/documentation',
    limits: '1,000 calls/hour, 50,000/month (free tier)',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices', 'Real-time Quotes']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Company Overview']
      },
      {
        category: 'News',
        endpoints: ['Company News']
      }
    ]
  },
  {
    id: 'intrinio',
    name: 'Intrinio',
    requiresKey: true,
    apiKeyEnvVar: 'INTRINIO_API_KEY',
    signupUrl: 'https://intrinio.com/signup',
    docsUrl: 'https://docs.intrinio.com/',
    limits: '100 calls/day (sandbox)',
    dataPoints: [
      {
        category: 'Price Data',
        endpoints: ['Historical Prices']
      },
      {
        category: 'Fundamentals',
        endpoints: ['Key Metrics', 'Income Statement', 'Balance Sheet', 'Cash Flow']
      },
      {
        category: 'Ownership',
        endpoints: ['Institutional Ownership']
      }
    ]
  },

  // GOVERNMENT/PUBLIC DATA
  {
    id: 'fred',
    name: 'Federal Reserve Economic Data',
    requiresKey: true,
    apiKeyEnvVar: 'FRED_API_KEY',
    signupUrl: 'https://fred.stlouisfed.org/docs/api/api_key.html',
    docsUrl: 'https://fred.stlouisfed.org/docs/api/fred/',
    limits: '120 requests/minute (with key)',
    dataPoints: [
      {
        category: 'Economic Data',
        endpoints: ['GDP', 'Inflation', 'Unemployment', 'Interest Rates']
      },
      {
        category: 'Fixed Income',
        endpoints: ['Treasury Rates', 'Corporate Bond Yields']
      }
    ]
  }
];

export const getDataSourceById = (id: string): DataSource | undefined => {
  return dataSources.find(source => source.id === id);
};

export const getDataSourcesByCapability = (capability: string): DataSource[] => {
  return dataSources.filter(source => 
    source.dataPoints.some(category => 
      category.endpoints.some(endpoint => 
        endpoint.toLowerCase().includes(capability.toLowerCase())
      )
    )
  );
};