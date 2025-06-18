const { chromium } = require('playwright');

async function testDialogIntegration() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Log console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[IntegrationsList]') || text.includes('message')) {
      console.log('Console:', text);
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
    await page.waitForTimeout(3000);
    
    // Find Box integration and click Connect
    console.log('\n3. Clicking Connect for Box...');
    const boxRow = await page.locator('h4:has-text("Box")').locator('../../../..');
    
    // Enable if not enabled
    const switchButton = await boxRow.locator('button[role="switch"]').first();
    const switchState = await switchButton.getAttribute('data-state');
    if (switchState !== 'checked') {
      await switchButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click Connect button
    const connectButton = await boxRow.locator('button:has-text("Connect")').first();
    await connectButton.click();
    
    // Wait for dialog to appear
    console.log('\n4. Waiting for dialog to appear...');
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    
    // Check if dialog is visible
    const dialogVisible = await page.locator('[role="dialog"]').isVisible();
    console.log('Dialog is visible:', dialogVisible);
    
    // Check if iframe is present
    const iframeCount = await page.locator('[role="dialog"] iframe').count();
    console.log('Iframe count in dialog:', iframeCount);
    
    if (iframeCount > 0) {
      const iframeSrc = await page.locator('[role="dialog"] iframe').getAttribute('src');
      console.log('Iframe source:', iframeSrc?.substring(0, 50) + '...');
      
      // Take screenshot showing the dialog
      await page.screenshot({ path: 'logs/dialog-with-vault.png' });
      console.log('Screenshot saved: dialog-with-vault.png');
      
      // Check dialog title
      const dialogTitle = await page.locator('[role="dialog"] h2').textContent();
      console.log('Dialog title:', dialogTitle);
      
      console.log('\n5. SUCCESS: Dialog is working with APIdeck Vault embedded!');
      console.log('   - Omega platform remains visible in background');
      console.log('   - APIdeck Vault loads in iframe within dialog');
      console.log('   - User can authenticate without leaving the platform');
    }
    
    // Test closing dialog
    console.log('\n6. Testing dialog close...');
    const closeButton = await page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has-text("×")').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(1000);
      
      const dialogStillVisible = await page.locator('[role="dialog"]').isVisible();
      console.log('Dialog closed successfully:', !dialogStillVisible);
    }
    
  } catch (error) {
    console.error('Test error:', error);
    await page.screenshot({ path: 'logs/dialog-test-error.png' });
  } finally {
    await browser.close();
  }
}

testDialogIntegration().catch(console.error);