const { chromium } = require('playwright');

async function inspectCurrentBehavior() {
    console.log('Inspecting current behavior...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
        
        const page = await context.newPage();
        
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
        
        // Inspect the actual JavaScript code that's running
        const handleConnectCode = await page.evaluate(() => {
            // Try to find the component and its source
            const connectButtons = document.querySelectorAll('button');
            for (let button of connectButtons) {
                if (button.textContent.includes('Connect')) {
                    // Get the React fiber node to inspect the component
                    const reactFiber = button._reactInternalFiber || button._reactInternals;
                    if (reactFiber) {
                        // Try to get the component source or handler
                        return 'Found Connect button with React fiber';
                    }
                }
            }
            return 'No Connect button found';
        });
        
        console.log('Handle Connect inspection:', handleConnectCode);
        
        // Check if dialog component exists at all
        const hasIntegrationsDialog = await page.evaluate(() => {
            const scripts = Array.from(document.scripts);
            let foundDialog = false;
            for (let script of scripts) {
                if (script.textContent && script.textContent.includes('IntegrationsDialog')) {
                    foundDialog = true;
                    break;
                }
            }
            return foundDialog;
        });
        
        console.log('IntegrationsDialog component exists in bundle:', hasIntegrationsDialog);
        
        // Look for any signs of redirect code
        const hasRedirectCode = await page.evaluate(() => {
            const scripts = Array.from(document.scripts);
            let patterns = [];
            for (let script of scripts) {
                if (script.textContent) {
                    if (script.textContent.includes('window.location') || 
                        script.textContent.includes('location.href') ||
                        script.textContent.includes('window.open')) {
                        patterns.push('redirect patterns found');
                    }
                    if (script.textContent.includes('setVaultUrl') ||
                        script.textContent.includes('setIsVaultOpen')) {
                        patterns.push('dialog state setters found');
                    }
                }
            }
            return patterns;
        });
        
        console.log('Code patterns found:', hasRedirectCode);
        
    } catch (error) {
        console.error('Inspection failed:', error);
    } finally {
        await browser.close();
        console.log('Inspection completed');
    }
}

inspectCurrentBehavior();