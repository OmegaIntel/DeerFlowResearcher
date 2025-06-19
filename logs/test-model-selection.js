const { chromium } = require('playwright');

async function testModelSelection() {
    console.log('Testing model selection functionality...');
    
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
        
        // Test with Gemini first (default)
        console.log('\n=== Testing Gemini 2.5 Flash ===');
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            await textarea.fill('Hello, what model are you?');
            await page.keyboard.press('Enter');
            console.log('✓ Sent test message with Gemini');
            await page.waitForTimeout(3000);
        }
        
        // Wait for response and then test Claude
        await page.waitForTimeout(5000);
        
        // Switch to Claude Sonnet 4
        console.log('\n=== Testing Claude Sonnet 4 ===');
        const modelButton = page.locator('button:has-text("Gemini 2.5 Flash")');
        if (await modelButton.isVisible()) {
            await modelButton.click();
            await page.waitForTimeout(1000);
            
            // Click Claude option
            const claudeOption = page.locator('text=Claude Sonnet 4');
            if (await claudeOption.isVisible()) {
                await claudeOption.click();
                console.log('✓ Switched to Claude Sonnet 4');
                await page.waitForTimeout(1000);
                
                // Send another test message
                if (await textarea.isVisible()) {
                    await textarea.fill('Hello Claude, introduce yourself');
                    await page.keyboard.press('Enter');
                    console.log('✓ Sent test message with Claude');
                    await page.waitForTimeout(3000);
                }
            }
        }
        
        console.log('\n✓ Model selection test completed');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testModelSelection();