const { chromium } = require('playwright');

async function testDialogImplementation() {
    console.log('Starting dialog implementation test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
        // Navigate to the application
        console.log('Navigating to application...');
        await page.goto('http://localhost:3000');
        
        // Wait for page to load
        await page.waitForTimeout(2000);
        
        // Screenshot of home page
        await page.screenshot({ path: '/root/deer-flow/logs/test-1-home.png' });
        
        // Check if user is logged in, if not login
        if (await page.locator('text=Sign In').isVisible()) {
            console.log('Not logged in, signing in...');
            await page.click('text=Sign In');
            await page.waitForTimeout(1000);
            
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            
            await page.waitForTimeout(3000);
        }
        
        // Navigate to account page
        console.log('Navigating to account page...');
        await page.goto('http://localhost:3000/account?tab=integrations');
        await page.waitForTimeout(2000);
        
        // Screenshot of integrations page
        await page.screenshot({ path: '/root/deer-flow/logs/test-2-integrations.png' });
        
        // Find and click a Connect button for one of the enterprise integrations
        console.log('Looking for Connect button...');
        const connectButton = page.locator('button:has-text("Connect")').first();
        
        if (await connectButton.isVisible()) {
            console.log('Found Connect button, clicking...');
            await connectButton.click();
            
            // Wait for dialog to appear
            await page.waitForTimeout(2000);
            
            // Screenshot after clicking Connect
            await page.screenshot({ path: '/root/deer-flow/logs/test-3-after-connect-click.png' });
            
            // Check if dialog is open (look for iframe or dialog content)
            const dialog = page.locator('[role="dialog"]');
            const iframe = page.locator('iframe[title="APIdeck Vault"]');
            
            if (await dialog.isVisible()) {
                console.log('✅ SUCCESS: Dialog is visible');
                if (await iframe.isVisible()) {
                    console.log('✅ SUCCESS: APIdeck Vault iframe is loaded in dialog');
                } else {
                    console.log('⚠️  WARNING: Dialog is visible but no iframe found');
                }
            } else {
                console.log('❌ FAILURE: Dialog is not visible - might be redirecting to full page');
                
                // Check if we're on a different page
                const currentUrl = page.url();
                console.log('Current URL:', currentUrl);
                
                if (currentUrl.includes('vault.apideck.com') || currentUrl !== 'http://localhost:3000/account?tab=integrations') {
                    console.log('❌ CONFIRMED: Redirected to full page instead of dialog');
                }
            }
        } else {
            console.log('❌ No Connect button found');
        }
        
        // Final screenshot
        await page.screenshot({ path: '/root/deer-flow/logs/test-4-final-state.png' });
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: '/root/deer-flow/logs/test-error.png' });
    } finally {
        await browser.close();
        console.log('Test completed');
    }
}

testDialogImplementation();