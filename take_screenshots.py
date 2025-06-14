#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright
import requests

async def take_screenshots():
    # First login to get token
    login_url = "http://localhost:8000/api/token"
    login_data = {
        "username": "demo@example.com",
        "password": "Demo123!"
    }
    
    # Get token
    response = requests.post(login_url, data=login_data)
    if response.status_code != 200:
        print(f"Failed to login: {response.text}")
        return
    
    token_data = response.json()
    token = token_data['access_token']
    print(f"Got token: {token[:50]}...")
    
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        
        # Set the auth token cookie
        await context.add_cookies([{
            'name': 'authToken',
            'value': token,
            'domain': 'localhost',
            'path': '/',
            'httpOnly': False,
            'secure': False,
            'sameSite': 'Lax'
        }])
        
        # Also set in localStorage
        page = await context.new_page()
        
        # First navigate to the domain to set localStorage
        await page.goto('http://localhost:3000')
        await page.evaluate(f"localStorage.setItem('authToken', '{token}')")
        await page.evaluate(f"sessionStorage.setItem('authToken', '{token}')")
        
        # Now navigate to documents page
        print("\nNavigating to documents page...")
        await page.goto('http://localhost:3000/documents', wait_until='domcontentloaded')
        
        # Wait for content to load
        await page.wait_for_timeout(5000)  # Wait 5 seconds for dynamic content
        
        # Take screenshot
        screenshot_path = '/root/deer-flow/documents_page_full.png'
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot saved to: {screenshot_path}")
        
        # Check for upload button
        try:
            # Wait for upload button to be visible
            upload_button = await page.wait_for_selector("button:has-text('Upload')", timeout=10000)
            if upload_button:
                print("\nUpload button found!")
                
                # Get button location
                box = await upload_button.bounding_box()
                if box:
                    print(f"Upload button location: x={box['x']}, y={box['y']}, width={box['width']}, height={box['height']}")
                    if box['y'] < 150:
                        print("✓ Upload button is in the header area (top of page)")
                    else:
                        print("✗ Upload button is NOT in the header area")
                
                # Click the upload button
                await upload_button.click()
                await page.wait_for_timeout(2000)
                
                # Take screenshot of upload dialog
                upload_dialog_path = '/root/deer-flow/upload_dialog_full.png'
                await page.screenshot(path=upload_dialog_path, full_page=True)
                print(f"\nUpload dialog screenshot saved to: {upload_dialog_path}")
                
                # Check for file tiles
                file_tiles = await page.query_selector_all(".file-tile, [class*='file-tile'], [class*='upload-tile']")
                print(f"\nFound {len(file_tiles)} file tiles")
                
        except Exception as e:
            print(f"\nCould not find upload button: {e}")
        
        # Save the HTML for inspection
        html_content = await page.content()
        with open('/root/deer-flow/documents_page_rendered.html', 'w') as f:
            f.write(html_content)
        print("\nSaved rendered HTML to documents_page_rendered.html")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(take_screenshots())