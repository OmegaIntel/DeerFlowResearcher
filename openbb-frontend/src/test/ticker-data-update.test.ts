import { TICKER_OPTIONS } from '../constants/tickers';

// Test script to verify data updates for different tickers
export async function testTickerDataUpdates() {
  console.log('Testing data updates for multiple tickers...');
  console.log('=' .repeat(60));
  
  const results: Record<string, any> = {};
  
  for (const ticker of TICKER_OPTIONS) {
    console.log(`\nTesting ${ticker.symbol} - ${ticker.name}`);
    console.log('-'.repeat(40));
    
    try {
      // Test fundamental overview
      const overviewResponse = await fetch(
        `http://localhost:8000/api/v1/equity/fundamental/overview?symbol=${ticker.symbol}`
      );
      const overviewData = await overviewResponse.json();
      
      // Test historical prices
      const priceResponse = await fetch(
        `http://localhost:8000/api/v1/equity/price/historical?symbol=${ticker.symbol}&limit=5`
      );
      const priceData = await priceResponse.json();
      
      // Test share statistics
      const statsResponse = await fetch(
        `http://localhost:8000/api/v1/equity/ownership/share-statistics?symbol=${ticker.symbol}`
      );
      const statsData = await statsResponse.json();
      
      results[ticker.symbol] = {
        overview: {
          success: overviewData.success,
          provider: overviewData.data?.provider,
          hasData: !!overviewData.data?.name
        },
        prices: {
          success: priceData.success,
          provider: priceData.data?.provider,
          dataPoints: priceData.data?.data?.length || 0
        },
        statistics: {
          success: statsData.success,
          provider: statsData.data?.provider,
          hasData: !!statsData.data?.sharesOutstanding
        }
      };
      
      console.log(`✓ Overview: ${overviewData.data?.provider || 'N/A'}`);
      console.log(`✓ Prices: ${priceData.data?.provider || 'N/A'} (${priceData.data?.data?.length || 0} data points)`);
      console.log(`✓ Statistics: ${statsData.data?.provider || 'N/A'}`);
      
    } catch (error) {
      console.error(`✗ Error testing ${ticker.symbol}:`, error);
      results[ticker.symbol] = { error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Summary:');
  console.log('='.repeat(60));
  
  const successCount = Object.values(results).filter((r: any) => 
    r.overview?.success && r.prices?.success && r.statistics?.success
  ).length;
  
  console.log(`Total tickers tested: ${TICKER_OPTIONS.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${TICKER_OPTIONS.length - successCount}`);
  
  return results;
}

// Export for use in other files
export default testTickerDataUpdates;