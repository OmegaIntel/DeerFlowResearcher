const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to application...');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the page to load
    await page.waitForTimeout(3000);
    
    // Check what's on the page
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: window.location.href,
      bodyText: document.body.innerText.substring(0, 1000),
      hasEmailInput: !!document.querySelector('input[type="email"]'),
      hasPasswordInput: !!document.querySelector('input[type="password"]'),
      allInputs: Array.from(document.querySelectorAll('input')).map(i => ({ type: i.type, placeholder: i.placeholder })),
      allButtons: Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()).filter(t => t)
    }));
    
    console.log('Homepage info:', JSON.stringify(pageInfo, null, 2));
    
    // Take a screenshot to see what's on the page
    await page.screenshot({ path: '/root/deer-flow/logs/homepage-debug.png' });
    console.log('Screenshot saved to homepage-debug.png');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();