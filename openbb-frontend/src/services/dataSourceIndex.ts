/**
 * Comprehensive Data Source Index
 * Maps all available data providers to their supported endpoints and rate limits
 */

export interface DataSourceInfo {
  name: string;
  apiKey: string;
  rateLimit: {
    requests: number;
    period: string;
    concurrent?: number;
  };
  endpoints: {
    [key: string]: {
      path: string;
      description: string;
      cacheTime?: number; // in seconds
      requiredParams?: string[];
      optionalParams?: string[];
    };
  };
}

export const DATA_SOURCES: Record<string, DataSourceInfo> = {
  ALPHA_VANTAGE: {
    name: 'Alpha Vantage',
    apiKey: import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '0D8K0VOV5QYR0NT8',
    rateLimit: {
      requests: 5,
      period: 'minute',
      concurrent: 500 // 500 calls per day
    },
    endpoints: {
      quote: {
        path: '/query?function=GLOBAL_QUOTE',
        description: 'Real-time stock quotes',
        cacheTime: 60, // 1 minute
        requiredParams: ['symbol']
      },
      overview: {
        path: '/query?function=OVERVIEW',
        description: 'Company information and key metrics',
        cacheTime: 86400, // 24 hours
        requiredParams: ['symbol']
      },
      timeSeries: {
        path: '/query?function=TIME_SERIES_DAILY',
        description: 'Historical daily prices',
        cacheTime: 3600, // 1 hour
        requiredParams: ['symbol'],
        optionalParams: ['outputsize']
      },
      sma: {
        path: '/query?function=SMA',
        description: 'Simple Moving Average',
        cacheTime: 3600,
        requiredParams: ['symbol', 'interval', 'time_period', 'series_type']
      },
      ema: {
        path: '/query?function=EMA',
        description: 'Exponential Moving Average',
        cacheTime: 3600,
        requiredParams: ['symbol', 'interval', 'time_period', 'series_type']
      },
      rsi: {
        path: '/query?function=RSI',
        description: 'Relative Strength Index',
        cacheTime: 3600,
        requiredParams: ['symbol', 'interval', 'time_period', 'series_type']
      },
      macd: {
        path: '/query?function=MACD',
        description: 'MACD Technical Indicator',
        cacheTime: 3600,
        requiredParams: ['symbol', 'interval', 'series_type']
      }
    }
  },

  POLYGON: {
    name: 'Polygon.io',
    apiKey: import.meta.env.VITE_POLYGON_API_KEY || 'tn1mqKVPHsL88owHLSZbFc8iU4CWgYX1',
    rateLimit: {
      requests: 5,
      period: 'minute'
    },
    endpoints: {
      ticker: {
        path: '/v3/reference/tickers/{ticker}',
        description: 'Company details',
        cacheTime: 86400,
        requiredParams: ['ticker']
      },
      quote: {
        path: '/v2/snapshot/locale/us/markets/stocks/tickers/{ticker}',
        description: 'Real-time snapshot',
        cacheTime: 60,
        requiredParams: ['ticker']
      },
      aggregates: {
        path: '/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}',
        description: 'Historical aggregates',
        cacheTime: 3600,
        requiredParams: ['ticker', 'multiplier', 'timespan', 'from', 'to']
      },
      lastTrade: {
        path: '/v2/last/trade/{ticker}',
        description: 'Last trade information',
        cacheTime: 30,
        requiredParams: ['ticker']
      },
      news: {
        path: '/v2/reference/news',
        description: 'Company news',
        cacheTime: 300, // 5 minutes
        optionalParams: ['ticker', 'limit']
      },
      optionsChain: {
        path: '/v3/reference/options/contracts',
        description: 'Options contracts',
        cacheTime: 300,
        requiredParams: ['underlying_ticker'],
        optionalParams: ['expiration_date', 'contract_type']
      }
    }
  },

  FMP: {
    name: 'Financial Modeling Prep',
    apiKey: import.meta.env.VITE_FMP_API_KEY || 'xwxrhtvRB6oHHK2jxPplfiYhTqUgAfQv',
    rateLimit: {
      requests: 250,
      period: 'day'
    },
    endpoints: {
      profile: {
        path: '/api/v3/profile/{symbol}',
        description: 'Company profile',
        cacheTime: 86400,
        requiredParams: ['symbol']
      },
      keyMetrics: {
        path: '/api/v3/key-metrics/{symbol}',
        description: 'Key financial metrics',
        cacheTime: 3600,
        requiredParams: ['symbol']
      },
      incomeStatement: {
        path: '/api/v3/income-statement/{symbol}',
        description: 'Income statements',
        cacheTime: 86400,
        requiredParams: ['symbol'],
        optionalParams: ['period', 'limit']
      },
      balanceSheet: {
        path: '/api/v3/balance-sheet-statement/{symbol}',
        description: 'Balance sheet',
        cacheTime: 86400,
        requiredParams: ['symbol'],
        optionalParams: ['period', 'limit']
      },
      cashFlow: {
        path: '/api/v3/cash-flow-statement/{symbol}',
        description: 'Cash flow statement',
        cacheTime: 86400,
        requiredParams: ['symbol'],
        optionalParams: ['period', 'limit']
      },
      revenueGeographic: {
        path: '/api/v4/revenue-geographic-segmentation',
        description: 'Revenue by geography (PREMIUM ONLY)',
        cacheTime: 86400,
        requiredParams: ['symbol'],
        optionalParams: ['period']
      },
      revenueProduct: {
        path: '/api/v4/revenue-product-segmentation',
        description: 'Revenue by product (PREMIUM ONLY)',
        cacheTime: 86400,
        requiredParams: ['symbol'],
        optionalParams: ['period']
      },
      institutionalHolder: {
        path: '/api/v3/institutional-holder/{symbol}',
        description: 'Institutional ownership',
        cacheTime: 86400,
        requiredParams: ['symbol']
      },
      insiderTrading: {
        path: '/api/v4/insider-trading',
        description: 'Insider trading activity',
        cacheTime: 3600,
        requiredParams: ['symbol'],
        optionalParams: ['page']
      },
      analystEstimates: {
        path: '/api/v3/analyst-estimates/{symbol}',
        description: 'Analyst estimates',
        cacheTime: 3600,
        requiredParams: ['symbol']
      },
      earningsTranscript: {
        path: '/api/v3/earning_call_transcript/{symbol}',
        description: 'Earnings call transcripts',
        cacheTime: 86400,
        requiredParams: ['symbol'],
        optionalParams: ['quarter', 'year']
      }
    }
  },

  BENZINGA: {
    name: 'Benzinga',
    apiKey: import.meta.env.VITE_BENZINGA_API_KEY || 'bz.PG3WR7XJKES5P7TZ2LXT7RHE6PAHQXER',
    rateLimit: {
      requests: 250,
      period: 'hour'
    },
    endpoints: {
      news: {
        path: '/api/v2/news',
        description: 'Company and market news',
        cacheTime: 300,
        optionalParams: ['tickers', 'channels', 'pageSize']
      },
      ratings: {
        path: '/api/v2.1/calendar/ratings',
        description: 'Analyst ratings',
        cacheTime: 3600,
        optionalParams: ['tickers', 'date_from', 'date_to']
      },
      priceTargets: {
        path: '/api/v2/calendar/ratings',
        description: 'Price targets',
        cacheTime: 3600,
        optionalParams: ['tickers', 'date_from', 'date_to']
      },
      optionsActivity: {
        path: '/api/v1/signal/option_activity',
        description: 'Unusual options activity',
        cacheTime: 300,
        optionalParams: ['tickers', 'date_from', 'date_to']
      }
    }
  },

  YAHOO_FINANCE: {
    name: 'Yahoo Finance (yfinance)',
    apiKey: 'none', // No API key required
    rateLimit: {
      requests: 2000,
      period: 'hour' // Approximate, no official limit
    },
    endpoints: {
      quote: {
        path: 'yfinance.Ticker.info',
        description: 'Stock quote and company info',
        cacheTime: 60,
        requiredParams: ['ticker']
      },
      history: {
        path: 'yfinance.Ticker.history',
        description: 'Historical price data',
        cacheTime: 3600,
        requiredParams: ['ticker'],
        optionalParams: ['period', 'interval', 'start', 'end']
      },
      institutionalHolders: {
        path: 'yfinance.Ticker.institutional_holders',
        description: 'Institutional ownership data',
        cacheTime: 86400,
        requiredParams: ['ticker']
      },
      insiderTransactions: {
        path: 'yfinance.Ticker.insider_transactions',
        description: 'Insider trading data',
        cacheTime: 86400,
        requiredParams: ['ticker']
      },
      majorHolders: {
        path: 'yfinance.Ticker.major_holders',
        description: 'Major shareholders',
        cacheTime: 86400,
        requiredParams: ['ticker']
      },
      mutualFundHolders: {
        path: 'yfinance.Ticker.mutualfund_holders',
        description: 'Mutual fund ownership',
        cacheTime: 86400,
        requiredParams: ['ticker']
      }
    }
  },

  API_NINJAS: {
    name: 'API Ninjas',
    apiKey: 'embedded', // Key is embedded in the code
    rateLimit: {
      requests: 100,
      period: 'day'
    },
    endpoints: {
      earningsTranscript: {
        path: '/v1/earningstranscript',
        description: 'Quarterly earnings transcripts',
        cacheTime: 86400,
        requiredParams: ['ticker', 'year', 'quarter']
      }
    }
  }
};

