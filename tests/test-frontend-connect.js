const { chromium } = require('playwright');

async function testFrontendConnect() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enable verbose console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  // Log all network requests
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('Request:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('Response:', response.status(), response.url());
    }
  });
  
  // Listen for navigation
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('Navigated to:', frame.url());
    }
  });
  
  try {
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Logging in...');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    console.log('3. Going to integrations page...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    console.log('4. Looking for integrations...');
    await page.waitForSelector('text=Enterprise Integrations', { timeout: 10000 });
    
    // Take screenshot
    await page.screenshot({ path: 'logs/integrations-before-click.png' });
    
    // Check if Box is enabled
    console.log('5. Checking Box integration state...');
    const boxRow = await page.locator('h4:has-text("Box")').locator('../../../..');
    const switchButton = await boxRow.locator('button[role="switch"]').first();
    const switchState = await switchButton.getAttribute('data-state');
    console.log('Box switch state:', switchState);
    
    // If not enabled, enable it first
    if (switchState !== 'checked') {
      console.log('6. Enabling Box integration...');
      await switchButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Now look for Connect button
    console.log('7. Looking for Connect button...');
    const connectButton = await boxRow.locator('button:has-text("Connect")').first();
    const connectButtonCount = await connectButton.count();
    console.log('Connect button found:', connectButtonCount > 0);
    
    if (connectButtonCount > 0) {
      console.log('8. Clicking Connect button...');
      
      // Listen for navigation or new pages
      const navigationPromise = page.waitForNavigation({ timeout: 5000 }).catch(() => null);
      
      await connectButton.click();
      
      // Wait to see what happens
      await page.waitForTimeout(3000);
      
      // Check if navigation happened
      const navigation = await navigationPromise;
      if (navigation) {
        console.log('9. Navigation detected to:', page.url());
      } else {
        console.log('9. No navigation detected');
        console.log('Current URL:', page.url());
        
        // Take screenshot after click
        await page.screenshot({ path: 'logs/after-connect-click.png' });
        
        // Check for any error messages
        const toasts = await page.locator('[data-sonner-toast]').allTextContents();
        if (toasts.length > 0) {
          console.log('Toast messages:', toasts);
        }
      }
    } else {
      console.log('Connect button not found!');
      
      // Check what's in the Box row
      const boxRowContent = await boxRow.textContent();
      console.log('Box row content:', boxRowContent);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'logs/frontend-test-error.png' });
  } finally {
    await browser.close();
  }
}

testFrontendConnect().catch(console.error);