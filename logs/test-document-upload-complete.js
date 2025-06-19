const { chromium } = require('playwright');
const fs = require('fs');

async function testDocumentUploadComplete() {
    console.log('=== COMPLETE DOCUMENT UPLOAD AND RAG TEST ===\n');
    
    // Create a test document
    const testFilePath = '/tmp/machine-learning-basics.txt';
    const testContent = `Machine Learning Fundamentals

Machine learning is a branch of artificial intelligence that focuses on building systems that learn from data.

Types of Machine Learning:
1. Supervised Learning
   - Uses labeled training data
   - Examples: classification, regression
   - Algorithms: SVM, Random Forest, Neural Networks

2. Unsupervised Learning
   - Works with unlabeled data
   - Examples: clustering, dimensionality reduction
   - Algorithms: K-means, PCA, Autoencoders

3. Reinforcement Learning
   - Learns through interaction with environment
   - Uses rewards and penalties
   - Applications: game playing, robotics

Key Concepts:
- Training data: Data used to train the model
- Validation data: Data used to tune hyperparameters
- Test data: Data used to evaluate final performance
- Overfitting: Model performs well on training data but poorly on new data
- Underfitting: Model is too simple to capture patterns

This document contains essential information about machine learning.`;
    
    fs.writeFileSync(testFilePath, testContent);
    
    const browser = await chromium.launch({ 
        headless: true, // Run headless
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    
    try {
        const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
        
        // Enhanced logging
        page.on('console', msg => {
            const type = msg.type();
            const text = msg.text();
            if (text.includes('upload') || text.includes('document') || text.includes('attachment') || type === 'error') {
                console.log(`[Browser ${type}]`, text);
            }
        });
        
        page.on('response', response => {
            const url = response.url();
            if (url.includes('/api/')) {
                console.log(`[API Response] ${response.status()} - ${url}`);
            }
        });
        
        // Step 1: Navigate and Login
        console.log('Step 1: Navigate and Login');
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(3000);
        
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        if (currentUrl.includes('login') || await page.locator('text=Sign In').isVisible()) {
            console.log('Logging in...');
            if (await page.locator('text=Sign In').isVisible()) {
                await page.click('text=Sign In');
            }
            await page.fill('input[type="email"]', 'chetan@omegaintelligence.ai');
            await page.fill('input[type="password"]', 'Test123.');
            await page.click('button[type="submit"]');
            console.log('Waiting for login to complete...');
            await page.waitForTimeout(5000);
        }
        
        // Step 2: Navigate to Chat
        console.log('\nStep 2: Navigate to Chat');
        const threadId = 'test-rag-' + Date.now();
        await page.goto(`http://localhost:3000/chat?thread=${threadId}`);
        console.log('Thread ID:', threadId);
        
        // Wait for page to fully load
        console.log('Waiting for chat page to load...');
        await page.waitForTimeout(10000);
        
        // Step 3: Verify Page Elements
        console.log('\nStep 3: Verify Page Elements');
        const elements = {
            'Textarea': 'textarea',
            'File input': 'input[type="file"]',
            'Paperclip button': 'button:has(svg[class*="paperclip"])',
            'Send button (text)': 'button:has-text("Send")',
            'Send button (icon)': 'button:has(svg[class*="send"])',
            'Any button': 'button'
        };
        
        for (const [name, selector] of Object.entries(elements)) {
            const count = await page.locator(selector).count();
            const visible = count > 0 ? await page.locator(selector).first().isVisible() : false;
            console.log(`${name}: ${count} found, visible: ${visible ? '✅' : '❌'}`);
        }
        
        // Take diagnostic screenshot
        await page.screenshot({ path: '/tmp/chat-page-state.png' });
        console.log('\nDiagnostic screenshot saved to /tmp/chat-page-state.png');
        
        // Step 4: Test Document Upload (if elements exist)
        const fileInputExists = await page.locator('input[type="file"]').count() > 0;
        if (fileInputExists) {
            console.log('\nStep 4: Testing Document Upload');
            
            // Upload file
            await page.locator('input[type="file"]').setInputFiles(testFilePath);
            await page.waitForTimeout(2000);
            
            // Check if file appears in UI
            const fileDisplayed = await page.locator(`text=${testFilePath.split('/').pop()}`).isVisible();
            console.log(`File displayed in UI: ${fileDisplayed ? '✅' : '❌'}`);
            
            // Type query about the document
            const textareaExists = await page.locator('textarea').count() > 0;
            if (textareaExists) {
                await page.locator('textarea').fill('What are the three types of machine learning mentioned in this document?');
                console.log('Query typed in textarea ✅');
                
                // Try to send
                const sendMethods = [
                    { method: 'Enter key', action: async () => await page.locator('textarea').press('Enter') },
                    { method: 'Send button text', action: async () => await page.locator('button:has-text("Send")').click() },
                    { method: 'Send button icon', action: async () => await page.locator('button:has(svg[class*="send"])').click() },
                    { method: 'Last button', action: async () => await page.locator('button').last().click() }
                ];
                
                let sent = false;
                for (const { method, action } of sendMethods) {
                    try {
                        console.log(`Trying to send using: ${method}`);
                        await action();
                        sent = true;
                        console.log(`Message sent using ${method} ✅`);
                        break;
                    } catch (e) {
                        console.log(`${method} failed: ${e.message}`);
                    }
                }
                
                if (sent) {
                    // Wait for response
                    console.log('\nWaiting for AI response...');
                    await page.waitForTimeout(10000);
                    
                    // Check for response
                    const responses = await page.locator('.prose').count();
                    console.log(`AI responses found: ${responses}`);
                    
                    if (responses > 0) {
                        const lastResponse = await page.locator('.prose').last().textContent();
                        console.log('\nAI Response preview:');
                        console.log(lastResponse?.substring(0, 300) + '...');
                        
                        // Check if response mentions the types
                        const mentionsSupervised = lastResponse?.toLowerCase().includes('supervised');
                        const mentionsUnsupervised = lastResponse?.toLowerCase().includes('unsupervised');
                        const mentionsReinforcement = lastResponse?.toLowerCase().includes('reinforcement');
                        
                        console.log('\nRAG Quality Check:');
                        console.log(`Mentions Supervised Learning: ${mentionsSupervised ? '✅' : '❌'}`);
                        console.log(`Mentions Unsupervised Learning: ${mentionsUnsupervised ? '✅' : '❌'}`);
                        console.log(`Mentions Reinforcement Learning: ${mentionsReinforcement ? '✅' : '❌'}`);
                    }
                }
            }
        } else {
            console.log('\n⚠️  Cannot test document upload - file input not found');
        }
        
        // Final screenshot
        await page.screenshot({ path: '/tmp/final-state.png' });
        console.log('\nFinal screenshot saved to /tmp/final-state.png');
        
        console.log('\n=== TEST COMPLETE ===');
        
        // Keep browser open for 10 seconds for visual inspection
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('\n❌ Test error:', error.message);
        console.error(error.stack);
    } finally {
        await browser.close();
        // Clean up test file
        if (fs.existsSync(testFilePath)) {
            fs.unlinkSync(testFilePath);
        }
    }
}

testDocumentUploadComplete();