// Cache configuration
export const CACHE_CONFIG = {
  defaultTTL: 300, // 5 minutes default
  maxSize: 100, // Maximum number of cached items
  storage: 'localStorage' // or 'sessionStorage'
};

// Data source selection strategy
export const getOptimalDataSource = (dataType: string): string => {
  const sourceMap: Record<string, string[]> = {
    'institutional-ownership': ['FMP', 'YAHOO_FINANCE'],
    'insider-trading': ['FMP', 'YAHOO_FINANCE'],
    'stock-ownership': ['FMP', 'YAHOO_FINANCE'],
    'real-time-quote': ['POLYGON', 'ALPHA_VANTAGE', 'YAHOO_FINANCE'],
    'company-profile': ['FMP', 'POLYGON', 'YAHOO_FINANCE'],
    'financial-statements': ['FMP'],
    'technical-indicators': ['ALPHA_VANTAGE'],
    'options-data': ['POLYGON', 'BENZINGA'],
    'news': ['BENZINGA', 'POLYGON'],
    'analyst-ratings': ['FMP', 'BENZINGA'],
    'earnings-transcripts': ['API_NINJAS'],
    'revenue-segmentation': ['FMP'], // Premium only
    'management-team': ['YAHOO_FINANCE', 'FMP'],
    'price-performance': ['YAHOO_FINANCE'],
    'key-metrics': ['FMP', 'YAHOO_FINANCE'],
    'share-statistics': ['YAHOO_FINANCE', 'FMP']
  };

  const sources = sourceMap[dataType] || ['FMP'];
  
  // Return the first available source
  // In production, this could check API key availability and rate limits
  return sources[0];
};