#!/usr/bin/env python3
"""Comprehensive test of all reported issues"""

from playwright.sync_api import sync_playwright
import time
import requests

def comprehensive_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        
        # Enable console logging
        context.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        
        page = context.new_page()
        
        print("=" * 60)
        print("COMPREHENSIVE SYSTEM TEST")
        print("=" * 60)
        
        try:
            # 1. Load Overview page
            print("\n1. Testing Overview Page...")
            page.goto("http://localhost:3000", wait_until="domcontentloaded")
            time.sleep(5)
            
            # Take screenshot
            page.screenshot(path="/root/openBB/tests/overview_page.png")
            
            # Check for loading indicators
            loading_count = page.locator('text=/loading/i').count()
            print(f"   Loading indicators: {loading_count}")
            
            # Check for data presence
            has_price = page.locator('text=/$[0-9]+/').count() > 0
            has_company = page.locator('text=/Apple Inc/').count() > 0
            print(f"   Has price data: {has_price}")
            print(f"   Has company data: {has_company}")
            
            # 2. Test MindsDB Tab
            print("\n2. Testing MindsDB Tab...")
            mindsdb_tab = page.locator('text=MindsDB').first
            if mindsdb_tab.count() > 0:
                mindsdb_tab.click()
                time.sleep(3)
                page.screenshot(path="/root/openBB/tests/mindsdb_page.png")
                
                # Check MindsDB status
                disconnected = page.locator('text=/Disconnected/i').count()
                connected = page.locator('text=/Connected/i').count()
                print(f"   MindsDB Disconnected indicators: {disconnected}")
                print(f"   MindsDB Connected indicators: {connected}")
            
            # 3. Test Private Companies Tab
            print("\n3. Testing Private Companies Tab...")
            private_tab = page.locator('text=Private Companies').first
            if private_tab.count() > 0:
                private_tab.click()
                time.sleep(3)
                page.screenshot(path="/root/openBB/tests/private_companies_page.png")
                
                # Check for errors
                errors = page.locator('text=/error/i').count()
                print(f"   Error messages: {errors}")
                
                # Try to capture any specific error text
                error_elements = page.locator('text=/error/i').all()
                for i, elem in enumerate(error_elements[:3]):
                    try:
                        print(f"   Error {i+1}: {elem.text_content()}")
                    except:
                        pass
            
            # 4. Check Network Activity
            print("\n4. Checking API Endpoints...")
            
            # Test key endpoints
            endpoints = [
                ("Overview", "http://localhost:8000/api/v1/equity/fundamental/overview?symbol=AAPL"),
                ("MindsDB Status", "http://localhost:8000/api/v1/mindsdb/status"),
                ("Private Companies", "http://localhost:8000/api/v1/private-companies/search?q=tech&limit=5"),
            ]
            
            for name, url in endpoints:
                try:
                    resp = requests.get(url, timeout=5)
                    print(f"   {name}: {resp.status_code} - {'OK' if resp.status_code == 200 else 'FAILED'}")
                except Exception as e:
                    print(f"   {name}: ERROR - {str(e)}")
            
            # 5. Final full page screenshot
            page.goto("http://localhost:3000")
            time.sleep(3)
            page.screenshot(path="/root/openBB/tests/final_overview_state.png", full_page=True)
            
        except Exception as e:
            print(f"\n✗ Test error: {str(e)}")
            page.screenshot(path="/root/openBB/tests/error_comprehensive.png")
        
        finally:
            browser.close()
        
        print("\n" + "=" * 60)
        print("TEST COMPLETE - Check screenshots for visual confirmation")
        print("=" * 60)

if __name__ == "__main__":
    comprehensive_test()