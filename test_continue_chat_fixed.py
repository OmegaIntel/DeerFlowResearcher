#!/usr/bin/env python3
"""Test continue chat functionality after fix"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
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
    chrome_options.add_experimental_option('excludeSwitches', ['enable-logging'])
    
    # Enable console logging
    chrome_options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 30)
    
    try:
        # Login
        print(f"[{datetime.now()}] Starting test...")
        login_user(driver, wait)
        
        # Navigate to chat history
        print(f"[{datetime.now()}] Navigating to chat history...")
        driver.get(f"{BASE_URL}/chat-history")
        time.sleep(3)
        
        # Wait for sessions to load
        print("Waiting for chat sessions to load...")
        sessions = wait.until(EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, "div[class*='card'][class*='cursor-pointer']")
        ))
        
        print(f"✓ Found {len(sessions)} chat sessions")
        
        if len(sessions) > 0:
            # Click on the first session
            print(f"\n[{datetime.now()}] Clicking on first session...")
            sessions[0].click()
            time.sleep(2)
            
            # Look for the Continue Chat button in the detail view
            continue_button = wait.until(EC.element_to_be_clickable(
                (By.XPATH, "//div[contains(@class, 'flex-1')]//button[contains(text(), 'Continue Chat')]")
            ))
            
            print(f"✓ Found Continue Chat button")
            
            # Click Continue Chat
            print(f"[{datetime.now()}] Clicking Continue Chat...")
            continue_button.click()
            
            # Wait for navigation to chat page
            wait.until(EC.url_contains("/chat?thread="))
            time.sleep(5)  # Wait for messages to load
            
            # Get the thread ID from URL
            current_url = driver.current_url
            thread_id = current_url.split("thread=")[1].split("&")[0]
            print(f"✓ Navigated to chat with thread_id: {thread_id}")
            
            # Check console logs
            logs = driver.get_log('browser')
            store_logs = [log for log in logs if '[Store]' in log['message']]
            
            print(f"\n[{datetime.now()}] Store loading logs:")
            for log in store_logs[-10:]:
                print(f"  {log['message']}")
            
            # Check for messages
            # Look for message bubbles
            message_bubbles = driver.find_elements(By.CSS_SELECTOR, "div[class*='rounded-2xl'][class*='px-4'][class*='py-3']")
            print(f"\n✓ Found {len(message_bubbles)} message bubbles")
            
            # Check for research cards
            research_cards = driver.find_elements(By.XPATH, "//div[contains(text(), 'Deep Research')]")
            print(f"✓ Found {len(research_cards)} research cards")
            
            # Check for plan cards
            plan_cards = driver.find_elements(By.XPATH, "//div[contains(text(), 'Plan')]")
            print(f"✓ Found {len(plan_cards)} plan cards")
            
            # Take screenshot
            driver.save_screenshot("logs/continue_chat_fixed.png")
            print("\n✓ Screenshot saved to logs/continue_chat_fixed.png")
            
            # Check if messages loaded properly
            if len(message_bubbles) > 1:
                print("\n✅ SUCCESS: Chat history loaded with multiple messages!")
            else:
                print("\n⚠️  WARNING: Only found", len(message_bubbles), "message bubbles")
                
                # Save page source for debugging
                with open("logs/continue_chat_fixed.html", "w") as f:
                    f.write(driver.page_source)
                print("Page source saved for debugging")
                
        else:
            print("✗ No chat sessions found")
            
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        
        driver.save_screenshot("logs/continue_chat_error.png")
        with open("logs/continue_chat_error.html", "w") as f:
            f.write(driver.page_source)
            
    finally:
        driver.quit()

if __name__ == "__main__":
    test_continue_chat()