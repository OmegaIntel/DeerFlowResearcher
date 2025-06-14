import requests
import json

# Create a test user
def create_test_user():
    # First, try to create with test2@example.com
    url = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000/api/register"
    
    # Use form data since the API expects Form(...) parameters
    payload = {
        "email": "test2@example.com",
        "password": "testpass123"
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        # Send as form data
        response = requests.post(url, data=payload, headers=headers)
        print(f"Registration response status: {response.status_code}")
        print(f"Registration response: {response.text}")
        
        if response.status_code == 200:
            print("User created successfully!")
            print("Email: test2@example.com")
            print("Password: testpass123")
            return True
        elif response.status_code == 400:
            print("User already exists")
            return True
        else:
            print("Failed to create user")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    create_test_user()