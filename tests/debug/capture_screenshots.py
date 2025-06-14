#!/usr/bin/env python3
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import os

def capture_screenshots():
    # Set up Chrome options for headless mode
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--window-size=1920,1080")
    
    # Initialize the driver with snap chromium
    chrome_options.binary_location = "/snap/bin/chromium"
    service = Service("/snap/chromium/3169/usr/lib/chromium-browser/chromedriver")
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        # Navigate to the documents page
        print("Navigating to documents page...")
        driver.get("http://localhost:3000/documents")
        
        # Wait for redirect to login page
        time.sleep(2)
        
        # Check if we're on the login page
        if "login" in driver.current_url:
            print("Redirected to login page. Attempting to log in...")
            
            # Find and fill login form
            email_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.NAME, "email"))
            )
            password_input = driver.find_element(By.NAME, "password")
            
            # Use test credentials
            email_input.send_keys("test@example.com")
            password_input.send_keys("password123")
            
            # Submit the form
            submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_button.click()
            
            # Wait for navigation to documents page
            WebDriverWait(driver, 10).until(
                EC.url_contains("/documents")
            )
            print("Successfully logged in and navigated to documents page")
        
        # Take screenshot of documents page
        time.sleep(3)  # Allow page to fully load
        screenshot_path = "/root/deer-flow/documents_page_screenshot.png"
        driver.save_screenshot(screenshot_path)
        print(f"Screenshot saved to: {screenshot_path}")
        
        # Try to find and click the upload button
        try:
            upload_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Upload')]"))
            )
            
            # Get the location of the upload button
            location = upload_button.location
            size = upload_button.size
            print(f"Upload button found at: x={location['x']}, y={location['y']}, width={size['width']}, height={size['height']}")
            
            # Check if button is in the header (top area)
            if location['y'] < 100:  # Assuming header is within first 100px
                print("Upload button is in the header area (top of page)")
            else:
                print("Upload button is NOT in the header area")
            
            # Click the upload button
            upload_button.click()
            time.sleep(2)
            
            # Take screenshot of upload dialog
            upload_dialog_screenshot = "/root/deer-flow/upload_dialog_screenshot.png"
            driver.save_screenshot(upload_dialog_screenshot)
            print(f"Upload dialog screenshot saved to: {upload_dialog_screenshot}")
            
        except Exception as e:
            print(f"Could not interact with upload button: {e}")
        
    except Exception as e:
        print(f"Error: {e}")
        # Save error screenshot
        driver.save_screenshot("/root/deer-flow/error_screenshot.png")
    
    finally:
        driver.quit()

if __name__ == "__main__":
    capture_screenshots()