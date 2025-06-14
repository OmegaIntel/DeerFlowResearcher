// Test script to verify documents page layout
const puppeteer = require('puppeteer');

async function testDocumentsPage() {
    console.log('Testing documents page layout...');
    
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Navigate to documents page
        await page.goto('http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/documents', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        
        // Check if redirected to login
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        if (currentUrl.includes('/auth/login')) {
            console.log('Redirected to login page - authentication required');
            
            // Take screenshot of login page
            await page.screenshot({ path: '/tmp/login_page.png' });
            console.log('Screenshot saved to /tmp/login_page.png');
        } else {
            // Look for upload button
            const uploadButton = await page.$('button:has-text("Upload")');
            if (uploadButton) {
                console.log('Upload button found!');
                const buttonBox = await uploadButton.boundingBox();
                console.log('Button position:', buttonBox);
            } else {
                console.log('Upload button not found');
            }
            
            // Take screenshot
            await page.screenshot({ path: '/tmp/documents_page.png' });
            console.log('Screenshot saved to /tmp/documents_page.png');
        }
        
        await browser.close();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testDocumentsPage();