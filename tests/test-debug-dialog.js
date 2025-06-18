const { chromium } = require('playwright');

async function testDebugDialog() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log ALL console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });
  
  try {
    // Login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Navigate to integrations
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    // Click Connect
    const boxRow = await page.locator('h4:has-text("Box")').locator('../../../..');
    const connectButton = await boxRow.locator('button:has-text("Connect")').first();
    
    console.log('\n=== CLICKING CONNECT BUTTON ===');
    await connectButton.click();
    await page.waitForTimeout(2000);
    
    // Check state after click
    console.log('\n=== CHECKING PAGE STATE ===');
    
    // Check for any dialogs or modals
    const dialogs = await page.locator('[role="dialog"]').count();
    console.log('Dialogs found:', dialogs);
    
    const modals = await page.locator('.modal, [data-modal]').count();
    console.log('Modals found:', modals);
    
    // Check for overlay
    const overlays = await page.locator('[data-radix-dialog-overlay], .dialog-overlay').count();
    console.log('Overlays found:', overlays);
    
    // Check if any iframe exists
    const iframes = await page.locator('iframe').count();
    console.log('Iframes found:', iframes);
    
    // Check current URL
    console.log('Current URL:', page.url());
    
    // Get page title
    console.log('Page title:', await page.title());
    
    // Take screenshot
    await page.screenshot({ path: 'logs/debug-after-connect-click.png' });
    
    // Check for any error toasts
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    if (toasts.length > 0) {
      console.log('Toast messages:', toasts);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testDebugDialog().catch(console.error);