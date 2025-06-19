const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testFullDocumentUpload() {
    console.log('Testing full document upload and chat functionality...');
    
    // Create a test text file
    const testFilePath = '/tmp/test-document.txt';
    const testContent = `Test Document for RAG

This is a test document that contains information about artificial intelligence and machine learning.

Key Facts:
1. AI was first coined as a term in 1956
2. Machine learning is a subset of AI
3. Deep learning is a subset of machine learning
4. Neural networks are inspired by the human brain

This document should be searchable via RAG after upload.`;
    
    fs.writeFileSync(testFilePath, testContent);
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Monitor console messages
        page.on('console', msg => {
            if (msg.text().includes('[chatSimpleStream]') || msg.text().includes('upload')) {
                console.log('Console:', msg.text());
            }
        });
        
        // Monitor network requests
        page.on('request', request => {
            if (request.url().includes('/api/documents/upload') || request.url().includes('/api/chat/simple')) {
                console.log('Request:', request.method(), request.url());
                if (request.method() === 'POST' && request.url().includes('/api/chat/simple')) {
                    const postData = request.postData();
                    if (postData) {
                        try {
                            const data = JSON.parse(postData);
                            console.log('Chat request data:', JSON.stringify(data, null, 2));
                        } catch (e) {
                            console.log('Chat request raw data:', postData);
                        }
                    }
                }
            }
        });
        
        page.on('response', response => {
            if (response.url().includes('/api/documents/upload')) {
                console.log('Upload response:', response.status());
                response.text().then(text => {
                    console.log('Upload response body:', text);
                }).catch(() => {});
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
        
        // Take a screenshot before interaction
        await page.screenshot({ path: '/tmp/before-upload.png' });
        
        // Upload file
        console.log('\n=== Uploading Document ===');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFilePath);
        await page.waitForTimeout(1000);
        
        // Check if file appears
        const fileDisplayed = await page.locator('text=test-document.txt').isVisible();
        console.log(`File displayed: ${fileDisplayed ? '✅' : '❌'}`);
        
        // Take screenshot after file selection
        await page.screenshot({ path: '/tmp/after-file-select.png' });
        
        // Type a message
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('Please summarize the uploaded document');
        await page.waitForTimeout(500);
        
        // Look for Send button
        console.log('\n=== Looking for Send Button ===');
        
        // Try different selectors
        const sendButton1 = await page.locator('button:has-text("Send")').isVisible();
        console.log(`Send button (text): ${sendButton1 ? '✅' : '❌'}`);
        
        const sendButton2 = await page.locator('button:has(svg[class*="send"])').isVisible();
        console.log(`Send button (icon): ${sendButton2 ? '✅' : '❌'}`);
        
        // Check all buttons
        const allButtons = await page.locator('button').all();
        console.log(`Total buttons found: ${allButtons.length}`);
        
        for (let i = 0; i < allButtons.length; i++) {
            const text = await allButtons[i].textContent();
            const classes = await allButtons[i].getAttribute('class');
            if (text?.includes('Send') || classes?.includes('send')) {
                console.log(`Button ${i}: "${text}" (classes: ${classes})`);
            }
        }
        
        // Take screenshot of current state
        await page.screenshot({ path: '/tmp/ready-to-send.png' });
        
        // Try to send
        if (sendButton1) {
            console.log('\n=== Sending Message ===');
            await page.click('button:has-text("Send")');
            await page.waitForTimeout(5000);
            
            // Check for response
            const aiResponse = await page.locator('.prose').last().isVisible();
            console.log(`AI response received: ${aiResponse ? '✅' : '❌'}`);
            
            if (aiResponse) {
                const responseText = await page.locator('.prose').last().textContent();
                console.log('Response preview:', responseText?.substring(0, 100) + '...');
            }
        }
        
        console.log('\n=== Summary ===');
        console.log('Document upload flow completed');
        console.log('Screenshots saved to /tmp/');
        
    } catch (error) {
        console.error('Test error:', error.message);
        await page.screenshot({ path: '/tmp/error-state.png' });
    } finally {
        await browser.close();
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

testFullDocumentUpload();