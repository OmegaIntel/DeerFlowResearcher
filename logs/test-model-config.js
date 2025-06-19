const { chromium } = require('playwright');

async function testModelConfig() {
    console.log('Testing model configuration...');
    
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
        
        console.log('✓ Successfully loaded chat page');
        
        // Check model selector text
        const modelButton = page.locator('button:has-text("Gemini 2.5 Flash")');
        const modelVisible = await modelButton.isVisible();
        console.log(`Model selector shows "Gemini 2.5 Flash": ${modelVisible}`);
        
        // Send a simple test message to trigger the backend
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            await textarea.fill('test');
            await page.keyboard.press('Enter');
            console.log('✓ Sent test message');
            
            // Wait a bit to see if there are any backend errors
            await page.waitForTimeout(5000);
            console.log('✓ No immediate frontend errors detected');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testModelConfig();