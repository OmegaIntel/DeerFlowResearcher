const { chromium } = require('playwright');

async function testVisualDebug() {
    console.log('Visual debugging test...');
    
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
        
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(5000);
        
        // Type message to enable send button
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('Test message');
        await page.waitForTimeout(1000);
        
        // Take full page screenshot
        await page.screenshot({ path: '/tmp/full-page.png', fullPage: true });
        
        // Focus on input area
        const inputBox = page.locator('.rounded-2xl.border').first();
        await inputBox.screenshot({ path: '/tmp/input-box.png' });
        
        // Debug bottom toolbar
        const toolbar = page.locator('.border-t').first();
        if (await toolbar.isVisible()) {
            await toolbar.screenshot({ path: '/tmp/toolbar.png' });
            
            // Get toolbar HTML
            const toolbarHtml = await toolbar.innerHTML();
            console.log('Toolbar HTML:', toolbarHtml.substring(0, 500) + '...');
            
            // Count elements in toolbar
            const buttons = await toolbar.locator('button').count();
            console.log(`Buttons in toolbar: ${buttons}`);
            
            // List all button texts
            const allButtons = await toolbar.locator('button').all();
            for (let i = 0; i < allButtons.length; i++) {
                const text = await allButtons[i].textContent();
                const isVisible = await allButtons[i].isVisible();
                console.log(`Button ${i}: "${text?.trim()}" (visible: ${isVisible})`);
            }
        }
        
        console.log('\nScreenshots saved to /tmp/');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testVisualDebug();