import { describe, it, expect, beforeAll } from 'vitest';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const TEST_SYMBOL = 'AAPL';

describe('Widget Data Availability Tests', () => {
  let results: Record<string, any> = {};

  beforeAll(async () => {
    // Test all endpoints once and store results
    const endpoints = [
      { name: 'Company Profile', path: `/equity/fundamental/overview?symbol=${TEST_SYMBOL}` },
      { name: 'Key Metrics', path: `/equity/fundamental/metrics?symbol=${TEST_SYMBOL}&period=annual&limit=1&with_ttm=true` },
      { name: 'Share Statistics', path: `/equity/ownership/share-statistics?symbol=${TEST_SYMBOL}` },
      { name: 'Management Team', path: `/equity/fundamental/management?symbol=${TEST_SYMBOL}` },
      { name: 'Revenue Geography', path: `/equity/fundamental/revenue-geography?symbol=${TEST_SYMBOL}&period=annual` },
      { name: 'Revenue Segment', path: `/equity/fundamental/revenue-segment?symbol=${TEST_SYMBOL}&period=annual` },
      { name: 'Valuation Multiples', path: `/equity/fundamental/metrics?symbol=${TEST_SYMBOL}&period=annual&limit=10&with_ttm=false` },
      { name: 'Company News', path: `/news/company?symbol=${TEST_SYMBOL}&limit=10` },
      { name: 'Price Performance', path: `/equity/price/performance?symbol=${TEST_SYMBOL}` },
      { name: 'Income Statement', path: `/equity/fundamental/income-statement?symbol=${TEST_SYMBOL}&period=annual&limit=5` },
      { name: 'Balance Sheet', path: `/equity/fundamental/balance-sheet?symbol=${TEST_SYMBOL}&period=annual&limit=5` },
      { name: 'Cash Flow', path: `/equity/fundamental/cash-flow-statement?symbol=${TEST_SYMBOL}&period=annual&limit=5` },
      { name: 'Analyst Ratings', path: `/equity/fundamental/analyst-ratings?symbol=${TEST_SYMBOL}&limit=10` },
      { name: 'Price Target', path: `/equity/estimates/price-target?symbol=${TEST_SYMBOL}` },
      { name: 'SEC Filings', path: `/equity/fundamental/sec-filings?symbol=${TEST_SYMBOL}&limit=10` },
      { name: 'Earnings Transcripts', path: `/equity/fundamental/earnings-transcript-dates?symbol=${TEST_SYMBOL}` },
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${API_BASE_URL}${endpoint.path}`);
        results[endpoint.name] = {
          success: response.data.success,
          hasData: response.data.data && 
            (Array.isArray(response.data.data) ? response.data.data.length > 0 : Object.keys(response.data.data).length > 0),
          data: response.data.data
        };
      } catch (error) {
        results[endpoint.name] = {
          success: false,
          hasData: false,
          error: error.message
        };
      }
    }
  });

  describe('Widgets with Free API Data', () => {
    it('Company Profile should have data', () => {
      expect(results['Company Profile'].hasData).toBe(true);
    });

    it('Key Metrics should have data', () => {
      expect(results['Key Metrics'].hasData).toBe(true);
    });

    it('Share Statistics should have data', () => {
      expect(results['Share Statistics'].hasData).toBe(true);
    });

    it('Management Team should have data', () => {
      expect(results['Management Team'].hasData).toBe(true);
    });

    it('Valuation Multiples should have data', () => {
      expect(results['Valuation Multiples'].hasData).toBe(true);
    });

    it('Company News should have data', () => {
      expect(results['Company News'].hasData).toBe(true);
    });

    it('Price Performance should have data', () => {
      expect(results['Price Performance'].hasData).toBe(true);
      expect(results['Price Performance'].data.performance).toBeDefined();
    });

    it('Income Statement should have data', () => {
      expect(results['Income Statement'].hasData).toBe(true);
    });

    it('Balance Sheet should have data', () => {
      expect(results['Balance Sheet'].hasData).toBe(true);
    });

    it('Cash Flow should have data', () => {
      expect(results['Cash Flow'].hasData).toBe(true);
    });

    it('Price Target should have data', () => {
      expect(results['Price Target'].hasData).toBe(true);
    });

    it('SEC Filings should have data', () => {
      expect(results['SEC Filings'].hasData).toBe(true);
    });
  });

  describe('Widgets Requiring Premium Subscriptions', () => {
    it('Revenue Geography should NOT have data (requires premium FMP)', () => {
      expect(results['Revenue Geography'].hasData).toBe(false);
    });

    it('Revenue Segment should NOT have data (requires premium FMP)', () => {
      expect(results['Revenue Segment'].hasData).toBe(false);
    });

    it('Analyst Ratings should NOT have data (requires premium Benzinga)', () => {
      expect(results['Analyst Ratings'].hasData).toBe(false);
    });

    it('Earnings Transcripts should NOT have data (requires API Ninjas configuration)', () => {
      expect(results['Earnings Transcripts'].hasData).toBe(false);
    });
  });
});