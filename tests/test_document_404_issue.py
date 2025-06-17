#!/usr/bin/env python3
import requests
import time
from playwright.sync_api import sync_playwright

# Test credentials
email = "chetan@omegaintelligence.ai"
password = "Test123."

def test_document_access():
    print("Testing document access from project view...")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        # Enable console logging
        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))
        
        # Navigate to login page
        page.goto("http://localhost:3000/signin")
        page.wait_for_load_state("networkidle")
        
        # Login
        page.fill('input[name="email"]', email)
        page.fill('input[name="password"]', password)
        page.click('button[type="submit"]')
        page.wait_for_load_state("networkidle")
        
        # Navigate to projects
        page.click('text="Projects"')
        page.wait_for_selector('text="My Projects"', timeout=5000)
        
        # Click on the first project (if any)
        projects = page.query_selector_all('[data-testid="project-card"]')
        if not projects:
            projects = page.query_selector_all('button:has-text("Project")')
        
        if projects:
            print(f"Found {len(projects)} projects")
            projects[0].click()
            page.wait_for_load_state("networkidle")
            
            # Wait for the project detail view
            page.wait_for_selector('text="Documents"', timeout=5000)
            
            # Click on Documents tab
            page.click('text="Documents"')
            time.sleep(1)
            
            # Check if there are any documents
            documents = page.query_selector_all('[data-testid="document-item"]')
            if not documents:
                documents = page.query_selector_all('button:has-text(".pdf")')
                if not documents:
                    documents = page.query_selector_all('button:has-text(".txt")')
                    if not documents:
                        documents = page.query_selector_all('button:has-text(".docx")')
            
            print(f"Found {len(documents)} documents")
            
            if documents:
                # Try to click the first document
                print("Clicking on first document...")
                
                # Start monitoring network requests
                responses = []
                def handle_response(response):
                    if "download-url" in response.url:
                        responses.append({
                            'url': response.url,
                            'status': response.status,
                            'body': response.text() if response.status != 200 else None
                        })
                        print(f"[Network] {response.url} - Status: {response.status}")
                
                page.on("response", handle_response)
                
                documents[0].click()
                
                # Wait a bit to catch any responses
                time.sleep(3)
                
                # Print captured responses
                for resp in responses:
                    print(f"\nResponse Details:")
                    print(f"URL: {resp['url']}")
                    print(f"Status: {resp['status']}")
                    if resp['body']:
                        print(f"Body: {resp['body']}")
                
                # Check if we navigated to document viewer
                current_url = page.url
                print(f"\nCurrent URL: {current_url}")
                
                # Take a screenshot
                page.screenshot(path="logs/document-404-debug.png")
                print("Screenshot saved to logs/document-404-debug.png")
            else:
                print("No documents found in project")
        else:
            print("No projects found")
        
        browser.close()

if __name__ == "__main__":
    test_document_access()