const { chromium } = require('playwright');

async function testFinalIntegration() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[IntegrationsList]')) {
      console.log('IntegrationsList log:', text);
    }
  });
  
  // Log API calls
  page.on('request', request => {
    if (request.url().includes('/api/integrations')) {
      console.log('Integration API call:', request.method(), request.url());
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/integrations')) {
      console.log('Integration API response:', response.status(), response.url());
    }
  });
  
  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to integrations
    console.log('\n2. Going to integrations page...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(5000);
    
    // Take screenshot
    await page.screenshot({ path: 'logs/final-integrations-page.png' });
    
    // Check what's rendered
    console.log('\n3. Checking rendered content...');
    const hasLoading = await page.locator('.animate-spin').count();
    console.log('Has loading spinner:', hasLoading > 0);
    
    const hasEnterpriseIntegrations = await page.locator('text=Enterprise Integrations').count();
    console.log('Has Enterprise Integrations:', hasEnterpriseIntegrations > 0);
    
    const hasBox = await page.locator('h4:has-text("Box")').count();
    console.log('Has Box integration:', hasBox > 0);
    
    // Try to find and click Connect button for Box
    if (hasBox > 0) {
      console.log('\n4. Looking for Box Connect functionality...');
      const boxRow = await page.locator('h4:has-text("Box")').locator('../../../..');
      
      // Check switch state
      const switchButton = await boxRow.locator('button[role="switch"]').first();
      if (await switchButton.count() > 0) {
        const isChecked = await switchButton.getAttribute('data-state');
        console.log('Box switch state:', isChecked);
        
        if (isChecked !== 'checked') {
          console.log('Enabling Box...');
          await switchButton.click();
          await page.waitForTimeout(2000);
        }
        
        // Look for Connect button
        const connectButton = await boxRow.locator('button:has-text("Connect")').first();
        if (await connectButton.count() > 0) {
          console.log('Connect button found! Clicking...');
          await connectButton.click();
          await page.waitForTimeout(3000);
          
          // Check if navigation happened
          const currentUrl = page.url();
          console.log('Current URL after click:', currentUrl);
          
          if (currentUrl.includes('vault.apideck.com')) {
            console.log('SUCCESS! Redirected to APIdeck Vault');
          } else {
            console.log('Still on same page, checking for errors...');
            const toasts = await page.locator('[data-sonner-toast]').allTextContents();
            if (toasts.length > 0) {
              console.log('Toast messages:', toasts);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testFinalIntegration().catch(console.error);