#!/usr/bin/env python3
import requests
from bs4 import BeautifulSoup
import json

def check_documents_page():
    # First login to get token
    login_url = "http://localhost:8000/api/token"
    login_data = {
        "username": "demo@example.com",
        "password": "Demo123!"
    }
    
    # Get token
    response = requests.post(login_url, data=login_data)
    if response.status_code != 200:
        print(f"Failed to login: {response.text}")
        return
    
    token_data = response.json()
    token = token_data['access_token']
    print(f"Got token: {token[:50]}...")
    
    # Create a session with cookies
    session = requests.Session()
    
    # Set the auth token as a cookie (matching how the frontend does it)
    session.cookies.set('authToken', token, domain='localhost', path='/')
    
    # Also try with Authorization header
    headers = {
        'Authorization': f'Bearer {token}',
        'Cookie': f'authToken={token}'
    }
    
    # Try to access the documents page
    documents_url = "http://localhost:3000/documents"
    response = session.get(documents_url, headers=headers, allow_redirects=False)
    
    print(f"\nDocuments page response status: {response.status_code}")
    print(f"Response URL: {response.url}")
    
    if response.status_code == 307:  # Redirect
        print(f"Redirected to: {response.headers.get('Location')}")
        # Follow redirect
        response = session.get("http://localhost:3000" + response.headers.get('Location'), headers=headers)
        print(f"Login page status: {response.status_code}")
    
    # Parse the HTML to check for upload button
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Search for upload button
        upload_buttons = soup.find_all('button', string=lambda text: text and 'upload' in text.lower() if text else False)
        print(f"\nFound {len(upload_buttons)} upload buttons")
        
        for button in upload_buttons:
            parent = button.parent
            grandparent = parent.parent if parent else None
            print(f"\nUpload button found:")
            print(f"  Text: {button.get_text(strip=True)}")
            print(f"  Classes: {button.get('class', [])}")
            print(f"  Parent tag: {parent.name if parent else 'None'}")
            print(f"  Parent classes: {parent.get('class', []) if parent else []}")
            print(f"  Grandparent tag: {grandparent.name if grandparent else 'None'}")
            print(f"  Grandparent classes: {grandparent.get('class', []) if grandparent else []}")
        
        # Look for header elements
        headers_found = soup.find_all(['header', 'div'], class_=lambda x: x and any(term in str(x).lower() for term in ['header', 'navbar', 'top-bar', 'app-header']))
        print(f"\nFound {len(headers_found)} header elements")
        
        # Save the HTML for inspection
        with open('/root/deer-flow/documents_page.html', 'w') as f:
            f.write(response.text)
        print("\nSaved HTML to documents_page.html")

if __name__ == "__main__":
    check_documents_page()