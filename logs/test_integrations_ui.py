import requests
import json
from datetime import datetime

# Test credentials
email = "chetan@omegaintelligence.ai"
password = "Test123."

# Login first
login_response = requests.post("http://localhost:5000/api/auth/login", json={
    "email": email,
    "password": password
})

if login_response.status_code != 200:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
    exit(1)

auth_data = login_response.json()
token = auth_data["access_token"]
print(f"Login successful, token: {token[:20]}...")

# Test integrations endpoint
headers = {"Authorization": f"Bearer {token}"}
integrations_response = requests.get("http://localhost:5000/api/integrations", headers=headers)

print(f"\nIntegrations endpoint status: {integrations_response.status_code}")
if integrations_response.status_code == 200:
    integrations = integrations_response.json()
    print(f"Found {len(integrations)} integrations:")
    for integration in integrations:
        print(f"  - {integration['service_name']} ({integration['service_type']}): enabled={integration['enabled']}, connected={integration['is_connected']}")
else:
    print(f"Error: {integrations_response.text}")