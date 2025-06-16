#!/usr/bin/env python3
"""Test research flow from UI to verify reports are saved"""

import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from datetime import datetime

# Test credentials
EMAIL = "chetan@omegaintelligence.ai"
PASSWORD = "Test123."

# Setup Chrome options
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

def test_research_flow():
    """Test research flow from UI"""
    driver = webdriver.Chrome(options=chrome_options)
    wait = WebDriverWait(driver, 30)
    
    try:
        # 1. Login
        print(f"[{datetime.now()}] Starting UI test...")
        driver.get("http://localhost:3000")
        time.sleep(2)
        
        print(f"[{datetime.now()}] Logging in...")
        email_input = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']")))
        email_input.send_keys(EMAIL)
        
        password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        password_input.send_keys(PASSWORD)
        password_input.send_keys(Keys.RETURN)
        
        # Wait for chat interface
        wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "textarea")))
        print("✓ Login successful")
        time.sleep(2)
        
        # 2. Send research query
        print(f"\n[{datetime.now()}] Sending research query...")
        chat_input = driver.find_element(By.CSS_SELECTOR, "textarea")
        
        # Click on research mode button if available
        try:
            research_btn = driver.find_element(By.XPATH, "//*[contains(text(), '@research') or contains(@aria-label, 'research')]")
            research_btn.click()
            print("✓ Research mode selected")
            time.sleep(1)
        except:
            # Type @research in message
            chat_input.send_keys("@research ")
        
        chat_input.send_keys("What are the benefits of meditation?")
        chat_input.send_keys(Keys.RETURN)
        
        print("✓ Research query sent")
        
        # 3. Wait for plan and accept it
        print(f"\n[{datetime.now()}] Waiting for plan...")
        try:
            # Wait for interrupt/plan review
            accept_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Start research') or contains(text(), 'Accept') or contains(text(), 'Continue')]")))
            print("✓ Plan received, accepting...")
            accept_btn.click()
        except:
            print("⚠️  No plan interrupt found, may be auto-accepted")
        
        # 4. Wait for research to complete
        print(f"\n[{datetime.now()}] Waiting for research to complete...")
        
        # Wait for a message that looks like a report (has headers)
        report_found = False
        start_time = time.time()
        max_wait = 120  # 2 minutes
        
        while time.time() - start_time < max_wait:
            messages = driver.find_elements(By.CSS_SELECTOR, ".message-content, [class*='message'], [class*='markdown']")
            
            for msg in messages:
                text = msg.text
                if len(text) > 500 and ("# " in text or "## Key Points" in text or "## Overview" in text):
                    report_found = True
                    print(f"✓ Report found! Length: {len(text)} chars")
                    print(f"  Preview: {text[:200]}...")
                    break
            
            if report_found:
                break
                
            time.sleep(5)
        
        if not report_found:
            print("⚠️  No report found in UI after waiting")
        
        # 5. Navigate to chat history
        print(f"\n[{datetime.now()}] Checking chat history...")
        
        # Click on chat history link/button
        try:
            # Try different selectors for chat history
            history_link = None
            selectors = [
                "//a[contains(@href, '/chat-history')]",
                "//button[contains(text(), 'History')]",
                "//a[contains(text(), 'History')]",
                "//*[contains(@aria-label, 'history')]"
            ]
            
            for selector in selectors:
                try:
                    history_link = driver.find_element(By.XPATH, selector)
                    break
                except:
                    continue
                    
            if history_link:
                history_link.click()
                time.sleep(3)
                print("✓ Navigated to chat history")
                
                # Check if research appears in history
                history_items = driver.find_elements(By.CSS_SELECTOR, "[class*='chat-item'], [class*='history-item'], .cursor-pointer")
                
                research_in_history = False
                for item in history_items:
                    if "meditation" in item.text.lower():
                        research_in_history = True
                        print(f"✓ Research found in history: {item.text[:100]}...")
                        break
                
                if not research_in_history:
                    print("⚠️  Research not found in chat history")
            else:
                print("⚠️  Could not find chat history link")
                
        except Exception as e:
            print(f"Error checking history: {e}")
        
        # Final verdict
        print("\n" + "="*60)
        if report_found:
            print("✅ SUCCESS: Research report was displayed in UI!")
        else:
            print("❌ FAILURE: Research report was not displayed")
        print("="*60)
        
    except Exception as e:
        print(f"Error during test: {e}")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_research_flow()