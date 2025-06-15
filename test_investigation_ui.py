#!/usr/bin/env python3
"""Test Investigation toggle UI functionality."""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import time
import os

# Setup Chrome options
chrome_options = Options()
chrome_options.add_argument('--headless')
chrome_options.add_argument('--no-sandbox')
chrome_options.add_argument('--disable-dev-shm-usage')
chrome_options.add_argument('--disable-gpu')
chrome_options.add_argument('--disable-software-rasterizer')
chrome_options.add_argument('--window-size=1920,1080')

# Create driver
driver = webdriver.Chrome(options=chrome_options)
wait = WebDriverWait(driver, 30)

try:
    print("=== Testing Investigation Toggle UI ===\n")
    
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
    
    # Step 2: Find and click Investigation toggle
    print("\n2. Looking for Investigation toggle button...")
    
    # Wait for the button with "Investigation" text
    investigation_button = wait.until(
        EC.presence_of_element_located((By.XPATH, "//button[contains(., 'Investigation')]"))
    )
    print("✅ Found Investigation button")
    
    # Check current state
    button_classes = investigation_button.get_attribute("class")
    initial_state = "border-brand" in button_classes
    print(f"Initial state: {'ON' if initial_state else 'OFF'}")
    
    # Click to toggle
    investigation_button.click()
    time.sleep(0.5)
    
    # Check new state
    button_classes = investigation_button.get_attribute("class")
    new_state = "border-brand" in button_classes
    print(f"New state: {'ON' if new_state else 'OFF'}")
    
    # Make sure it's ON
    if not new_state:
        investigation_button.click()
        time.sleep(0.5)
        button_classes = investigation_button.get_attribute("class")
        new_state = "border-brand" in button_classes
        print(f"Final state: {'ON' if new_state else 'OFF'}")
    
    # Step 3: Send a message
    print("\n3. Sending a test message with Investigation ON...")
    
    # Find textarea
    textarea = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "textarea[placeholder*='What can I do for you?']"))
    )
    textarea.send_keys("What are the latest trends in AI?")
    
    # Find and click send button
    send_button = driver.find_element(By.CSS_SELECTOR, "button[class*='rounded-full']:last-child")
    send_button.click()
    
    print("✅ Message sent")
    
    # Step 4: Wait for research flow indicators
    print("\n4. Waiting for research flow indicators...")
    
    # Wait for either planner message or interrupt
    try:
        # Look for planner agent indicator or interrupt message
        planner_found = False
        interrupt_found = False
        
        # Wait up to 30 seconds for research indicators
        for i in range(30):
            # Check for planner agent
            planner_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'planner') or contains(text(), 'Planner')]")
            if planner_elements:
                planner_found = True
                print("✅ Found planner agent message")
                break
            
            # Check for interrupt/plan review
            interrupt_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'Review the Plan') or contains(text(), 'Edit plan') or contains(text(), 'Start research')]")
            if interrupt_elements:
                interrupt_found = True
                print("✅ Found interrupt/plan review message")
                break
            
            time.sleep(1)
        
        if planner_found or interrupt_found:
            print("\n✅ SUCCESS: Investigation toggle triggers research flow in UI!")
        else:
            print("\n❌ FAILED: No research flow indicators found")
            
            # Take screenshot for debugging
            driver.save_screenshot("/tmp/investigation_test.png")
            print("Screenshot saved to /tmp/investigation_test.png")
            
    except Exception as e:
        print(f"Error checking for research flow: {e}")
        
except Exception as e:
    print(f"Test failed with error: {e}")
    driver.save_screenshot("/tmp/investigation_error.png")
    print("Error screenshot saved to /tmp/investigation_error.png")

finally:
    driver.quit()
    print("\nTest completed")