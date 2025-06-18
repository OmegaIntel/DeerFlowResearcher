const { chromium } = require('playwright');

async function testVaultOpening() {
  console.log('Testing APIdeck Vault URL...');
  
  // First, let's get a vault session URL
  const fetch = require('node-fetch');
  
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

  // Now test opening it in a browser
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Opening APIdeck Vault...');
    await page.goto(connectData.vault_url);
    
    // Wait to see what happens
    await page.waitForTimeout(10000);
    
    // Take screenshot
    await page.screenshot({ path: 'logs/vault-page.png' });
    
    console.log('Current URL:', page.url());
    console.log('Page title:', await page.title());
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

testVaultOpening().catch(console.error);