const { chromium } = require('playwright');

async function testPageContent() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Go to integrations
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    // Get the page content
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check what's actually on the page
    const hasEnterpriseSection = await page.locator('text=Enterprise Integrations').count();
    console.log('Has Enterprise Integrations section:', hasEnterpriseSection > 0);
    
    const hasBox = await page.locator('text=Box').count();
    console.log('Has Box integration:', hasBox > 0);
    
    // Get all visible text
    const integrationsTab = await page.locator('[role="tabpanel"][data-state="active"]');
    if (await integrationsTab.count() > 0) {
      const tabContent = await integrationsTab.textContent();
      console.log('\nIntegrations tab content:', tabContent.substring(0, 200) + '...');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'logs/integrations-content.png', fullPage: true });
    
    // Check for any card titles
    const cardTitles = await page.locator('.card-title').allTextContents();
    console.log('\nCard titles found:', cardTitles);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testPageContent().catch(console.error);