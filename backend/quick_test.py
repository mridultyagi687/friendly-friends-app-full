#!/usr/bin/env python3
"""Quick test script to verify critical endpoints before demo."""

import requests
import json
import sys

BASE_URL = "http://localhost:5002"

def test_endpoint(method, endpoint, data=None, description=""):
    """Test an API endpoint."""
    try:
        url = f"{BASE_URL}{endpoint}"
        print(f"\n{'='*60}")
        print(f"Testing: {description}")
        print(f"{method} {endpoint}")
        
        if method == "GET":
            response = requests.get(url, cookies=session_cookies)
        elif method == "POST":
            response = requests.post(url, json=data, cookies=session_cookies)
        elif method == "PUT":
            response = requests.put(url, json=data, cookies=session_cookies)
        elif method == "DELETE":
            response = requests.delete(url, cookies=session_cookies)
        
        print(f"Status: {response.status_code}")
        
        if response.status_code >= 400:
            print(f"❌ ERROR: {response.text[:200]}")
            return False
        else:
            print(f"✅ SUCCESS")
            if response.text:
                try:
                    result = response.json()
                    print(f"Response: {json.dumps(result, indent=2)[:200]}...")
                except:
                    print(f"Response: {response.text[:200]}")
            return True
    except Exception as e:
        print(f"❌ EXCEPTION: {e}")
        return False

# Test login first
print("="*60)
print("DEMO PRE-FLIGHT CHECK")
print("="*60)

session_cookies = {}

# Test 1: Login
print("\n1. Testing Login...")
print("⚠️  Using default credentials. Update this script with your test account!")
username = input("Enter username (or press Enter for 'demo'): ").strip() or "demo"
password = input("Enter password (or press Enter for 'demo123'): ").strip() or "demo123"
login_data = {"username": username, "password": password}
response = requests.post(f"{BASE_URL}/api/login", json=login_data)
if response.status_code == 200:
    session_cookies = response.cookies
    print("✅ Login successful")
else:
    print(f"❌ Login failed: {response.status_code} - {response.text}")
    print("\n⚠️  Make sure:")
    print("   - Backend is running on port 5002")
    print("   - Admin user exists (username: admin, password: admin123)")
    sys.exit(1)

# Test 2: Get current user
test_endpoint("GET", "/api/me", description="Get current user")

# Test 3: List Cloud PCs
test_endpoint("GET", "/api/cloud-pcs", description="List Cloud PCs")

# Test 4: Create Cloud PC
pc_data = {"name": "Demo Test PC", "os_version": "1.0 beta"}
result = test_endpoint("POST", "/api/cloud-pcs", data=pc_data, description="Create Cloud PC")
if result:
    # Try to get the created PC
    response = requests.get(f"{BASE_URL}/api/cloud-pcs", cookies=session_cookies)
    if response.status_code == 200:
        pcs = response.json().get("cloud_pcs", [])
        if pcs:
            pc_id = pcs[0]["id"]
            print(f"\n✅ Found Cloud PC with ID: {pc_id}")
            
            # Test 5: Get specific Cloud PC
            test_endpoint("GET", f"/api/cloud-pcs/{pc_id}", description="Get Cloud PC")
            
            # Test 6: Verify password
            test_endpoint("POST", f"/api/cloud-pcs/{pc_id}/verify-password", 
                         data={"password": "admin123"}, 
                         description="Verify Cloud PC password")
            
            # Test 7: List files
            test_endpoint("GET", f"/api/cloud-pcs/{pc_id}/files", description="List files")
            
            # Test 8: Get open apps
            test_endpoint("GET", f"/api/cloud-pcs/{pc_id}/open-apps", description="Get open apps")

# Test 9: AI Apps
test_endpoint("GET", "/api/ai-apps", description="List AI Apps")

# Test 10: App Store
test_endpoint("GET", "/api/app-store", description="Get App Store")

print("\n" + "="*60)
print("✅ PRE-FLIGHT CHECK COMPLETE")
print("="*60)
print("\nIf all tests passed, you're ready for the demo!")
print("If any tests failed, check the error messages above.")

