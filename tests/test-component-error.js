const { chromium } = require('playwright');

async function testComponentError() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Capture ALL errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      console.log('Console error:', msg.text());
    }
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
    errors.push(error.message);
  });
  
  try {
    // Login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Go to integrations
    console.log('Navigating to integrations...');
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    // Check for React errors
    const reactErrors = await page.evaluate(() => {
      const errorElement = document.querySelector('#__next-build-error');
      return errorElement ? errorElement.textContent : null;
    });
    
    if (reactErrors) {
      console.log('React build error:', reactErrors);
    }
    
    // Check what's actually rendered
    const integrationsContent = await page.locator('[role="tabpanel"][data-state="active"]').textContent();
    console.log('Integrations tab content:', integrationsContent?.substring(0, 200) + '...');
    
    // Try to see if the component is in the DOM but hidden
    const hasIntegrationsListInDOM = await page.evaluate(() => {
      return document.documentElement.innerHTML.includes('IntegrationsList');
    });
    console.log('IntegrationsList in DOM:', hasIntegrationsListInDOM);
    
    // Check if there are any build errors
    console.log('\nAll errors found:', errors);
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testComponentError().catch(console.error);