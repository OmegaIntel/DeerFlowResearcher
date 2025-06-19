const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testDocumentUploadFinal() {
    console.log('Final test for document upload functionality...');
    
    // Create a test text file
    const testFilePath = '/tmp/test-rag-document.txt';
    const testContent = `Machine Learning Basics

Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.

Key concepts include:
- Supervised Learning: Training with labeled data
- Unsupervised Learning: Finding patterns in unlabeled data
- Reinforcement Learning: Learning through rewards and penalties

Popular algorithms:
1. Linear Regression
2. Decision Trees
3. Neural Networks
4. Support Vector Machines

This document contains important information about ML that should be searchable.`;
    
    fs.writeFileSync(testFilePath, testContent);
    
    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Monitor console for debug messages
        page.on('console', msg => {
            const text = msg.text();
            if (text.includes('upload') || text.includes('document') || text.includes('attachment')) {
                console.log('[Console]', text);
            }
        });
        
        // Monitor network
        let uploadRequestSent = false;
        let chatRequestSent = false;
        
        page.on('request', request => {
            const url = request.url();
            if (url.includes('/api/documents/upload')) {
                uploadRequestSent = true;
                console.log('[Upload] Request sent to:', url);
            }
            if (url.includes('/api/chat/simple') && request.method() === 'POST') {
                chatRequestSent = true;
                const postData = request.postData();
                if (postData) {
                    try {
                        const data = JSON.parse(postData);
                        console.log('[Chat] Attachments:', JSON.stringify(data.messages[0]?.attachments, null, 2));
                    } catch (e) {}
                }
            }
        });
        
        page.on('response', response => {
            const url = response.url();
            if (url.includes('/api/documents/upload')) {
                console.log('[Upload] Response status:', response.status());
                response.text().then(text => {
                    try {
                        const data = JSON.parse(text);
                        console.log('[Upload] Response:', JSON.stringify(data, null, 2));
                    } catch (e) {
                        console.log('[Upload] Response text:', text);
                    }
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
        
        // Navigate to chat with a thread ID
        const threadId = 'test-' + Date.now();
        await page.goto(`http://localhost:3000/chat?thread=${threadId}`);
        await page.waitForTimeout(5000);
        console.log('✓ Chat page loaded with thread:', threadId);
        
        // Upload file
        console.log('\n=== File Upload ===');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(testFilePath);
        await page.waitForTimeout(1000);
        
        // Check if file appears
        const fileDisplayed = await page.locator('text=test-rag-document.txt').isVisible();
        console.log(`File displayed in UI: ${fileDisplayed ? '✅' : '❌'}`);
        
        // Type message
        const textarea = page.locator('textarea[placeholder*="How can I help"]');
        await textarea.fill('What does this document say about supervised learning?');
        await page.waitForTimeout(500);
        
        // Try to find and click Send button
        console.log('\n=== Send Button ===');
        
        // Try multiple methods to find send
        const sendMethods = [
            { selector: 'button:has-text("Send")', name: 'By text' },
            { selector: 'button:has(svg[class*="send"])', name: 'By icon' },
            { selector: 'button[class*="ml-2"]', name: 'By margin class' },
            { selector: '.border-t button:last-child', name: 'Last button in toolbar' }
        ];
        
        let sendFound = false;
        for (const method of sendMethods) {
            const found = await page.locator(method.selector).isVisible();
            console.log(`${method.name}: ${found ? '✅' : '❌'}`);
            if (found && !sendFound) {
                sendFound = true;
                console.log(`\nClicking send using: ${method.name}`);
                await page.locator(method.selector).click();
                break;
            }
        }
        
        if (!sendFound) {
            // Try keyboard shortcut
            console.log('\nTrying Enter key to send...');
            await textarea.press('Enter');
        }
        
        // Wait for upload and response
        await page.waitForTimeout(5000);
        
        console.log('\n=== Results ===');
        console.log(`Document upload request sent: ${uploadRequestSent ? '✅' : '❌'}`);
        console.log(`Chat request with attachment sent: ${chatRequestSent ? '✅' : '❌'}`);
        
        // Check for AI response
        const aiResponse = await page.locator('.prose').count();
        console.log(`AI responses found: ${aiResponse}`);
        
        if (aiResponse > 0) {
            const lastResponse = await page.locator('.prose').last().textContent();
            console.log('\nAI Response preview:');
            console.log(lastResponse?.substring(0, 200) + '...');
            
            // Check if response mentions supervised learning
            const mentionsSupervisedLearning = lastResponse?.toLowerCase().includes('supervised');
            console.log(`\nResponse mentions supervised learning: ${mentionsSupervisedLearning ? '✅' : '❌'}`);
        }
        
        // Take final screenshot
        await page.screenshot({ path: '/tmp/document-upload-final.png' });
        
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

testDocumentUploadFinal();