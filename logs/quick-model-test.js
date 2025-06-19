const { chromium } = require('playwright');

async function quickModelTest() {
    console.log('Quick model selection test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Navigate and login
        await page.goto('http://localhost:3000', { timeout: 60000 });
        await page.waitForTimeout(3000);
        
        if (await page.locator('text=Sign In').isVisible()) {
            await page.click('text=Sign In');
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);
        }
        
        // Go to chat
        await page.goto('http://localhost:3000/chat', { timeout: 60000 });
        await page.waitForTimeout(5000);
        
        console.log('✓ Successfully loaded chat page');
        
        // Test quick message with default model (Gemini)
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            await textarea.fill('Hello Gemini');
            await page.keyboard.press('Enter');
            console.log('✓ Sent message with Gemini');
            await page.waitForTimeout(8000); // Wait for response
        }
        
        // Switch to Claude and test
        const modelButton = page.locator('button').filter({ hasText: 'Gemini 2.5 Flash' });
        if (await modelButton.isVisible()) {
            await modelButton.click();
            await page.waitForTimeout(1000);
            
            const claudeOption = page.locator('text=Claude Sonnet 4');
            if (await claudeOption.isVisible()) {
                await claudeOption.click();
                console.log('✓ Switched to Claude Sonnet 4');
                await page.waitForTimeout(2000);
                
                // Send message with Claude
                if (await textarea.isVisible()) {
                    await textarea.fill('Hello Claude, what model are you?');
                    await page.keyboard.press('Enter');
                    console.log('✓ Sent message with Claude');
                    await page.waitForTimeout(8000);
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

quickModelTest();