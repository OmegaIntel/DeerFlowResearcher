const puppeteer = require('puppeteer');

async function directChatCheck() {
  console.log('Direct Chat Page Check...\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    console.log('Browser Console:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('Page Error:', error.message);
  });
  
  try {
    // Navigate directly to chat (might redirect to login)
    console.log('1. Navigating to chat page...');
    await page.goto('http://localhost:3000/chat', { 
      waitUntil: 'networkidle2' 
    });
    
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);
    
    if (currentUrl.includes('login')) {
      console.log('\n2. On login page, need to authenticate first');
      console.log('   Please login manually and then check the chat page');
    } else {
      console.log('\n2. Checking input area...');
      
      // Check for input textarea
      const textarea = await page.$('textarea');
      console.log('   Textarea found:', !!textarea);
      
      // Check for any buttons in the input area
      const buttons = await page.evaluate(() => {
        const allButtons = Array.from(document.querySelectorAll('button'));
        return allButtons.map(btn => {
          const svg = btn.querySelector('svg');
          return {
            text: btn.textContent.trim(),
            svgClass: svg ? svg.getAttribute('class') : null,
            title: btn.getAttribute('title'),
            className: btn.className
          };
        });
      });
      
      console.log('\n   All buttons found:', buttons.length);
      buttons.forEach((btn, i) => {
        if (btn.svgClass || btn.title) {
          console.log(`   ${i + 1}. SVG: ${btn.svgClass}, Title: ${btn.title}`);
        }
      });
      
      // Check React fiber
      const hasReactFiber = await page.evaluate(() => {
        const root = document.getElementById('root') || document.querySelector('[data-reactroot]');
        return root && root._reactRootContainer ? 'React Root Found' : 'No React Root';
      });
      console.log('\n3. React Status:', hasReactFiber);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'logs/direct-chat-check.png',
      fullPage: false 
    });
    console.log('\n4. Screenshot saved to logs/direct-chat-check.png');
    
  } catch (error) {
    console.error('\nError:', error.message);
  } finally {
    await browser.close();
  }
}

directChatCheck().catch(console.error);