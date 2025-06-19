const { chromium } = require('playwright');

async function simpleModelTest() {
    console.log('Simple model test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Monitor network requests
        const requests = [];
        page.on('request', request => {
            if (request.url().includes('/api/chat/simple')) {
                const postData = request.postData();
                requests.push({
                    url: request.url(),
                    method: request.method(),
                    body: postData
                });
            }
        });
        
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
        
        // Just send one quick message and check the request
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            await textarea.fill('test');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
            
            // Check if we captured any requests
            if (requests.length > 0) {
                console.log('=== API Request Details ===');
                requests.forEach((req, i) => {
                    console.log(`Request ${i + 1}:`);
                    console.log('Body:', req.body);
                    
                    try {
                        const parsed = JSON.parse(req.body);
                        console.log('Parsed body:');
                        console.log('- thread_id:', parsed.thread_id);
                        console.log('- model:', parsed.model);
                        console.log('- messages:', parsed.messages?.length, 'messages');
                    } catch (e) {
                        console.log('Could not parse body as JSON');
                    }
                });
            } else {
                console.log('No API requests captured');
            }
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

simpleModelTest();