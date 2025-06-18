const { chromium } = require('playwright');

async function testFullIntegration() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Filling login form...');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    console.log('4. Current URL:', page.url());
    
    console.log('5. Navigating to integrations page...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'logs/integrations-page-fixed.png' });
    
    console.log('6. Looking for Box integration...');
    // Wait for integrations to load
    await page.waitForSelector('text=Enterprise Integrations', { timeout: 5000 });
    
    // Find Box integration
    const boxText = await page.locator('text=Box').first();
    if (await boxText.count() > 0) {
      console.log('7. Found Box integration');
      
      // Find the parent row
      const boxRow = await page.locator('text=Box').locator('../../../..');
      
      // Check if switch is enabled
      const switchButton = await boxRow.locator('button[role="switch"]').first();
      const switchState = await switchButton.getAttribute('data-state');
      console.log('8. Switch state:', switchState);
      
      if (switchState === 'checked') {
        // Look for Connect button
        const connectButton = await boxRow.locator('button:has-text("Connect")').first();
        if (await connectButton.count() > 0) {
          console.log('9. Connect button is visible! Clicking it...');
          
          // Prepare to handle popup
          const popupPromise = context.waitForEvent('page');
          
          await connectButton.click();
          
          // Wait for popup or redirection
          try {
            const popup = await popupPromise;
            console.log('10. APIdeck Vault popup opened:', popup.url());
            await popup.close();
          } catch (e) {
            console.log('10. No popup detected, checking for navigation...');
          }
          
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'logs/after-connect-fixed.png' });
        } else {
          console.log('9. Connect button not found');
        }
      } else {
        console.log('9. Box integration is not enabled');
      }
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'logs/error-screenshot-fixed.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testFullIntegration().catch(console.error);