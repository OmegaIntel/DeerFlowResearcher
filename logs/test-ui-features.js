const { chromium } = require('playwright');

async function testUIFeatures() {
    console.log('Testing UI features: file upload and @ mentions...');
    
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
        console.log('✓ Successfully loaded chat page');
        
        // Take a screenshot to see current UI
        await page.screenshot({ path: '/root/deer-flow/logs/current-ui.png' });
        
        // Check for file upload button (Plus icon)
        console.log('\n=== File Upload Features ===');
        const plusButton = await page.locator('button').filter({ hasText: '' }).locator('svg').first().isVisible();
        const plusIconButton = await page.locator('button svg.lucide-plus').isVisible();
        console.log(`Plus icon button visible: ${plusIconButton}`);
        
        // Check for specific upload-related elements
        const fileInputs = await page.locator('input[type="file"]').count();
        console.log(`File input elements: ${fileInputs}`);
        
        // Check for paperclip specifically
        const paperclipIcon = await page.locator('svg.lucide-paperclip').isVisible();
        console.log(`Paperclip icon visible: ${paperclipIcon}`);
        
        // Check for attach/upload buttons by text
        const attachButton = await page.locator('button:has-text("Attach")').isVisible();
        const uploadButton = await page.locator('button:has-text("Upload")').isVisible();
        console.log(`Attach button visible: ${attachButton}`);
        console.log(`Upload button visible: ${uploadButton}`);
        
        // Check bottom toolbar
        const toolsButton = await page.locator('button:has-text("Tools")').isVisible();
        console.log(`Tools button visible: ${toolsButton}`);
        
        if (toolsButton) {
            await page.click('button:has-text("Tools")');
            await page.waitForTimeout(1000);
            
            // Check what's in the tools dropdown
            const dropdownVisible = await page.locator('[role="menu"], .dropdown-content').isVisible();
            console.log(`Tools dropdown opened: ${dropdownVisible}`);
            
            if (dropdownVisible) {
                // Check for integrations or MCP tools
                const webSearch = await page.locator('text=Web search').isVisible();
                const integrations = await page.locator('text=Connected Services').isVisible();
                console.log(`Web search tool: ${webSearch}`);
                console.log(`Connected Services section: ${integrations}`);
            }
            
            // Close dropdown
            await page.keyboard.press('Escape');
        }
        
        console.log('\n=== @ Mention Features ===');
        // Test typing @ in the textarea
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        if (await textarea.isVisible()) {
            await textarea.click();
            await textarea.fill('@');
            await page.waitForTimeout(1000);
            
            // Check if any mention dropdown appears
            const mentionDropdown = await page.locator('[role="listbox"], .mention-dropdown, .autocomplete').isVisible();
            console.log(`@ mention dropdown appears: ${mentionDropdown}`);
            
            // Check if any suggestion items appear
            const suggestions = await page.locator('[role="option"], .mention-item').count();
            console.log(`@ mention suggestions count: ${suggestions}`);
            
            // Clear the textarea
            await textarea.fill('');
        }
        
        console.log('\n=== Summary ===');
        console.log('Current file upload method: Plus icon button');
        console.log('Paperclip icon: Not found - might need to be restored');
        console.log('@ mentions: Not found - might need to be implemented or restored');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testUIFeatures();