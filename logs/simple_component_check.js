const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));

  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000');
    
    // Sign in
    console.log('Signing in...');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    
    // Wait for home page
    await page.waitForTimeout(3000);
    
    // Navigate to account page integrations tab
    console.log('Navigating to integrations...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(2000);
    
    // Check which handleConnect function is being used
    const connectButtonInfo = await page.evaluate(() => {
      const connectButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.trim() === 'Connect' && !btn.disabled
      );
      
      if (connectButtons.length === 0) {
        return { error: 'No Connect buttons found' };
      }
      
      const button = connectButtons[0];
      
      // Look for the onClick handler
      const keys = Object.keys(button);
      const reactFiberKey = keys.find(key => key.startsWith('__reactFiber'));
      
      if (reactFiberKey) {
        const fiber = button[reactFiberKey];
        const props = fiber.pendingProps || fiber.memoizedProps;
        
        if (props && props.onClick) {
          // Get the function source code
          const fnString = props.onClick.toString();
          return {
            hasOnClick: true,
            functionPreview: fnString.substring(0, 1000), // First 1000 chars
            containsPopup: fnString.includes('window.open'),
            containsLocationHref: fnString.includes('window.location.href'),
            containsLocationReplace: fnString.includes('window.location.replace')
          };
        }
      }
      
      return { hasOnClick: false };
    });
    
    console.log('Connect button analysis:', JSON.stringify(connectButtonInfo, null, 2));
    
    // Now let's actually click the button and see what happens
    console.log('Clicking connect button...');
    
    const connectButton = await page.locator('button:has-text("Connect")').first();
    
    // Set up navigation listener
    let navigationOccurred = false;
    page.on('framenavigated', () => {
      navigationOccurred = true;
      console.log('NAVIGATION DETECTED!');
    });
    
    // Click and wait
    await connectButton.click();
    await page.waitForTimeout(2000);
    
    console.log('Navigation occurred:', navigationOccurred);
    console.log('Current URL:', page.url());
    
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();