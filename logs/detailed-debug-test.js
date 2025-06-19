const { chromium } = require('playwright');

async function detailedDebugTest() {
    console.log('Starting detailed debug test...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Capture ALL network requests with details
        page.on('request', request => {
            if (request.url().includes('/integrations/') && request.url().includes('/files')) {
                console.log(`\n=== API REQUEST ===`);
                console.log(`URL: ${request.url()}`);
                console.log(`Method: ${request.method()}`);
                console.log(`Headers:`, request.headers());
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/integrations/') && response.url().includes('/files')) {
                console.log(`\n=== API RESPONSE ===`);
                console.log(`URL: ${response.url()}`);
                console.log(`Status: ${response.status()}`);
            }
        });
        
        // Capture ALL console logs
        page.on('console', msg => {
            console.log(`BROWSER: ${msg.text()}`);
        });
        
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
        
        // Open tools dropdown and click Browse Files
        await page.click('button:has-text("Tools")');
        await page.waitForTimeout(1000);
        await page.click('button:has-text("Browse Files")');
        await page.waitForTimeout(3000);
        
        console.log('\n=== CLICKING FOLDER ===');
        
        // Click on "Omega Intelligence" folder
        const dialog = page.locator('[role="dialog"]');
        const omegaFolder = dialog.locator('text=Omega Intelligence').first();
        if (await omegaFolder.isVisible()) {
            await omegaFolder.click();
            await page.waitForTimeout(5000); // Wait longer to see all the logs
        }
        
        console.log('\n=== TEST COMPLETE ===');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

detailedDebugTest();