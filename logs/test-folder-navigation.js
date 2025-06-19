const { chromium } = require('playwright');

async function testFolderNavigation() {
    console.log('Testing folder navigation...');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Capture console logs for debugging
        page.on('console', msg => {
            if (msg.text().includes('[CloudFileBrowser]')) {
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
        
        console.log('✓ File browser opened');
        
        // Take screenshot of initial state
        await page.screenshot({ path: '/root/deer-flow/logs/initial-folders.png' });
        
        // Get list of folders before navigation
        const dialog = page.locator('[role="dialog"]');
        const initialFolders = await dialog.locator('p.text-sm.font-medium').allTextContents();
        console.log('Initial folders:', initialFolders.slice(0, 5));
        
        // Click on "Omega Intelligence" folder
        const omegaFolder = dialog.locator('text=Omega Intelligence').first();
        if (await omegaFolder.isVisible()) {
            console.log('✓ Found Omega Intelligence folder, clicking...');
            await omegaFolder.click();
            await page.waitForTimeout(3000);
            
            // Take screenshot after navigation
            await page.screenshot({ path: '/root/deer-flow/logs/after-folder-click.png' });
            
            // Check what folders/files are visible now
            const newItems = await dialog.locator('p.text-sm.font-medium').allTextContents();
            console.log('Items after navigation:', newItems.slice(0, 10));
            
            // Check if we see files instead of folders
            const hasFiles = newItems.some(item => item.includes('.mp4') || item.includes('.pptx') || item.includes('.xlsx'));
            if (hasFiles) {
                console.log('✅ SUCCESS: Folder navigation works! Now showing files instead of folders.');
            } else {
                console.log('❌ FAILED: Still showing folders instead of files.');
            }
            
            // Check if the path breadcrumb is updated
            const pathText = await dialog.locator('span.text-muted-foreground').textContent();
            console.log('Current path:', pathText);
            
        } else {
            console.log('❌ Could not find Omega Intelligence folder');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testFolderNavigation();