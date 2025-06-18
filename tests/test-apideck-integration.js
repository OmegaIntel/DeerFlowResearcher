const { chromium } = require('playwright');

async function testAPIDeckIntegration() {
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
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  // Log network requests
  page.on('request', request => {
    if (request.url().includes('integration')) {
      console.log('Request:', request.method(), request.url());
      console.log('Headers:', request.headers());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('integration')) {
      console.log('Response:', response.status(), response.url());
    }
  });
  
  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'logs/login-page.png' });
    
    console.log('2. Filling login form...');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('**/chat', { timeout: 10000 });
    console.log('4. Successfully logged in, navigated to:', page.url());
    
    console.log('5. Navigating to account page...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of integrations page
    await page.screenshot({ path: 'logs/integrations-page.png' });
    
    console.log('6. Looking for integration switches...');
    // Wait for integrations to load
    await page.waitForSelector('text=Enterprise Integrations', { timeout: 5000 });
    
    // Find Box integration
    const boxIntegration = await page.locator('text=Box').locator('..').locator('..');
    if (await boxIntegration.count() > 0) {
      console.log('7. Found Box integration, looking for switch...');
      
      // Find and click the switch
      const switchElement = await boxIntegration.locator('button[role="switch"]').first();
      if (await switchElement.count() > 0) {
        console.log('8. Clicking switch to enable Box integration...');
        await switchElement.click();
        
        // Wait a bit for the request to complete
        await page.waitForTimeout(2000);
        
        // Check if Connect button appears
        const connectButton = await boxIntegration.locator('button:has-text("Connect")').first();
        if (await connectButton.count() > 0) {
          console.log('9. Connect button appeared! Clicking it...');
          await connectButton.click();
          
          // Wait for response
          await page.waitForTimeout(2000);
          
          // Take final screenshot
          await page.screenshot({ path: 'logs/after-connect-click.png' });
        } else {
          console.log('9. Connect button did not appear');
        }
      } else {
        console.log('8. Could not find switch element');
      }
    } else {
      console.log('7. Could not find Box integration');
    }
    
    // Check for any error messages
    const errorToasts = await page.locator('[role="alert"]').allTextContents();
    if (errorToasts.length > 0) {
      console.log('Error messages found:', errorToasts);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'logs/error-screenshot.png' });
  } finally {
    await browser.close();
  }
}

// Run the test
testAPIDeckIntegration().catch(console.error);