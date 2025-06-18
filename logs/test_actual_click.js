const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set longer timeout
  page.setDefaultTimeout(60000);
  
  // Enable console logging
  page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[BROWSER] error: ${error.message}`));

  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Click "Sign In" button to go to login page
    console.log('Clicking Sign In...');
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(3000);
    
    // Now sign in
    console.log('Signing in...');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    
    // Wait for home page
    await page.waitForTimeout(5000);
    
    // Navigate to account page integrations tab
    console.log('Navigating to integrations...');
    await page.goto('http://localhost:3000/account?tab=integrations', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    console.log('Page loaded, looking for Connect button...');
    
    // Set up listeners for navigation and popups
    let navigationOccurred = false;
    let popupOpened = false;
    let navigationUrl = '';
    
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationOccurred = true;
        navigationUrl = frame.url();
        console.log('NAVIGATION DETECTED to:', navigationUrl);
      }
    });
    
    page.context().on('page', (newPage) => {
      popupOpened = true;
      console.log('POPUP OPENED:', newPage.url());
    });
    
    // Take a screenshot before clicking
    await page.screenshot({ path: '/root/deer-flow/logs/before-click.png' });
    
    // Click the Connect button
    const connectButton = await page.locator('button:has-text("Connect")').first();
    
    console.log('Clicking Connect button...');
    await connectButton.click();
    
    // Wait and check what happened
    await page.waitForTimeout(5000);
    
    // Take a screenshot after clicking
    await page.screenshot({ path: '/root/deer-flow/logs/after-click.png' });
    
    console.log('Results:');
    console.log('=======');
    console.log('Navigation occurred:', navigationOccurred);
    console.log('Navigation URL:', navigationUrl);
    console.log('Popup opened:', popupOpened);
    console.log('Current URL:', page.url());
    
    if (navigationOccurred) {
      console.log('❌ NAVIGATION DETECTED - This means the fix is NOT working');
      if (navigationUrl.includes('vault.apideck.com')) {
        console.log('❌ Redirected to APIdeck vault - this should be a popup instead');
      }
    } else if (popupOpened) {
      console.log('✅ POPUP OPENED - This means the fix IS working');
    } else {
      console.log('⚠️  Neither navigation nor popup - check for errors');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();