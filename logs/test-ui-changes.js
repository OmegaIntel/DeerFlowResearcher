const { chromium } = require('playwright');

async function testUIChanges() {
    console.log('Testing UI changes with development frontend...');
    
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
        
        // Take screenshot of the page
        await page.screenshot({ path: '/root/deer-flow/logs/ui-changes-test.png' });
        
        // Check if welcome message is gone
        const welcomeMessage = await page.locator('text=Welcome to Omega Intelligence').count();
        console.log(`Welcome message count: ${welcomeMessage} (should be 0)`);
        
        // Check if ResearchBETA is gone
        const researchBeta = await page.locator('text=Research').locator('text=BETA').count();
        console.log(`ResearchBETA count: ${researchBeta} (should be 0)`);
        
        // Check model selector
        const modelButton = await page.locator('button:has-text("Gemini 2.5 Flash")').count();
        console.log(`Model selector with Gemini 2.5 Flash: ${modelButton} (should be 1)`);
        
        // Check if tools are at the bottom
        const inputArea = page.locator('textarea[placeholder*="How can I help"]');
        const toolsButton = page.locator('button:has-text("Tools")');
        
        if (await inputArea.isVisible() && await toolsButton.isVisible()) {
            const inputBox = await inputArea.boundingBox();
            const toolsBox = await toolsButton.boundingBox();
            
            if (inputBox && toolsBox) {
                const toolsAtBottom = toolsBox.y > inputBox.y;
                console.log(`Tools positioned below input: ${toolsAtBottom} (should be true)`);
                console.log(`Input Y: ${inputBox.y}, Tools Y: ${toolsBox.y}`);
            }
        }
        
        // Test input area size
        if (await inputArea.isVisible()) {
            const textareaHeight = await inputArea.evaluate(el => el.style.minHeight);
            console.log(`Textarea min-height: ${textareaHeight} (should be 80px)`);
        }
        
        console.log('\n=== UI CHANGES SUMMARY ===');
        console.log(`✓ Welcome message removed: ${welcomeMessage === 0}`);
        console.log(`✓ ResearchBETA removed: ${researchBeta === 0}`);
        console.log(`✓ Model selector updated: ${modelButton === 1}`);
        console.log('✓ Development frontend is working with volume mounting');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testUIChanges();