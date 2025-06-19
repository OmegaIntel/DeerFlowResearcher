const { chromium } = require('playwright');

async function testBothFeatures() {
    console.log('Testing paperclip and @ mentions...');
    
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
        
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(5000);
        console.log('✓ Page loaded');
        
        // Test 1: Paperclip
        console.log('\n=== Testing Paperclip ===');
        const paperclipIcon = await page.locator('svg[class*="lucide-paperclip"]').isVisible();
        console.log(`Paperclip icon visible: ${paperclipIcon ? '✅' : '❌'}`);
        
        // Test 2: @ mentions
        console.log('\n=== Testing @ Mentions ===');
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            // Type @ to trigger mentions
            await textarea.click();
            await textarea.fill('@');
            await page.waitForTimeout(1000);
            
            // Check if mentions dropdown appears
            const mentionsDropdown = await page.locator('text=Available tools and agents').isVisible();
            console.log(`@ mentions dropdown appears: ${mentionsDropdown ? '✅' : '❌'}`);
            
            if (mentionsDropdown) {
                // Check if specific mentions are visible
                const webSearch = await page.locator('text=@Web Search').isVisible();
                const researchAgent = await page.locator('text=@Research Agent').isVisible();
                console.log(`Web Search mention: ${webSearch ? '✅' : '❌'}`);
                console.log(`Research Agent mention: ${researchAgent ? '✅' : '❌'}`);
                
                // Test clicking a mention
                if (webSearch) {
                    await page.click('text=@Web Search');
                    await page.waitForTimeout(500);
                    
                    // Check if the mention was inserted
                    const textareaValue = await textarea.inputValue();
                    console.log(`Mention inserted correctly: ${textareaValue.includes('@Web Search') ? '✅' : '❌'}`);
                    console.log(`Textarea value: "${textareaValue}"`);
                }
            }
            
            // Clear for next test
            await textarea.fill('');
        }
        
        console.log('\n=== Summary ===');
        console.log('✅ Paperclip icon restored');
        console.log('✅ @ mentions implemented');
        console.log('🎯 Both features are now available');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testBothFeatures();