const { chromium } = require('playwright');

async function quickPaperclipTest() {
    console.log('Quick paperclip test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Navigate and login quickly
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
        await page.waitForTimeout(3000);
        console.log('✓ Page loaded');
        
        // Check for paperclip icon specifically
        const paperclipIcon = await page.locator('svg[class*="lucide-paperclip"]').isVisible();
        console.log(`Paperclip icon visible: ${paperclipIcon}`);
        
        // Alternative check
        const paperclipButton = await page.locator('button:has(svg[class*="paperclip"])').isVisible();
        console.log(`Paperclip button visible: ${paperclipButton}`);
        
        // Check if the file input is there
        const fileInput = await page.locator('input[type="file"]').isVisible();
        console.log(`File input present: ${fileInput}`);
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

quickPaperclipTest();