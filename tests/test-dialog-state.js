const { chromium } = require('playwright');

async function testDialogState() {
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
    await page.waitForTimeout(3000);
    
    // Navigate to integrations
    await page.goto('http://localhost:3000/account?tab=integrations');
    await page.waitForTimeout(3000);
    
    // Inject some debugging JavaScript to check the component state
    const dialogState = await page.evaluate(() => {
      // Check if any elements with dialog-related attributes exist
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
      const content = document.querySelectorAll('[data-radix-dialog-content]');
      
      return {
        dialogCount: dialogs.length,
        overlayCount: overlays.length,
        contentCount: content.length,
        bodyDataState: document.body.getAttribute('data-state'),
        htmlDataState: document.documentElement.getAttribute('data-state')
      };
    });
    
    console.log('Initial dialog state:', dialogState);
    
    // Try to manually trigger the dialog by checking React state
    const componentState = await page.evaluate(() => {
      // Look for React fiber nodes that might contain our state
      const integrationsElement = document.querySelector('[data-testid="integrations-list"], .integrations-list');
      if (integrationsElement) {
        // Try to access React props (this is a hack but might work in dev)
        const reactKey = Object.keys(integrationsElement).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('__reactFiber'));
        if (reactKey) {
          const fiberNode = integrationsElement[reactKey];
          console.log('Found React fiber node');
          return 'React node found';
        }
      }
      return 'No React node found';
    });
    
    console.log('Component state check:', componentState);
    
    // Now click Connect and check what happens
    console.log('\nClicking Connect button...');
    const boxRow = await page.locator('h4:has-text("Box")').locator('../../../..');
    const connectButton = await boxRow.locator('button:has-text("Connect")').first();
    
    // Listen for the console logs around the click
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));
    
    await connectButton.click();
    await page.waitForTimeout(1000);
    
    // Check logs for our dialog state changes
    const relevantLogs = logs.filter(log => 
      log.includes('Connect response') || 
      log.includes('vault_url') || 
      log.includes('isVaultOpen') ||
      log.includes('setVaultUrl')
    );
    
    console.log('Relevant logs:', relevantLogs);
    
    // Check current URL - if it changed, the redirect happened instead of dialog
    console.log('Current URL after click:', page.url());
    
    // Check if we're on APIdeck page
    if (page.url().includes('vault.apideck.com')) {
      console.log('❌ Still redirecting to APIdeck instead of opening dialog');
      console.log('This means the component changes are not taking effect');
    } else {
      // Check for dialog again
      const postClickDialogState = await page.evaluate(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay]');
        return {
          dialogCount: dialogs.length,
          overlayCount: overlays.length,
          visible: dialogs.length > 0 && Array.from(dialogs).some(d => d.style.display !== 'none')
        };
      });
      
      console.log('Post-click dialog state:', postClickDialogState);
      
      if (postClickDialogState.dialogCount > 0) {
        console.log('✅ Dialog is working!');
      } else {
        console.log('❌ Dialog still not appearing');
      }
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await browser.close();
  }
}

testDialogState().catch(console.error);