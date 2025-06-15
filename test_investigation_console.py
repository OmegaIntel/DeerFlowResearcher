#!/usr/bin/env python3
"""Test Investigation toggle with console output."""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time

# Setup Chrome options with console logging
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--disable-software-rasterizer')
chrome_options.add_argument('--window-size=1920,1080')
chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

# Create driver
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 30)

try:
    print("=== Testing Investigation Toggle Console Output ===\n")
    
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
    
    # Clear console logs
    driver.get_log('browser')
    
    # Click to enable
    investigation_button.click()
    time.sleep(1)
    
    # Check console logs
    logs = driver.get_log('browser')
    for log in logs:
        if 'Investigation' in log['message'] or 'background' in log['message']:
            print(f"Console: {log['message']}")
    
    print("✅ Investigation toggle clicked")
    
    # Step 3: Send a message and capture console output
    print("\n3. Sending message and checking console...")
    
    # Clear console logs
    driver.get_log('browser')
    
    textarea = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='What can I do for you?']"))
    )
    textarea.send_keys("What are the latest trends in AI?")
    
    send_button = driver.find_element(By.CSS_SELECTOR, "button[class*='rounded-full']:last-child")
    send_button.click()
    
    print("✅ Message sent")
    
    # Wait a bit for logs
    time.sleep(2)
    
    # Check console logs
    print("\n4. Console output:")
    logs = driver.get_log('browser')
    for log in logs:
        if '[sendMessage]' in log['message'] or 'Decision logic' in log['message']:
            print(f"   {log['message']}")
    
    if not any('[sendMessage]' in log['message'] for log in logs):
        print("   ❌ No sendMessage debug logs found")
        print("\n   All console logs:")
        for log in logs[:10]:  # Show first 10 logs
            print(f"   {log['level']}: {log['message'][:100]}...")
    
except Exception as e:
    print(f"Test failed with error: {e}")
    import traceback
    traceback.print_exc()

finally:
    driver.quit()
    print("\nTest completed")