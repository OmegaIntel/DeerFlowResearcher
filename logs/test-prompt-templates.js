const { chromium } = require('playwright');

async function testPromptTemplates() {
    console.log('Testing prompt templates...');
    
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
        
        // Go to fresh chat page
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(5000);
        
        console.log('✓ Successfully loaded chat page');
        
        // Check for prompt template categories
        const categories = [
            'Deal Sourcing & Due Diligence',
            'Portfolio Company Analysis', 
            'Market Comparables & Valuations',
            'Fund Performance & LP Reporting',
            'Sector-Specific Research',
            'Regulatory & Compliance'
        ];
        
        console.log('\n=== Checking for prompt template categories ===');
        let foundCategories = 0;
        
        for (const category of categories) {
            const isVisible = await page.locator(`text=${category}`).isVisible();
            console.log(`${category}: ${isVisible ? '✓ Found' : '✗ Not found'}`);
            if (isVisible) foundCategories++;
        }
        
        // Check for the main question text
        const questionText = await page.locator('text=What would you like to explore?').isVisible();
        console.log(`"What would you like to explore?" text: ${questionText ? '✓ Found' : '✗ Not found'}`);
        
        // Check if clicking a category expands it
        if (foundCategories > 0) {
            console.log('\n=== Testing category expansion ===');
            const firstCategory = page.locator('text=Deal Sourcing & Due Diligence').first();
            if (await firstCategory.isVisible()) {
                await firstCategory.click();
                await page.waitForTimeout(1000);
                
                // Check if prompt examples appear
                const examplePrompts = await page.locator('button').filter({ 
                    hasText: 'What are the most active PE firms' 
                }).isVisible();
                console.log(`Example prompts appear on click: ${examplePrompts ? '✓ Yes' : '✗ No'}`);
            }
        }
        
        console.log('\n=== Summary ===');
        console.log(`Found ${foundCategories}/${categories.length} categories`);
        console.log(`Question text visible: ${questionText}`);
        
        if (foundCategories === 0 && !questionText) {
            console.log('⚠️  Prompt templates appear to be missing entirely');
        } else if (foundCategories < categories.length) {
            console.log('⚠️  Some prompt templates are missing');
        } else {
            console.log('✅ All prompt templates are working correctly');
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testPromptTemplates();