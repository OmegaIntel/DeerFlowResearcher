import asyncio
from playwright.async_api import async_playwright
import time

async def test_chat_ui_final():
    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Step 1: Navigate directly to the login page
        print("1. Navigating to login page...")
        await page.goto("http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/auth/login")
        await page.wait_for_load_state('networkidle')
        
        # Step 2: Fill in login credentials
        print("2. Logging in with test2@example.com...")
        await page.fill('input[placeholder="Enter your email"]', "test2@example.com")
        await page.fill('input[placeholder="Enter your password"]', "testpass123")
        
        # Take screenshot before login
        await page.screenshot(path="/tmp/before_login.png")
        
        # Click login button
        await page.click('button:has-text("Login")')
        
        # Step 3: Wait for redirect to chat page
        print("3. Waiting for redirect to chat page...")
        try:
            await page.wait_for_url("**/chat", timeout=10000)
            print("   ✓ Successfully redirected to chat page")
        except:
            # If no redirect, navigate manually
            print("   - No automatic redirect, navigating manually...")
            await page.goto("http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/chat")
            await page.wait_for_load_state('networkidle')
        
        # Take screenshot after login
        await page.screenshot(path="/tmp/after_login.png")
        print("   - Screenshot saved: /tmp/after_login.png")
        
        # Step 4: Send a message
        print("4. Sending a test message...")
        try:
            # Wait for the chat interface to load
            await page.wait_for_selector('textarea[placeholder="Type a message..."]', timeout=10000)
            
            # Type and send message
            test_message = "What is the tallest mountain in the world?"
            await page.fill('textarea[placeholder="Type a message..."]', test_message)
            await page.click('button[type="submit"]')
            
            print(f"   ✓ Sent message: '{test_message}'")
            
            # Wait for response
            print("5. Waiting for AI response...")
            await page.wait_for_selector('.prose', timeout=30000)
            await asyncio.sleep(3)  # Wait for response to complete
            
            # Take screenshot of chat
            await page.screenshot(path="/tmp/chat_conversation.png")
            print("   - Screenshot saved: /tmp/chat_conversation.png")
            
        except Exception as e:
            print(f"   ✗ Error sending message: {e}")
            await page.screenshot(path="/tmp/error_state.png")
            await browser.close()
            return False
        
        # Step 5: Navigate to history page
        print("6. Navigating to chat history...")
        await page.goto("http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/chat/history")
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(2)
        
        # Take screenshot of history
        await page.screenshot(path="/tmp/chat_history_final.png")
        print("   - Screenshot saved: /tmp/chat_history_final.png")
        
        # Step 6: Check for our chat
        print("7. Looking for our chat in history...")
        chat_items = await page.query_selector_all('.cursor-pointer')
        
        found = False
        for item in chat_items:
            text = await item.text_content()
            if text and "What is the tallest mountain in the world?" in text:
                found = True
                print(f"   ✓ SUCCESS: Found chat with correct title!")
                break
        
        if not found:
            print("   ✗ Chat not found with correct title")
        
        await browser.close()
        return found

# Run the test
if __name__ == "__main__":
    result = asyncio.run(test_chat_ui_final())
    print("\n" + "="*50)
    print(f"UI Test Result: {'PASSED' if result else 'FAILED'}")
    print("Screenshots saved:")
    print("  - /tmp/before_login.png")
    print("  - /tmp/after_login.png")
    print("  - /tmp/chat_conversation.png")
    print("  - /tmp/chat_history_final.png")