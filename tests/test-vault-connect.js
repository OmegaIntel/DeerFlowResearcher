const { chromium } = require('playwright');
const fetch = require('node-fetch');

async function testVaultConnect() {
  // Login first
  const formData = new URLSearchParams();
  formData.append('username', 'chetan@omegaintelligence.ai');
  formData.append('password', 'Test123.');
  
  const loginResponse = await fetch('http://localhost:8000/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString()
  });

  const loginData = await loginResponse.json();
  const token = loginData.access_token;
  console.log('Got auth token');

  // Enable Box integration
  await fetch('http://localhost:8000/api/integrations/box/enable', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  // Get vault URL
  const connectResponse = await fetch('http://localhost:8000/api/integrations/box/connect', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  const connectData = await connectResponse.json();
  console.log('Vault URL:', connectData.vault_url);

  // Open browser
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  try {
    console.log('Opening APIdeck Vault...');
    await page.goto(connectData.vault_url);
    await page.waitForLoadState('networkidle');
    
    // Take initial screenshot
    await page.screenshot({ path: 'logs/vault-initial.png' });
    
    // Click on Box
    console.log('Clicking on Box...');
    const boxCard = await page.locator('text=Box').first();
    await boxCard.click();
    
    await page.waitForTimeout(3000);
    
    // Take screenshot after click
    await page.screenshot({ path: 'logs/vault-box-clicked.png' });
    
    console.log('Current URL:', page.url());
    
    // Check if there's a connect button or form
    const connectButton = await page.locator('button:has-text("Connect"), button:has-text("Authorize"), button:has-text("Add")').first();
    if (await connectButton.count() > 0) {
      console.log('Found connect/authorize button, clicking...');
      await connectButton.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'logs/vault-after-connect.png' });
    }
    
    // Check for any error messages
    const errorMessages = await page.locator('.error, [role="alert"], .text-red-500').allTextContents();
    if (errorMessages.length > 0) {
      console.log('Error messages found:', errorMessages);
    }
    
  } catch (error) {
    console.error('Error:', error);
    await page.screenshot({ path: 'logs/vault-error.png' });
  } finally {
    await browser.close();
  }
}

testVaultConnect().catch(console.error);