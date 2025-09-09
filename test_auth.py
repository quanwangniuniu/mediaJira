#!/usr/bin/env python3
import requests
import json

# Test authentication
auth_url = "http://nginx/auth/login/"
auth_data = {
    "email": "zhangkahuang8@gmail.com",
    "password": "Admin123test"
}

print("Testing authentication...")
print(f"URL: {auth_url}")
print(f"Data: {auth_data}")

response = requests.post(auth_url, json=auth_data)
print(f"Status: {response.status_code}")
print(f"Headers: {dict(response.headers)}")
print(f"Response: {response.text}")

if response.status_code == 200:
    data = response.json()
    token = data.get("token")
    print(f"Token: {token[:50]}..." if token else "No token")
else:
    print("Authentication failed")

