const { chromium } = require('playwright');

async function testConsoleErrors() {
    console.log('Checking for console errors...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Capture all console messages
        const consoleMessages = [];
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (type === 'error' || type === 'warning') {
                consoleMessages.push({ type, text });
                console.log(`${type.toUpperCase()}: ${text}`);
            }
        });
        
        // Capture page errors
        page.on('pageerror', error => {
            console.log('PAGE ERROR:', error.message);
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
        
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(5000);
        
        // Type to trigger any dynamic errors
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('Test message');
        await page.waitForTimeout(2000);
        
        // Check page HTML for hydration issues
        const pageContent = await page.content();
        if (pageContent.includes('Hydration failed') || pageContent.includes('Error boundary')) {
            console.log('Found hydration or error boundary issues!');
        }
        
        // Try to evaluate React DevTools
        try {
            const hasReactErrors = await page.evaluate(() => {
                // Check if React DevTools are available
                if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
                    const renderers = window.__REACT_DEVTOOLS_GLOBAL_HOOK__.renderers;
                    return renderers && renderers.size > 0;
                }
                return false;
            });
            console.log(`React DevTools detected: ${hasReactErrors}`);
        } catch (e) {
            console.log('Could not check React DevTools');
        }
        
        console.log(`\nTotal console errors/warnings: ${consoleMessages.length}`);
        
        // Take a diagnostic screenshot
        await page.screenshot({ path: '/tmp/error-check.png' });
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testConsoleErrors();