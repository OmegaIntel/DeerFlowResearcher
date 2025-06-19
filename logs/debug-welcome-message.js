const { chromium } = require('playwright');

async function debugWelcomeMessage() {
    console.log('Debugging welcome message location...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Navigate and login
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        
        if (await page.locator('text=Sign In').isVisible()) {
            await page.click('text=Sign In');
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        }
        
        // Go to chat
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(3000);
        
        // Look for any element containing "Welcome"
        const welcomeElements = await page.locator('*:has-text("Welcome")').all();
        console.log(`Found ${welcomeElements.length} elements with "Welcome"`);
        
        for (let i = 0; i < welcomeElements.length; i++) {
            const element = welcomeElements[i];
            const text = await element.textContent();
            const tagName = await element.evaluate(el => el.tagName);
            const className = await element.evaluate(el => el.className);
            console.log(`Element ${i + 1}:`);
            console.log(`  Tag: ${tagName}`);
            console.log(`  Class: ${className}`);
            console.log(`  Text: ${text?.substring(0, 200)}`);
            console.log('---');
        }
        
        // Also check page title
        const title = await page.title();
        console.log(`Page title: ${title}`);
        
        // Take screenshot
        await page.screenshot({ path: '/root/deer-flow/logs/debug-welcome.png' });
        
    } catch (error) {
        console.error('Debug error:', error.message);
    } finally {
        await browser.close();
    }
}

debugWelcomeMessage();