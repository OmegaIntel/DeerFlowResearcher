const { chromium } = require('playwright');

async function testSimpleDialog() {
    console.log('Testing simple dialog functionality...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
        // Capture all console logs
        page.on('console', msg => {
            console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
        });
        
        // Navigate and login
        console.log('Navigating and logging in...');
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
        
        // Take screenshot before clicking
        await page.screenshot({ path: '/root/deer-flow/logs/before-connect.png' });
        
        // Check current state
        console.log('Current URL before click:', page.url());
        const dialogExists = await page.locator('[role="dialog"]').count();
        console.log('Dialog elements before click:', dialogExists);
        
        // Find and click Connect button
        const connectButton = page.locator('button:has-text("Connect")').first();
        if (await connectButton.isVisible()) {
            console.log('Clicking Connect button...');
            
            // Listen for navigation
            page.on('framenavigated', frame => {
                if (frame === page.mainFrame()) {
                    console.log('NAVIGATION DETECTED to:', frame.url());
                }
            });
            
            await connectButton.click();
            
            // Wait and check multiple times
            for (let i = 0; i < 5; i++) {
                await page.waitForTimeout(1000);
                const currentUrl = page.url();
                const dialogCount = await page.locator('[role="dialog"]').count();
                const openDialogCount = await page.locator('[data-state="open"][role="dialog"]').count();
                
                console.log(`Check ${i+1}: URL=${currentUrl}, Dialogs=${dialogCount}, Open=${openDialogCount}`);
                
                if (currentUrl !== 'http://localhost:3000/account?tab=integrations') {
                    console.log('❌ Page navigated away from integrations page');
                    break;
                }
                
                if (openDialogCount > 0) {
                    console.log('✅ Dialog is open!');
                    break;
                }
            }
            
            // Final screenshot
            await page.screenshot({ path: '/root/deer-flow/logs/after-connect.png' });
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

testSimpleDialog();