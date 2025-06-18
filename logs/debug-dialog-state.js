const { chromium } = require('playwright');

async function debugDialogState() {
    console.log('Starting dialog state debug...');
    
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
        
        // Listen for network requests
        page.on('request', request => {
            if (request.url().includes('/integrations/') && request.method() === 'POST') {
                console.log(`[NETWORK] ${request.method()} ${request.url()}`);
            }
        });
        
        // Navigate to the application
        console.log('Navigating to application...');
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        
        // Login
        if (await page.locator('text=Sign In').isVisible()) {
            console.log('Signing in...');
            await page.click('text=Sign In');
            await page.waitForTimeout(1000);
            
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(3000);
        }
        
        // Navigate to account page
        console.log('Navigating to integrations...');
        await page.goto('http://localhost:3000/account?tab=integrations');
        await page.waitForTimeout(3000);
        
        // Check if IntegrationsDialog component is in the DOM
        const dialogComponent = await page.locator('[role="dialog"]').count();
        console.log(`Dialog components in DOM: ${dialogComponent}`);
        
        // Check if IntegrationsDialog is rendered but hidden
        const hiddenDialog = await page.locator('[data-state="closed"][role="dialog"]').count();
        console.log(`Hidden dialog components: ${hiddenDialog}`);
        
        // Check integration state variables
        const componentState = await page.evaluate(() => {
            // Try to access React dev tools or component state
            const elements = document.querySelectorAll('[data-testid], [class*="integrations"]');
            return {
                elements: elements.length,
                hasDialog: !!document.querySelector('[role="dialog"]'),
                hasIframe: !!document.querySelector('iframe[title="APIdeck Vault"]')
            };
        });
        console.log('Component state:', componentState);
        
        // Find Connect button
        const connectButton = page.locator('button:has-text("Connect")').first();
        if (await connectButton.isVisible()) {
            console.log('Clicking Connect button and monitoring state...');
            
            // Monitor for state changes
            let stateChecks = 0;
            const maxChecks = 10;
            
            await connectButton.click();
            
            while (stateChecks < maxChecks) {
                await page.waitForTimeout(500);
                stateChecks++;
                
                const currentState = await page.evaluate(() => ({
                    url: window.location.href,
                    hasDialog: !!document.querySelector('[role="dialog"]'),
                    dialogOpen: !!document.querySelector('[data-state="open"][role="dialog"]'),
                    hasIframe: !!document.querySelector('iframe[title="APIdeck Vault"]')
                }));
                
                console.log(`State check ${stateChecks}:`, currentState);
                
                if (currentState.hasDialog && currentState.dialogOpen) {
                    console.log('✅ Dialog opened successfully!');
                    break;
                } else if (currentState.url !== 'http://localhost:3000/account?tab=integrations') {
                    console.log('❌ Redirected to different page:', currentState.url);
                    break;
                }
            }
        } else {
            console.log('❌ No Connect button found');
        }
        
    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        await browser.close();
        console.log('Debug completed');
    }
}

debugDialogState();