const { chromium } = require('playwright');

async function testSendButtonFinal() {
    console.log('Final test for Send button...');
    
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
            console.log('Logging in...');
            await page.click('text=Sign In');
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        }
        
        console.log('Navigating to chat...');
        await page.goto('http://localhost:3000/chat');
        
        // Wait for compilation and page load
        console.log('Waiting for page to compile and load...');
        await page.waitForTimeout(40000); // Give it 40 seconds to compile
        
        // Check if textarea is visible
        const textareaVisible = await page.locator('textarea').isVisible();
        console.log(`Textarea visible: ${textareaVisible ? '✅' : '❌'}`);
        
        if (textareaVisible) {
            // Type message
            await page.locator('textarea').fill('Test message');
            await page.waitForTimeout(1000);
            
            // Count all buttons
            const allButtons = await page.locator('button').count();
            console.log(`\nTotal buttons on page: ${allButtons}`);
            
            // List all buttons
            const buttons = await page.locator('button').all();
            for (let i = 0; i < buttons.length; i++) {
                const text = await buttons[i].textContent();
                const isVisible = await buttons[i].isVisible();
                if (text || isVisible) {
                    console.log(`Button ${i}: "${text?.trim() || '[no text]'}" (visible: ${isVisible})`);
                }
            }
            
            // Specific checks
            console.log('\n=== Specific Button Checks ===');
            const sendText = await page.locator('button:has-text("Send")').count();
            const paperclip = await page.locator('button:has(svg[class*="paperclip"])').count();
            console.log(`Send buttons: ${sendText}`);
            console.log(`Paperclip buttons: ${paperclip}`);
            
            // Take screenshot
            await page.screenshot({ path: '/tmp/send-button-final.png' });
            console.log('\nScreenshot saved to /tmp/send-button-final.png');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testSendButtonFinal();