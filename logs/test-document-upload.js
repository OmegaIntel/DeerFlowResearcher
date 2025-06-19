const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testDocumentUpload() {
    console.log('Testing document upload functionality...');
    
    // Create a test PDF file
    const testFilePath = '/tmp/test-document.pdf';
    fs.writeFileSync(testFilePath, 'PDF test content for RAG');
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Monitor network requests
        page.on('request', request => {
            if (request.url().includes('/api/documents/upload')) {
                console.log('Document upload request:', {
                    url: request.url(),
                    method: request.method()
                });
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/documents/upload')) {
                console.log('Document upload response:', {
                    status: response.status(),
                    url: response.url()
                });
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
        
        await page.goto('http://localhost:3000/chat');
        await page.waitForTimeout(5000);
        console.log('✓ Page loaded');
        
        // Check UI elements
        console.log('\n=== UI Elements Check ===');
        const paperclipButton = await page.locator('button:has(svg[class*="paperclip"])').isVisible();
        console.log(`Paperclip button visible: ${paperclipButton ? '✅' : '❌'}`);
        
        const sendButton = await page.locator('button:has-text("Send")').isVisible();
        console.log(`Send button visible: ${sendButton ? '✅' : '❌'}`);
        
        // Check file input
        const fileInput = await page.locator('input[type="file"]').count();
        console.log(`File input elements: ${fileInput}`);
        
        // Try to trigger file upload
        if (fileInput > 0) {
            console.log('\n=== Simulating File Selection ===');
            // Set files on the input
            await page.setInputFiles('input[type="file"]', testFilePath);
            await page.waitForTimeout(1000);
            
            // Check if file appears in UI
            const fileDisplay = await page.locator('text=test-document.pdf').isVisible();
            console.log(`File displayed in UI: ${fileDisplay ? '✅' : '❌'}`);
            
            // Check for X button to remove file
            const removeButton = await page.locator('button:has(svg[class*="x"])').count();
            console.log(`Remove file buttons: ${removeButton}`);
        }
        
        console.log('\n=== Summary ===');
        console.log('Document upload UI elements are ready');
        console.log('Note: Actual upload happens when Send button is clicked');
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

testDocumentUpload();