const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[BROWSER] error: ${error.message}`));

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
    
    // Check which component is actually rendered
    const componentInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.includes('Connect') || btn.textContent.includes('Opening')
      );
      
      const handleConnectSources = [];
      
      // Check if we can find React fiber data
      buttons.forEach((button, index) => {
        try {
          // Try to find React fiber data
          const keys = Object.keys(button);
          const reactFiberKey = keys.find(key => key.startsWith('__reactFiber'));
          if (reactFiberKey) {
            const fiber = button[reactFiberKey];
            let currentFiber = fiber;
            
            // Walk up the fiber tree to find the component
            while (currentFiber) {
              if (currentFiber.type && currentFiber.type.name) {
                handleConnectSources.push({
                  buttonIndex: index,
                  componentName: currentFiber.type.name,
                  buttonText: button.textContent
                });
                break;
              }
              currentFiber = currentFiber.return;
            }
          }
        } catch (e) {
          // Ignore errors
        }
      });
      
      return {
        totalConnectButtons: buttons.length,
        buttonTexts: buttons.map(btn => btn.textContent),
        componentInfo: handleConnectSources,
        pageTitle: document.title,
        url: window.location.href
      };
    });
    
    console.log('Component information:', JSON.stringify(componentInfo, null, 2));
    
    // Also check for the specific component names in the DOM
    const domInfo = await page.evaluate(() => {
      const body = document.body.innerHTML;
      const hasIntegrationsTabContent = body.includes('IntegrationsTabContent');
      const hasIntegrationsList = body.includes('IntegrationsList');
      const hasIntegrationsListStatic = body.includes('IntegrationsListStatic');
      
      // Check for any script tags or source maps that might show which component
      const scripts = Array.from(document.scripts).map(script => ({
        src: script.src,
        hasIntegrationsTab: script.innerHTML.includes('IntegrationsTabContent'),
        hasIntegrationsList: script.innerHTML.includes('IntegrationsList')
      }));
      
      return {
        hasIntegrationsTabContent,
        hasIntegrationsList, 
        hasIntegrationsListStatic,
        scripts: scripts.filter(s => s.hasIntegrationsTab || s.hasIntegrationsList)
      };
    });
    
    console.log('DOM information:', JSON.stringify(domInfo, null, 2));
    
    // Look at the current handleConnect function
    const handleConnectInfo = await page.evaluate(() => {
      // Try to find the handleConnect function in the global scope or on buttons
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => 
        btn.textContent.includes('Connect') && !btn.textContent.includes('Connected')
      );
      
      if (buttons.length > 0) {
        const button = buttons[0];
        // Look for click handler
        const keys = Object.keys(button);
        const reactFiberKey = keys.find(key => key.startsWith('__reactFiber'));
        
        if (reactFiberKey) {
          try {
            const fiber = button[reactFiberKey];
            const props = fiber.pendingProps || fiber.memoizedProps;
            
            if (props && props.onClick) {
              return {
                hasOnClick: true,
                onClickString: props.onClick.toString().substring(0, 500) // First 500 chars
              };
            }
          } catch (e) {
            return { error: e.message };
          }
        }
      }
      
      return { hasOnClick: false };
    });
    
    console.log('HandleConnect info:', JSON.stringify(handleConnectInfo, null, 2));
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();