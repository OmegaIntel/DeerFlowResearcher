const { chromium } = require('playwright');

async function testFrontendModel() {
    console.log('Testing frontend model parameter sending...');
    
    const browser = await chromium.launch({ 
        headless: false,  // Show browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Listen to console logs
        page.on('console', msg => {
            if (msg.text().includes('chatSimpleStream') || msg.text().includes('model')) {
                console.log('Browser console:', msg.text());
            }
        });
        
        // Listen to network requests
        page.on('request', request => {
            if (request.url().includes('/api/chat/simple')) {
                console.log('API Request URL:', request.url());
                console.log('API Request Method:', request.method());
                console.log('API Request Headers:', request.headers());
                try {
                    const postData = request.postData();
                    if (postData) {
                        console.log('API Request Body:', postData);
                    }
                } catch (e) {
                    console.log('Could not read request body');
                }
            }
        });
        
        // Navigate and login
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(3000);
        
        if (await page.locator('text=Sign In').isVisible()) {
            await page.click('text=Sign In');
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);
        }
        
        // Go to chat
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(5000);
        
        console.log('✓ Successfully loaded chat page');
        
        // Switch to Claude first
        const modelButton = page.locator('button').filter({ hasText: 'Gemini 2.5 Flash' });
        if (await modelButton.isVisible()) {
            await modelButton.click();
            await page.waitForTimeout(1000);
            
            const claudeOption = page.locator('text=Claude Sonnet 4');
            if (await claudeOption.isVisible()) {
                await claudeOption.click();
                console.log('✓ Switched to Claude Sonnet 4');
                await page.waitForTimeout(2000);
            }
        }
        
        // Send message and observe the request
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            console.log('=== Sending message with Claude selected ===');
            await textarea.fill('Hello Claude, what model are you?');
            await page.keyboard.press('Enter');
            console.log('✓ Sent message with Claude');
            await page.waitForTimeout(5000);
        }
        
        console.log('\n✓ Frontend model test completed');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testFrontendModel();