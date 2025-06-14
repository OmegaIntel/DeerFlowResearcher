#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup

def check_ui_changes():
    # Create a session to maintain cookies
    session = requests.Session()
    
    # First, get the login page to get CSRF token if needed
    login_url = "http://localhost:3000/auth/login"
    login_page = session.get(login_url)
    
    # Try to login
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    # Post login data
    response = session.post("http://localhost:3000/api/auth/signin", json=login_data)
    print(f"Login response status: {response.status_code}")
    
    # Now try to access the documents page
    documents_url = "http://localhost:3000/documents"
    documents_page = session.get(documents_url, allow_redirects=True)
    
    # Check if we're still on login page
    if "login" in documents_page.url:
        print("Failed to login, still on login page")
        return
    
    # Parse the HTML
    soup = BeautifulSoup(documents_page.text, 'html.parser')
    
    # Look for upload button
    upload_buttons = soup.find_all(text=lambda text: text and 'upload' in text.lower())
    print(f"\nFound {len(upload_buttons)} elements containing 'upload'")
    
    # Check for button elements
    buttons = soup.find_all('button')
    print(f"\nFound {len(buttons)} button elements")
    
    for i, button in enumerate(buttons[:5]):  # Show first 5 buttons
        print(f"Button {i+1}: {button.get('class', [])} - Text: {button.get_text(strip=True)}")
    
    # Look for header elements
    headers = soup.find_all(['header', 'div'], class_=lambda x: x and ('header' in str(x).lower() or 'top' in str(x).lower()))
    print(f"\nFound {len(headers)} potential header elements")
    
    # Check the page structure
    print("\nPage structure (first 1000 chars):")
    print(documents_page.text[:1000])

if __name__ == "__main__":
    check_ui_changes()