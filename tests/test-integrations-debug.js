const { chromium } = require('playwright');

async function testIntegrationsDebug() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (text.includes('Integration') || text.includes('integration')) {
      console.log('Integration log:', msg.type(), text);
    }
  });
  
  // Log all API requests
  page.on('request', request => {
    const url = request.url();
    if (url.includes('/api/')) {
      console.log('API Request:', request.method(), url);
    }
  });
  
  page.on('response', response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log('API Response:', response.status(), url);
    }
  });
  
  // Catch any page errors
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });
  
  try {
    // Login
    console.log('1. Logging in...');
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Go directly to integrations tab
    console.log('\n2. Going to integrations tab...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    // Check if IntegrationsList component mounted
    console.log('\n3. Checking page content...');
    
    // Look for any integration-related elements
    const hasEnterpriseIntegrations = await page.locator('text=Enterprise Integrations').count();
    console.log('Has "Enterprise Integrations" text:', hasEnterpriseIntegrations > 0);
    
    const hasBox = await page.locator('text=Box').count();
    console.log('Has "Box" text:', hasBox > 0);
    
    // Check if the component is there
    const pageContent = await page.content();
    const hasIntegrationsList = pageContent.includes('IntegrationsList');
    console.log('Page contains IntegrationsList:', hasIntegrationsList);
    
    // Try to find any console errors
    console.log('\n4. Console logs that might indicate issues:');
    consoleLogs.forEach(log => {
      if (log.includes('error') || log.includes('Error') || log.includes('failed')) {
        console.log(log);
      }
    });
    
    // Take screenshot
    await page.screenshot({ path: 'logs/integrations-debug.png' });
    
    // Try to manually trigger the integrations API
    console.log('\n5. Manually checking integrations API...');
    const apiResponse = await page.evaluate(async () => {
      try {
        const token = document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];
        const response = await fetch('http://localhost:8000/api/integrations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        return { 
          status: response.status, 
          ok: response.ok,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    console.log('Manual API call result:', apiResponse);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testIntegrationsDebug().catch(console.error);