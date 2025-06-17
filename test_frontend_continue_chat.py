#!/usr/bin/env python3
"""Test frontend continue chat flow"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
import time
import json
from datetime import datetime

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."
BASE_URL = "http://localhost:3000"

def login_user(driver, wait):
    """Login to the application"""
    driver.get(f"{BASE_URL}/login")
    
    email_input = wait.until(EC.presence_of_element_located((By.NAME, "email")))
    email_input.send_keys(EMAIL)
    
    password_input = driver.find_element(By.NAME, "password")
    password_input.send_keys(PASSWORD)
    
    login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Sign in')]")
    login_button.click()
    
    # Wait for redirect to chat
    wait.until(EC.url_contains("/chat"))
    print("✓ Login successful")

def test_continue_chat():
    """Test continuing a chat from history"""
    # Setup Chrome options
    chrome_options = webdriver.ChromeOptions()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 30)
    
    try:
        # Login
        login_user(driver, wait)
        
        # Navigate to chat history
        print(f"\n[{datetime.now()}] Navigating to chat history...")
        driver.get(f"{BASE_URL}/chat-history")
        time.sleep(3)
        
        # Wait for sessions to load
        print("Waiting for chat sessions to load...")
        sessions = wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "div[class*='card'][class*='cursor-pointer']")
        ))
        
        print(f"✓ Found {len(sessions)} chat sessions")
        
        if sessions:
            # Click on the first session
            print(f"\n[{datetime.now()}] Clicking on first session...")
            sessions[0].click()
            time.sleep(2)
            
            # Look for the Continue Chat button
            continue_buttons = driver.find_elements(By.XPATH, "//button[contains(text(), 'Continue Chat')]")
            print(f"Found {len(continue_buttons)} Continue Chat buttons")
            
            if continue_buttons:
                # Get the current URL before clicking
                current_url = driver.current_url
                print(f"Current URL: {current_url}")
                
                # Click Continue Chat
                print(f"\n[{datetime.now()}] Clicking Continue Chat...")
                continue_buttons[-1].click()  # Click the last one (in the detail view)
                
                # Wait for navigation
                time.sleep(3)
                
                # Check new URL
                new_url = driver.current_url
                print(f"New URL: {new_url}")
                
                # Check if we're on the chat page with thread parameter
                if "/chat?thread=" in new_url:
                    thread_id = new_url.split("thread=")[1].split("&")[0]
                    print(f"✓ Navigated to chat with thread_id: {thread_id}")
                    
                    # Wait for messages to load
                    print(f"\n[{datetime.now()}] Waiting for messages to load...")
                    time.sleep(5)
                    
                    # Check for messages
                    messages = driver.find_elements(By.CSS_SELECTOR, "[class*='message-content'], [class*='whitespace-pre-wrap'], .prose")
                    print(f"Found {len(messages)} message elements")
                    
                    # Check console logs for debugging
                    logs = driver.get_log('browser')
                    print("\nBrowser console logs:")
                    for log in logs[-20:]:  # Last 20 logs
                        if log['level'] != 'WARNING':
                            print(f"  {log['level']}: {log['message']}")
                    
                    # Take screenshot
                    driver.save_screenshot("logs/continue_chat_loaded.png")
                    print("✓ Screenshot saved to logs/continue_chat_loaded.png")
                    
                    # Get page source for debugging
                    with open("logs/continue_chat_page.html", "w") as f:
                        f.write(driver.page_source)
                    print("✓ Page source saved to logs/continue_chat_page.html")
                    
                else:
                    print("✗ Did not navigate to chat page with thread parameter")
            else:
                print("✗ No Continue Chat button found")
        else:
            print("✗ No chat sessions found")
            
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        driver.save_screenshot("logs/continue_chat_error.png")
        with open("logs/continue_chat_error.html", "w") as f:
            f.write(driver.page_source)
    finally:
        driver.quit()

if __name__ == "__main__":
    test_continue_chat()