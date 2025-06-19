const puppeteer = require('puppeteer');

async function checkVoiceButton() {
  console.log('Checking Voice Button Visibility...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to test login
    console.log('1. Navigating to test login...');
    await page.goto('http://localhost:3000/auth/test-login', { 
      waitUntil: 'networkidle2' 
    });
    
    // Click login button
    console.log('2. Logging in...');
    // Wait for button to be visible
    await page.waitForSelector('button.w-full', { visible: true });
    await page.click('button.w-full');
    
    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('   - Redirected to:', page.url());
    
    // Wait a bit for React to render
    await page.waitForTimeout(3000);
    
    // Check for voice button
    console.log('\n3. Checking for voice button...');
    
    // Try multiple selectors
    const selectors = [
      'button svg.lucide-mic',
      'button[title*="voice"]',
      'button[title*="Voice"]',
      '.voice-button',
      'button:has(svg.lucide-mic)',
      'button:has(svg.lucide-mic-off)'
    ];
    
    let found = false;
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`   ✅ Voice button found with selector: ${selector}`);
          found = true;
          
          // Get button details
          const buttonInfo = await page.evaluate((sel) => {
            const btn = document.querySelector(sel);
            if (!btn) return null;
            return {
              className: btn.className,
              title: btn.title || btn.getAttribute('title'),
              innerHTML: btn.innerHTML.substring(0, 100)
            };
          }, selector);
          
          console.log('   Button details:', buttonInfo);
          break;
        }
      } catch (e) {
        // Selector might be invalid, continue
      }
    }
    
    if (!found) {
      console.log('   ❌ Voice button not found');
      
      // Get all buttons in the toolbar
      const toolbarButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons
          .filter(btn => {
            const parent = btn.closest('.enhanced-input-box, [class*="toolbar"], [class*="input"]');
            return parent !== null;
          })
          .map(btn => ({
            className: btn.className,
            title: btn.title,
            hasIcon: btn.querySelector('svg') ? btn.querySelector('svg').className.baseVal : 'no svg'
          }));
      });
      
      console.log('\n   Toolbar buttons found:');
      toolbarButtons.forEach((btn, i) => {
        console.log(`   ${i + 1}. ${btn.hasIcon} - ${btn.title || 'no title'}`);
      });
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'logs/voice-button-check.png',
      fullPage: false 
    });
    console.log('\n4. Screenshot saved to logs/voice-button-check.png');
    
  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await browser.close();
  }
}

checkVoiceButton().catch(console.error);