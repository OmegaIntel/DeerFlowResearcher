#!/usr/bin/env python3
"""Test script to verify the login endpoint."""
import requests
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

def test_login_form_data():
    """Test login with form data (OAuth2PasswordRequestForm format)."""
    logger.info("Testing login with form data...")
    
    # OAuth2PasswordRequestForm expects 'username' field for email
    data = {
        "username": "chetan@omegaintelligence.ai",  # OAuth2 spec uses 'username' for email
        "password": "Test123."
    }
    
    response = requests.post(
        f"{BASE_URL}/api/token",
        data=data,  # form data, not JSON
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    logger.info(f"Status Code: {response.status_code}")
    logger.info(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        logger.info(f"Login successful! Token: {data.get('access_token', '')[:50]}...")
        return data.get('access_token')
    else:
        logger.error(f"Login failed: {response.text}")
        return None

def test_login_json():
    """Test login with JSON data (alternative format)."""
    logger.info("\nTesting login with JSON data...")
    
    data = {
        "username": "chetan@omegaintelligence.ai",
        "password": "Test123."
    }
    
    response = requests.post(
        f"{BASE_URL}/api/token",
        json=data,
        headers={"Content-Type": "application/json"}
    )
    
    logger.info(f"Status Code: {response.status_code}")
    logger.info(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        logger.info(f"Login successful! Token: {data.get('access_token', '')[:50]}...")
        return data.get('access_token')
    else:
        logger.error(f"Login failed: {response.text}")
        return None

def test_authenticated_request(token):
    """Test an authenticated request using the token."""
    if not token:
        logger.warning("No token provided, skipping authenticated request test")
        return
        
    logger.info("\nTesting authenticated request...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    response = requests.get(
        f"{BASE_URL}/api/users/me",
        headers=headers
    )
    
    logger.info(f"Status Code: {response.status_code}")
    logger.info(f"Response: {response.text}")
    
    if response.status_code == 200:
        user_data = response.json()
        logger.info(f"User authenticated successfully: {user_data}")
    else:
        logger.error(f"Authentication failed: {response.text}")

def main():
    """Run all tests."""
    logger.info("=== Testing Password Login Endpoint ===")
    logger.info(f"Endpoint: POST {BASE_URL}/api/token")
    logger.info("Expected credentials: chetan@omegaintelligence.ai / Test123.")
    logger.info("")
    
    # Test form data login (standard OAuth2 format)
    token = test_login_form_data()
    
    # Test JSON login (alternative format)
    json_token = test_login_json()
    
    # Use whichever token we got
    final_token = token or json_token
    
    # Test authenticated request
    if final_token:
        test_authenticated_request(final_token)
    
    logger.info("\n=== Summary ===")
    logger.info("The password login endpoint is: POST /api/token")
    logger.info("It accepts OAuth2PasswordRequestForm format with fields:")
    logger.info("  - username: The user's email address")
    logger.info("  - password: The user's password")
    logger.info("Content-Type: application/x-www-form-urlencoded")
    logger.info("\nThe endpoint is implemented in: src/api/api_generate_token.py")

if __name__ == "__main__":
    main()