import requests
import json

# Create a test user
def create_test_user():
    url = "http://ec2-54-91-85-225.compute-1.amazonaws.com:8000/api/register"
    
    # Use form data since the API expects Form(...) parameters
    payload = {
        "email": "test@example.com",
        "password": "password123"
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
        elif response.status_code == 409:
            print("User already exists")
        else:
            print("Failed to create user")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_test_user()