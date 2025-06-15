#!/usr/bin/env python3
"""Test Investigation toggle network requests."""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import json

# Setup Chrome options with network logging
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--disable-software-rasterizer')
chrome_options.add_argument('--window-size=1920,1080')

# Enable network logging
chrome_options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})

# Create driver
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 30)

try:
    print("=== Testing Investigation Toggle Network Requests ===\n")
    
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
    
    # Step 2: Enable Investigation toggle
    print("\n2. Enabling Investigation toggle...")
    
    investigation_button = wait.until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Investigation')]"))
    )
    
    # Check if it's already ON
    button_classes = investigation_button.get_attribute("class")
    if "border-brand" not in button_classes:
        investigation_button.click()
        time.sleep(0.5)
    print("✅ Investigation toggle is ON")
    
    # Step 3: Clear performance logs
    driver.get_log('performance')
    
    # Step 4: Send a message
    print("\n3. Sending message...")
    
    textarea = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='What can I do for you?']"))
    )
    textarea.send_keys("What are the latest trends in AI?")
    
    send_button = driver.find_element(By.CSS_SELECTOR, "button[class*='rounded-full']:last-child")
    send_button.click()
    
    print("✅ Message sent")
    
    # Step 5: Wait a bit and capture network logs
    time.sleep(3)
    
    print("\n4. Analyzing network requests...")
    
    # Get performance logs
    logs = driver.get_log('performance')
    
    # Find chat API requests
    chat_requests = []
    for log in logs:
        message = json.loads(log['message'])['message']
        method = message.get('method', '')
        
        if method == 'Network.requestWillBeSent':
            params = message.get('params', {})
            request = params.get('request', {})
            url = request.get('url', '')
            
            if '/api/chat/' in url:
                post_data = request.get('postData', '')
                chat_requests.append({
                    'url': url,
                    'method': request.get('method', ''),
                    'postData': post_data
                })
    
    # Analyze requests
    for req in chat_requests:
        print(f"\n📡 Request to: {req['url']}")
        print(f"   Method: {req['method']}")
        
        if req['postData']:
            try:
                data = json.loads(req['postData'])
                print(f"   Endpoint: {req['url'].split('/')[-1]}")
                print(f"   enable_background_investigation: {data.get('enable_background_investigation', 'NOT FOUND')}")
                print(f"   tool_id: {data.get('tool_id', 'None')}")
                print(f"   tool_type: {data.get('tool_type', 'None')}")
                
                # Check which endpoint was called
                if '/api/chat/simple' in req['url']:
                    print("   ❌ Using SIMPLE chat endpoint (not research)")
                elif '/api/chat/stream' in req['url']:
                    print("   ✅ Using STREAM endpoint (research capable)")
                elif '/api/chat/tool' in req['url']:
                    print("   ✅ Using TOOL endpoint (research)")
                    
            except:
                print(f"   Could not parse POST data")
    
    if not chat_requests:
        print("❌ No chat API requests found")
        
except Exception as e:
    print(f"Test failed with error: {e}")

finally:
    driver.quit()
    print("\nTest completed")