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
    
    // First, let's see what's on the integrations page
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      hasConnectButtons: Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('Connect')).length,
      buttonTexts: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)
    }));
    
    console.log('Integrations page info:', JSON.stringify(pageInfo, null, 2));
    
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
      
      // Look for the onClick handler
      const keys = Object.keys(button);
      const reactFiberKey = keys.find(key => key.startsWith('__reactFiber'));
      
      if (reactFiberKey) {
        const fiber = button[reactFiberKey];
        const props = fiber.pendingProps || fiber.memoizedProps;
        
        if (props && props.onClick) {
          // Get the function source code
          const fnString = props.onClick.toString();
          
          // Check specific patterns to identify which component this is
          const isPopupVersion = fnString.includes('window.open') && 
                                 fnString.includes('apideck-vault') && 
                                 fnString.includes('width=900,height=700');
          
          const isDirectNavigation = fnString.includes('window.location.href') ||
                                    fnString.includes('window.location.replace');
          
          return {
            hasOnClick: true,
            functionPreview: fnString.substring(0, 2000), // First 2000 chars
            isPopupVersion,
            isDirectNavigation,
            containsPopup: fnString.includes('window.open'),
            containsLocationHref: fnString.includes('window.location.href'),
            containsLocationReplace: fnString.includes('window.location.replace'),
            containsSetConnecting: fnString.includes('setConnecting'),
            containsToastSuccess: fnString.includes('toast.success'),
            containsVaultUrl: fnString.includes('vault_url'),
            containsApideck: fnString.includes('apideck')
          };
        }
      }
      
      return { hasOnClick: false, buttonFound: true };
    });
    
    console.log('Connect button analysis:');
    console.log('======================');
    if (connectButtonInfo.hasOnClick) {
      console.log('Has onClick handler: YES');
      console.log('Is popup version:', connectButtonInfo.isPopupVersion);
      console.log('Is direct navigation:', connectButtonInfo.isDirectNavigation);
      console.log('Contains window.open:', connectButtonInfo.containsPopup);
      console.log('Contains location.href:', connectButtonInfo.containsLocationHref);
      console.log('Contains location.replace:', connectButtonInfo.containsLocationReplace);
      console.log('Contains setConnecting:', connectButtonInfo.containsSetConnecting);
      console.log('Contains toast.success:', connectButtonInfo.containsToastSuccess);
      console.log('Contains vault_url:', connectButtonInfo.containsVaultUrl);
      console.log('Contains apideck:', connectButtonInfo.containsApideck);
      console.log('Function preview:');
      console.log(connectButtonInfo.functionPreview);
    } else {
      console.log('No onClick handler found');
      console.log(JSON.stringify(connectButtonInfo, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();