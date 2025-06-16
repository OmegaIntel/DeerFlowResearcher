#!/usr/bin/env python3
"""Test research flow through the UI to understand the complete integration"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
import time
from datetime import datetime

def test_ui_research_flow():
    """Test research flow through the UI"""
    
    # Set up Chrome options
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Initialize the driver
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        print(f"[{datetime.now()}] 1. NAVIGATING TO APP...")
        driver.get("http://localhost:3001")
        time.sleep(2)
        
        # Login
        print(f"[{datetime.now()}] 2. LOGGING IN...")
        email_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
        )
        email_input.send_keys("chetan@omegaintelligence.ai")
        
        password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
        password_input.send_keys("Test123.")
        password_input.send_keys(Keys.RETURN)
        
        time.sleep(3)
        
        # Navigate to chat
        print(f"[{datetime.now()}] 3. NAVIGATING TO CHAT...")
        driver.get("http://localhost:3001/chat")
        time.sleep(2)
        
        # Check if investigation toggle exists and is enabled
        print(f"[{datetime.now()}] 4. CHECKING INVESTIGATION TOGGLE...")
        try:
            investigation_toggle = driver.find_element(By.CSS_SELECTOR, "button[role='switch'][aria-checked='true']")
            print("✓ Investigation toggle is ON")
        except:
            print("✗ Investigation toggle is OFF or not found")
            # Try to find and click the toggle
            try:
                toggle = driver.find_element(By.CSS_SELECTOR, "button[role='switch']")
                toggle.click()
                print("✓ Enabled investigation toggle")
                time.sleep(1)
            except:
                print("⚠️  Could not find investigation toggle")
        
        # Find the input box
        print(f"[{datetime.now()}] 5. SENDING RESEARCH MESSAGE...")
        input_box = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='Message']"))
        )
        
        # Type a research question
        research_question = "What are the top 3 AI trends in 2024?"
        input_box.send_keys(research_question)
        input_box.send_keys(Keys.RETURN)
        
        print(f"✓ Sent message: {research_question}")
        
        # Wait for response to start
        print(f"[{datetime.now()}] 6. WAITING FOR RESEARCH FLOW...")
        
        # Look for research card or planner response
        research_started = False
        for i in range(30):  # Wait up to 30 seconds
            try:
                # Check for research card
                research_card = driver.find_element(By.XPATH, "//*[contains(text(), 'Deep Research')]")
                print(f"✓ Research card appeared")
                research_started = True
                break
            except:
                pass
            
            try:
                # Check for planner response
                planner_text = driver.find_element(By.XPATH, "//*[contains(text(), 'has_enough_context')]")
                print(f"✓ Planner response detected")
                research_started = True
                break
            except:
                pass
            
            time.sleep(1)
        
        if not research_started:
            print("⚠️  No research flow detected")
        
        # Wait for completion
        print(f"[{datetime.now()}] 7. WAITING FOR COMPLETION...")
        time.sleep(20)  # Give it time to complete
        
        # Check for reporter content
        print(f"[{datetime.now()}] 8. CHECKING FOR REPORTER OUTPUT...")
        reporter_found = False
        try:
            # Look for markdown headers that reporter typically uses
            reporter_elements = driver.find_elements(By.XPATH, "//h1 | //h2 | //h3")
            for elem in reporter_elements:
                text = elem.text
                if "AI" in text or "trend" in text.lower() or "2024" in text:
                    print(f"✓ Found reporter content: {text}")
                    reporter_found = True
                    break
        except:
            pass
        
        if not reporter_found:
            print("⚠️  No reporter content found")
        
        # Take a screenshot
        print(f"[{datetime.now()}] 9. TAKING SCREENSHOT...")
        driver.save_screenshot("logs/ui_research_flow_screenshot.png")
        print("✓ Screenshot saved to logs/ui_research_flow_screenshot.png")
        
        # Get page source for debugging
        with open("logs/ui_research_flow_page.html", "w") as f:
            f.write(driver.page_source)
        print("✓ Page source saved to logs/ui_research_flow_page.html")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        driver.save_screenshot("logs/ui_research_error_screenshot.png")
        
    finally:
        driver.quit()
        print(f"\n[{datetime.now()}] TEST COMPLETED")

if __name__ == "__main__":
    print("=" * 60)
    print("UI RESEARCH FLOW TEST")
    print("=" * 60)
    test_ui_research_flow()
    print("=" * 60)