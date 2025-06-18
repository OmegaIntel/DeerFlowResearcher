const { chromium } = require('playwright');

async function testAPIDeckWithOAuth() {
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    ignoreHTTPSErrors: true
  });
  
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('Integration')) {
      console.log('Browser console:', msg.type(), msg.text());
    }
  });
  
  // Log network requests
  page.on('request', request => {
    if (request.url().includes('integration')) {
      console.log('Request:', request.method(), request.url());
      const headers = request.headers();
      if (headers.authorization) {
        console.log('Auth header present:', headers.authorization.substring(0, 20) + '...');
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('integration')) {
      console.log('Response:', response.status(), response.url());
    }
  });
  
  try {
    console.log('1. Trying regular login first...');
    await page.goto('http://localhost:3000/auth/login');
    await page.waitForLoadState('networkidle');
    
    console.log('2. Filling login form...');
    await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
    await page.fill('input[type="password"]', 'Test123.');
    
    console.log('3. Clicking login button...');
    await page.click('button[type="submit"]');
    
    // Wait a bit to see if login works
    await page.waitForTimeout(3000);
    
    // Check if we're still on login page
    if (page.url().includes('login')) {
      console.log('4. Regular login failed, checking page content...');
      const errorText = await page.textContent('body');
      if (errorText.includes('Incorrect')) {
        console.log('Login error found on page');
      }
      
      // Take screenshot
      await page.screenshot({ path: 'logs/login-failed.png' });
      
      // Try to access directly with a manual token if available
      console.log('5. Attempting direct navigation with manual authentication...');
      
      // First, let's check if we can access the API directly
      const apiResponse = await page.evaluate(async () => {
        try {
          const response = await fetch('http://localhost:8000/api/integrations/test');
          return { status: response.status, text: await response.text() };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      console.log('API test response:', apiResponse);
      
    } else {
      console.log('4. Login successful! Current URL:', page.url());
      
      console.log('5. Navigating to integrations page...');
      await page.goto('http://localhost:3000/account?tab=integrations');
      await page.waitForLoadState('networkidle');
      
      await testIntegrations(page);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    await page.screenshot({ path: 'logs/error-oauth-screenshot.png' });
  } finally {
    await browser.close();
  }
}

async function testIntegrations(page) {
  console.log('6. Testing integrations functionality...');
  
  // Wait for integrations to load
  try {
    await page.waitForSelector('text=Enterprise Integrations', { timeout: 5000 });
    console.log('7. Found Enterprise Integrations section');
    
    // Take screenshot
    await page.screenshot({ path: 'logs/integrations-loaded.png' });
    
    // Look for Box integration
    const boxSection = await page.locator('h4:has-text("Box")').first();
    if (await boxSection.count() > 0) {
      console.log('8. Found Box integration');
      
      // Find the parent container
      const boxContainer = await boxSection.locator('../../../..');
      
      // Find the switch
      const switchButton = await boxContainer.locator('button[role="switch"]').first();
      if (await switchButton.count() > 0) {
        const isChecked = await switchButton.getAttribute('data-state');
        console.log('9. Switch state:', isChecked);
        
        if (isChecked !== 'checked') {
          console.log('10. Clicking switch to enable...');
          await switchButton.click();
          await page.waitForTimeout(2000);
          
          // Check for Connect button
          const connectButton = await boxContainer.locator('button:has-text("Connect")').first();
          if (await connectButton.count() > 0) {
            console.log('11. Connect button appeared!');
            await page.screenshot({ path: 'logs/connect-button-visible.png' });
            
            console.log('12. Clicking Connect button...');
            await connectButton.click();
            await page.waitForTimeout(3000);
            
            // Check for any new windows/popups
            const pages = context.pages();
            console.log('Number of pages open:', pages.length);
            
            // Take final screenshot
            await page.screenshot({ path: 'logs/after-connect.png' });
          }
        } else {
          console.log('10. Box is already enabled');
        }
      }
    }
    
    // Check for error toasts
    const toasts = await page.locator('[data-sonner-toast]').allTextContents();
    if (toasts.length > 0) {
      console.log('Toast messages:', toasts);
    }
    
  } catch (error) {
    console.log('Error during integration test:', error.message);
  }
}

// Run the test
testAPIDeckWithOAuth().catch(console.error);