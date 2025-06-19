const { chromium } = require('playwright');

async function testWithConsole() {
    console.log('Testing with console logging...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Capture all console logs
        page.on('console', msg => {
            if (msg.text().includes('[CloudFileBrowser]')) {
                console.log(`BROWSER LOG: ${msg.text()}`);
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
        
        console.log('\n--- File browser opened ---\n');
        
        // Click on Omega Intelligence folder
        const dialog = page.locator('[role="dialog"]');
        const omegaFolder = dialog.locator('p:text("Omega Intelligence")');
        
        if (await omegaFolder.isVisible()) {
            console.log('\n--- Clicking on Omega Intelligence folder ---\n');
            await omegaFolder.locator('..').click({ force: true });
            await page.waitForTimeout(3000);
            
            // Take screenshot
            await page.screenshot({ path: '/root/deer-flow/logs/after-navigation.png' });
            
            // Check what's visible
            const visibleFolders = await dialog.locator('p.text-sm.font-medium').allTextContents();
            console.log('\nVisible items after navigation:', visibleFolders.slice(0, 5));
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testWithConsole();