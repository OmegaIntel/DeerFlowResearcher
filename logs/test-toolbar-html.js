const { chromium } = require('playwright');

async function testToolbarHTML() {
    console.log('Checking toolbar HTML structure...');
    
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
        
        // Type message
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('Test message');
        await page.waitForTimeout(1000);
        
        // Get the entire input box HTML
        const inputBox = page.locator('.rounded-2xl.border').first();
        const inputBoxHTML = await inputBox.innerHTML();
        
        // Find the toolbar section
        const toolbarStart = inputBoxHTML.indexOf('border-t');
        if (toolbarStart !== -1) {
            // Extract toolbar HTML
            const toolbarSection = inputBoxHTML.substring(toolbarStart - 50);
            const toolbarEnd = toolbarSection.indexOf('</div></div>');
            const toolbarHTML = toolbarSection.substring(0, toolbarEnd + 12);
            
            console.log('=== Toolbar HTML Structure ===');
            console.log(toolbarHTML.replace(/></g, '>\n<'));
            
            // Count flex divs
            const flexDivs = (toolbarHTML.match(/flex items-center gap-2/g) || []).length;
            console.log(`\nNumber of flex divs: ${flexDivs}`);
            
            // Look for Send button
            const hasSendText = toolbarHTML.includes('Send');
            const hasSendIcon = toolbarHTML.includes('lucide-send');
            console.log(`Has "Send" text: ${hasSendText}`);
            console.log(`Has send icon: ${hasSendIcon}`);
            
            // Look for model selector
            const hasModelSelector = toolbarHTML.includes('Gemini') || toolbarHTML.includes('Claude');
            console.log(`Has model selector: ${hasModelSelector}`);
        } else {
            console.log('Could not find toolbar section');
        }
        
        // Save full HTML for inspection
        const fs = require('fs');
        fs.writeFileSync('/tmp/input-box-html.html', inputBoxHTML);
        console.log('\nFull HTML saved to /tmp/input-box-html.html');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testToolbarHTML();