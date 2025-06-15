#!/usr/bin/env python3
"""Test Investigation toggle with clean state."""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import json

# Setup Chrome options
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--disable-software-rasterizer')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})

# Create driver
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 30)

try:
    print("=== Testing Investigation Toggle (Clean State) ===\n")
    
    # Step 1: Login
    print("1. Logging in...")
    driver.get("http://localhost:3000/auth/login")
    
    email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
    email_input.send_keys("chetan@omegaintelligence.ai")
    
    password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
    password_input.send_keys("Test123.")
    
    login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    login_button.click()
    
    # Wait for redirect to chat
    wait.until(lambda driver: driver.current_url.endswith("/chat"))
    print("✅ Login successful")
    
    # Step 2: Clear local storage to ensure clean state
    print("\n2. Clearing local storage...")
    driver.execute_script("localStorage.clear();")
    driver.refresh()
    time.sleep(2)
    
    # Step 3: Enable Investigation toggle
    print("\n3. Enabling Investigation toggle...")
    
    investigation_button = wait.until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Investigation')]"))
    )
    
    # Click to enable
    investigation_button.click()
    time.sleep(1)
    
    # Verify it's ON
    button_classes = investigation_button.get_attribute("class")
    if "border-brand" in button_classes:
        print("✅ Investigation toggle is ON")
    else:
        print("❌ Investigation toggle did not turn ON")
    
    # Step 4: Check localStorage
    settings = driver.execute_script("return localStorage.getItem('deerflow.settings');")
    if settings:
        settings_obj = json.loads(settings)
        print(f"✅ Settings in localStorage: enableBackgroundInvestigation = {settings_obj.get('general', {}).get('enableBackgroundInvestigation', False)}")
    
    # Step 5: Send a message using console to check store state
    print("\n4. Checking store state and sending message...")
    
    # Execute store check
    store_state = driver.execute_script("""
        const store = window.__ZUSTAND_STORE__;
        if (!store) {
            // Try to access it through React DevTools
            const reactRoot = document.querySelector('#__next');
            if (reactRoot && reactRoot._reactRootContainer) {
                // This is a workaround - may not work in production
                return "Store not accessible";
            }
            return "Store not found";
        }
        return store.getState();
    """)
    
    print(f"Store state: {store_state}")
    
    # Clear network logs
    driver.get_log('performance')
    
    # Send message
    textarea = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='What can I do for you?']"))
    )
    textarea.send_keys("What are the latest trends in AI?")
    
    send_button = driver.find_element(By.CSS_SELECTOR, "button[class*='rounded-full']:last-child")
    send_button.click()
    
    print("✅ Message sent")
    
    # Step 6: Check network requests
    time.sleep(3)
    
    print("\n5. Analyzing network requests...")
    
    logs = driver.get_log('performance')
    
    for log in logs:
        message = json.loads(log['message'])['message']
        method = message.get('method', '')
        
        if method == 'Network.requestWillBeSent':
            params = message.get('params', {})
            request = params.get('request', {})
            url = request.get('url', '')
            
            if '/api/chat/' in url and request.get('method') == 'POST':
                print(f"\n📡 POST to: {url}")
                
                if '/api/chat/simple' in url:
                    print("   ❌ Using SIMPLE chat endpoint")
                elif '/api/chat/stream' in url:
                    print("   ✅ Using STREAM endpoint (research)")
                elif '/api/chat/tool' in url:
                    print("   ✅ Using TOOL endpoint")
                
                post_data = request.get('postData', '')
                if post_data:
                    try:
                        data = json.loads(post_data)
                        if 'enable_background_investigation' in data:
                            print(f"   enable_background_investigation: {data['enable_background_investigation']}")
                    except:
                        pass
    
except Exception as e:
    print(f"Test failed with error: {e}")
    import traceback
    traceback.print_exc()

finally:
    driver.quit()
    print("\nTest completed")