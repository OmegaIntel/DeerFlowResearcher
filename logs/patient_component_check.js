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
    
    // Wait for the page to load
    await page.waitForTimeout(5000);
    
    // Sign in
    console.log('Looking for sign in form...');
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });
    
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
    
    // First, let's see what's on the page
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 500),
      hasConnectButtons: document.querySelectorAll('button').length,
      buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)
    }));
    
    console.log('Page info:', JSON.stringify(pageInfo, null, 2));
    
    // Check which handleConnect function is being used
    const connectButtonInfo = await page.evaluate(() => {
      const connectButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.trim() === 'Connect' && !btn.disabled
      );
      
      if (connectButtons.length === 0) {
        return { 
          error: 'No Connect buttons found', 
          allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim())
        };
      }
      
      const button = connectButtons[0];
      console.log('Found connect button:', button.textContent);
      
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
            functionPreview: fnString.substring(0, 1500), // First 1500 chars
            containsPopup: fnString.includes('window.open'),
            containsLocationHref: fnString.includes('window.location.href'),
            containsLocationReplace: fnString.includes('window.location.replace'),
            containsSetConnecting: fnString.includes('setConnecting'),
            containsToastSuccess: fnString.includes('toast.success')
          };
        }
      }
      
      return { hasOnClick: false, buttonFound: true };
    });
    
    console.log('Connect button analysis:', JSON.stringify(connectButtonInfo, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();