import asyncio
from playwright.async_api import async_playwright
import time

async def test_chat_ui():
    async with async_playwright() as p:
        # Launch browser in headless mode
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to chat page
        print("1. Navigating to chat page...")
        await page.goto("http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/chat")
        await page.wait_for_load_state('networkidle')
        
        # Take screenshot of initial state
        await page.screenshot(path="/tmp/chat_initial.png")
        print("   - Screenshot saved: /tmp/chat_initial.png")
        
        # Check if we need to login
        try:
            login_button = await page.wait_for_selector('button:has-text("Login")', timeout=2000)
            print("2. Login required, logging in...")
            
            # Fill email
            email_input = await page.wait_for_selector('input[placeholder="Enter your email"]')
            await email_input.fill("test@example.com")
            
            # Fill password
            password_input = await page.wait_for_selector('input[placeholder="Enter your password"]')
            await password_input.fill("password123")
            
            # Click login
            await login_button.click()
            
            # Wait for navigation away from login page
            print("   - Waiting for login to complete...")
            try:
                await page.wait_for_url("**/chat", timeout=10000)
                print("   - Successfully navigated to chat page")
            except:
                # Check for error message
                error_msg = await page.query_selector('.text-red-500')
                if error_msg:
                    error_text = await error_msg.text_content()
                    print(f"   - Login error: {error_text}")
                else:
                    print("   - Login may have failed, continuing anyway...")
            
            await asyncio.sleep(2)
            
            # Take screenshot after login
            await page.screenshot(path="/tmp/chat_after_login.png")
            print("   - Screenshot after login: /tmp/chat_after_login.png")
        except Exception as e:
            print(f"2. Login not required or error: {e}")
        
        # Find the message input
        print("3. Finding message input...")
        try:
            message_input = await page.wait_for_selector('textarea[placeholder="Type a message..."]', timeout=10000)
        except:
            # Take a screenshot to see what's on the page
            await page.screenshot(path="/tmp/chat_error_state.png")
            print("   - ERROR: Could not find message input")
            print("   - Screenshot saved: /tmp/chat_error_state.png")
            print("   - Current URL:", page.url)
            raise
        
        # Type a message
        test_message = "What is the capital of France?"
        print(f"4. Typing message: '{test_message}'")
        await message_input.fill(test_message)
        
        # Find and click send button
        print("5. Clicking send button...")
        send_button = await page.wait_for_selector('button[type="submit"]', timeout=5000)
        await send_button.click()
        
        # Wait for response to appear
        print("6. Waiting for AI response...")
        await page.wait_for_selector('.prose', timeout=30000)
        
        # Wait a bit more to ensure response is complete
        await asyncio.sleep(3)
        
        # Take screenshot after response
        await page.screenshot(path="/tmp/chat_after_response.png")
        print("   - Screenshot saved: /tmp/chat_after_response.png")
        
        # Navigate to chat history
        print("7. Navigating to chat history page...")
        await page.goto("http://ec2-54-91-85-225.compute-1.amazonaws.com:3000/chat/history")
        await page.wait_for_load_state('networkidle')
        
        # Wait for history to load
        await asyncio.sleep(2)
        
        # Take screenshot of history page
        await page.screenshot(path="/tmp/chat_history.png")
        print("   - Screenshot saved: /tmp/chat_history.png")
        
        # Look for the chat with our message
        print("8. Looking for the new chat in history...")
        
        # Get all chat items
        chat_items = await page.query_selector_all('.cursor-pointer')
        
        found_chat = False
        for item in chat_items:
            text_content = await item.text_content()
            if text_content:
                print(f"   - Found chat: {text_content.strip()}")
                if "What is the capital of France?" in text_content:
                    found_chat = True
                    print("   ✓ SUCCESS: Found our chat with the correct title!")
                    break
        
        if not found_chat:
            print("   ✗ ISSUE: Could not find chat with title 'What is the capital of France?'")
            print("   - The chat might still show as 'chat session'")
        
        # Close browser
        await browser.close()
        
        return found_chat

# Run the test
if __name__ == "__main__":
    result = asyncio.run(test_chat_ui())
    print("\n" + "="*50)
    print(f"Test Result: {'PASSED' if result else 'FAILED'}")
    print("Screenshots saved to:")
    print("  - /tmp/chat_initial.png")
    print("  - /tmp/chat_after_response.png")
    print("  - /tmp/chat_history.png")