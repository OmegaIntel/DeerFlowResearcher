const { chromium } = require('playwright');

async function testPopupApproach() {
    console.log('Testing popup approach...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
        // Listen for console logs
        page.on('console', msg => {
            console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
        });
        
        // Listen for new popup windows
        page.on('popup', async popup => {
            console.log('✅ POPUP OPENED:', popup.url());
            await popup.waitForTimeout(2000);
            await popup.close();
            console.log('✅ POPUP CLOSED');
        });
        
        // Navigate and login
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        
        if (await page.locator('text=Sign In').isVisible()) {
            await page.click('text=Sign In');
            await page.waitForTimeout(1000);
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        }
        
        // Go to integrations
        await page.goto('http://localhost:3000/account?tab=integrations');
        await page.waitForTimeout(3000);
        
        console.log('Current URL:', page.url());
        
        // Click Connect button
        const connectButton = page.locator('button:has-text("Connect")').first();
        if (await connectButton.isVisible()) {
            console.log('Clicking Connect button...');
            await connectButton.click();
            
            // Wait for popup or navigation
            await page.waitForTimeout(3000);
            
            console.log('Final URL after click:', page.url());
            
            if (page.url() === 'http://localhost:3000/account?tab=integrations') {
                console.log('✅ SUCCESS: Stayed on integrations page (popup likely opened)');
            } else {
                console.log('❌ FAILURE: Navigated away from integrations page');
            }
        } else {
            console.log('❌ No Connect button found');
        }
        
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
        console.log('Test completed');
    }
}

testPopupApproach();