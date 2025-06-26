#!/usr/bin/env python3
"""Check current state of the application"""

from playwright.sync_api import sync_playwright
import time

def check_current_state():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        print("Checking current application state...")
        
        # Navigate
        page.goto("http://localhost:3000")
        time.sleep(5)
        
        # Take full page screenshot
        page.screenshot(path="/root/openBB/tests/current_state_full.png", full_page=True)
        
        # Get page content summary
        text_content = page.text_content("body")
        
        # Check for key indicators
        has_error = "Error loading" in text_content
        has_demo = "DEMO" in text_content
        has_no_news = "No news available" in text_content
        has_apple = "Apple Inc" in text_content
        has_price = "$200" in text_content or "$201" in text_content
        
        print("\nApplication Status:")
        print(f"- Has errors: {has_error}")
        print(f"- Has DEMO data: {has_demo}")
        print(f"- Has 'No news': {has_no_news}")
        print(f"- Has Apple data: {has_apple}")
        print(f"- Has price data: {has_price}")
        
        # Check all visible tabs
        tabs = page.locator('a[role="tab"], button[role="tab"], [role="tab"]').all_text_contents()
        print(f"\nVisible tabs: {tabs}")
        
        browser.close()

if __name__ == "__main__":
    check_current_state()