const { chromium } = require('playwright');

async function testWithNetworkLogs() {
    console.log('Testing with network logs...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Capture network requests
        page.on('request', request => {
            if (request.url().includes('/integrations/') && request.url().includes('/files')) {
                console.log(`API REQUEST: ${request.method()} ${request.url()}`);
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/integrations/') && response.url().includes('/files')) {
                console.log(`API RESPONSE: ${response.status()} ${response.url()}`);
            }
        });
        
        // Capture console logs
        page.on('console', msg => {
            if (msg.text().includes('[CloudFileBrowser]') || msg.text().includes('Loading files')) {
                console.log(`BROWSER: ${msg.text()}`);
            }
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
        
        console.log('--- Initial files loaded ---');
        
        // Click on "Omega Intelligence" folder
        const dialog = page.locator('[role="dialog"]');
        const omegaFolder = dialog.locator('text=Omega Intelligence').first();
        if (await omegaFolder.isVisible()) {
            console.log('--- Clicking on Omega Intelligence folder ---');
            await omegaFolder.click();
            await page.waitForTimeout(5000); // Wait longer to see the API call
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testWithNetworkLogs();