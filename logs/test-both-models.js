const { chromium } = require('playwright');

async function testBothModels() {
    console.log('Testing both models...');
    
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
                    body: postData,
                    timestamp: new Date().toISOString()
                });
            }
        });
        
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
        await page.waitForTimeout(3000);
        console.log('✓ Page loaded');
        
        // Test 1: Default Gemini model
        console.log('\n=== Test 1: Gemini (default) ===');
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            await textarea.fill('Hello from Gemini');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
        }
        
        // Test 2: Switch to Claude
        console.log('\n=== Test 2: Switching to Claude ===');
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
        
        // Send message with Claude
        if (await textarea.isVisible()) {
            await textarea.fill('Hello from Claude');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(3000);
        }
        
        // Analyze the requests
        console.log('\n=== Request Analysis ===');
        requests.forEach((req, i) => {
            try {
                const parsed = JSON.parse(req.body);
                const message = parsed.messages?.[0]?.content || 'Unknown';
                console.log(`Request ${i + 1}: "${message}" -> Model: ${parsed.model}`);
            } catch (e) {
                console.log(`Request ${i + 1}: Could not parse`);
            }
        });
        
        console.log('\n✓ Both model test completed');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testBothModels();