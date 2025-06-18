const { chromium } = require('playwright');

async function testIntegrationAPI() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture all console logs
  page.on('console', msg => {
    console.log('Console:', msg.text());
  });
  
  // Log all integration-related network traffic
  page.on('request', request => {
    const url = request.url();
    if (url.includes('integration') || url.includes('/api/')) {
      console.log(`\n>>> Request: ${request.method()} ${url}`);
      const headers = request.headers();
      if (headers.authorization) {
        console.log('    Auth: ' + headers.authorization.substring(0, 30) + '...');
      }
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('integration') || url.includes('/api/')) {
      console.log(`<<< Response: ${response.status()} ${url}`);
      if (response.status() !== 200) {
        try {
          const body = await response.text();
          console.log('    Body:', body);
        } catch (e) {}
      }
    }
  });
  
  try {
    // 1. Login
    console.log('\n=== STEP 1: Login ===');
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    console.log('Current URL after login:', page.url());
    
    // 2. Go to integrations
    console.log('\n=== STEP 2: Navigate to Integrations ===');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    // 3. Get auth token from browser
    const tokenInfo = await page.evaluate(() => {
      // Try multiple methods to get token
      const fromCookie = document.cookie.split(';').find(c => c.trim().startsWith('authToken='));
      const cookieToken = fromCookie ? fromCookie.split('=')[1] : null;
      
      const localToken = localStorage.getItem('authToken');
      const sessionToken = sessionStorage.getItem('authToken');
      
      return {
        cookie: cookieToken ? cookieToken.substring(0, 20) + '...' : null,
        local: localToken ? localToken.substring(0, 20) + '...' : null,
        session: sessionToken ? sessionToken.substring(0, 20) + '...' : null
      };
    });
    console.log('\nToken info:', tokenInfo);
    
    // 4. Try the integration toggle
    console.log('\n=== STEP 3: Test Integration Toggle ===');
    
    // Wait for the integrations to load
    await page.waitForSelector('text=Box', { timeout: 5000 });
    
    // Find and click the Box toggle
    const boxSwitch = await page.locator('h4:has-text("Box")').locator('../../../..//button[role="switch"]').first();
    if (await boxSwitch.count() > 0) {
      console.log('Found Box switch, clicking...');
      await boxSwitch.click();
      await page.waitForTimeout(2000);
      
      // Screenshot after toggle
      await page.screenshot({ path: 'logs/after-toggle.png' });
    }
    
    // 5. Check for errors
    const errors = await page.locator('[role="alert"]').allTextContents();
    if (errors.length > 0) {
      console.log('\nError alerts found:', errors);
    }
    
  } catch (error) {
    console.error('\nTest error:', error.message);
    await page.screenshot({ path: 'logs/api-test-error.png' });
  } finally {
    await browser.close();
  }
}

testIntegrationAPI().catch(console.error);