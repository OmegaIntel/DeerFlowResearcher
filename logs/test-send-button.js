const { chromium } = require('playwright');

async function testSendButton() {
    console.log('Testing Send button specifically...');
    
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
        
        // Type message to enable send button
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('Test message');
        await page.waitForTimeout(1000);
        
        // Look for send button with various selectors
        console.log('\n=== Send Button Search ===');
        
        // Method 1: By text
        const sendByText = await page.locator('button:has-text("Send")').count();
        console.log(`Buttons with "Send" text: ${sendByText}`);
        
        // Method 2: By icon class
        const sendByIcon = await page.locator('button:has(svg.lucide-send)').count();
        console.log(`Buttons with send icon: ${sendByIcon}`);
        
        // Method 3: All buttons in the main container
        const mainContainer = page.locator('.rounded-2xl.border').first();
        const buttonsInContainer = await mainContainer.locator('button').count();
        console.log(`Total buttons in input container: ${buttonsInContainer}`);
        
        // List all buttons with their content
        const allButtons = await mainContainer.locator('button').all();
        for (let i = 0; i < allButtons.length; i++) {
            const text = await allButtons[i].textContent();
            const innerHTML = await allButtons[i].innerHTML();
            console.log(`\nButton ${i}:`);
            console.log(`  Text: "${text?.trim()}"`);
            console.log(`  Has Send in HTML: ${innerHTML.includes('Send')}`);
            console.log(`  Has send icon: ${innerHTML.includes('lucide-send')}`);
            
            // Check parent visibility
            const parent = allButtons[i].locator('..');
            const parentVisible = await parent.isVisible();
            console.log(`  Parent visible: ${parentVisible}`);
        }
        
        // Check the bottom toolbar structure
        console.log('\n=== Toolbar Structure ===');
        const toolbar = mainContainer.locator('.border-t').first();
        const toolbarChildren = await toolbar.locator('> div').count();
        console.log(`Direct children of toolbar: ${toolbarChildren}`);
        
        for (let i = 0; i < toolbarChildren; i++) {
            const child = toolbar.locator('> div').nth(i);
            const childButtons = await child.locator('button').count();
            const classes = await child.getAttribute('class');
            console.log(`Child ${i}: ${childButtons} buttons (classes: ${classes})`);
        }
        
        // Take screenshot of the whole input area
        await mainContainer.screenshot({ path: '/tmp/input-container-debug.png' });
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testSendButton();