const { chromium } = require('playwright');

async function testQuickVisual() {
    console.log('Quick visual test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Navigate and login
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        
        console.log('Current URL:', page.url());
        
        if (await page.locator('text=Sign In').isVisible()) {
            console.log('Logging in...');
            await page.click('text=Sign In');
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        }
        
        console.log('Navigating to chat...');
        await page.goto('http://localhost:3000/chat');
        
        // Wait for chat page to load
        await page.waitForSelector('textarea', { timeout: 60000 });
        console.log('✓ Chat page loaded');
        
        // Type message
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('Test message');
        await page.waitForTimeout(1000);
        
        // Count all buttons
        const allButtons = await page.locator('button').count();
        console.log(`Total buttons on page: ${allButtons}`);
        
        // Look for send button
        const sendByText = await page.locator('button:has-text("Send")').count();
        const sendByIcon = await page.locator('button:has(svg[class*="send"])').count();
        console.log(`Buttons with "Send" text: ${sendByText}`);
        console.log(`Buttons with send icon: ${sendByIcon}`);
        
        // Check toolbar structure
        const toolbar = page.locator('.border-t').first();
        const toolbarButtons = await toolbar.locator('button').count();
        console.log(`Buttons in toolbar: ${toolbarButtons}`);
        
        // Check for paperclip
        const paperclipButtons = await page.locator('button:has(svg[class*="paperclip"])').count();
        console.log(`Paperclip buttons: ${paperclipButtons}`);
        
        // Take screenshot
        await page.screenshot({ path: '/tmp/quick-visual.png' });
        console.log('Screenshot saved to /tmp/quick-visual.png');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testQuickVisual();