#!/usr/bin/env python3
"""
Authentication System Test for Green Ledger Dashboard
Tests the updated authentication system as per review request
"""

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://carbon-mobile-dash.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing authentication at: {API_BASE}")

class AuthenticationTest:
    def __init__(self):
        self.session = requests.Session()
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
        
    def test_valid_logins(self):
        """Test valid login scenarios for all roles"""
        print("=== Testing Valid Login Scenarios ===")
        
        valid_users = [
            {"username": "producer", "role": "producer"},
            {"username": "buyer", "role": "buyer"},
            {"username": "regulator", "role": "regulator"}
        ]
        
        for user_data in valid_users:
            try:
                response = self.session.post(f"{API_BASE}/auth/login", json=user_data)
                
                success = response.status_code == 200
                details = f"Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    success = (
                        data.get("success") == True and 
                        "user" in data and 
                        data["user"]["username"] == user_data["username"] and
                        data["user"]["role"] == user_data["role"]
                    )
                    if success:
                        details += f", User ID: {data['user']['id']}, Created: {data['user'].get('created_at', 'N/A')}"
                    else:
                        details += f", Response: {response.text[:200]}"
                else:
                    details += f", Response: {response.text[:200]}"
                
                self.log_test(f"Valid login - {user_data['username']}", success, details)
                
            except Exception as e:
                self.log_test(f"Valid login - {user_data['username']}", False, str(e))
    
    def test_invalid_credentials(self):
        """Test invalid login scenarios"""
        print("=== Testing Invalid Login Scenarios ===")
        
        invalid_scenarios = [
            {
                "name": "Invalid username (not producer/buyer/regulator)",
                "data": {"username": "admin", "role": "admin"}
            },
            {
                "name": "Username doesn't match role",
                "data": {"username": "producer", "role": "buyer"}
            },
            {
                "name": "Empty username",
                "data": {"username": "", "role": "producer"}
            },
            {
                "name": "Empty role",
                "data": {"username": "producer", "role": ""}
            },
            {
                "name": "Invalid role",
                "data": {"username": "manager", "role": "manager"}
            }
        ]
        
        for scenario in invalid_scenarios:
            try:
                response = self.session.post(f"{API_BASE}/auth/login", json=scenario["data"])
                
                # For invalid scenarios, we expect either 400 status or success=false
                success = response.status_code == 400 or (
                    response.status_code == 200 and 
                    response.json().get("success") == False
                )
                
                details = f"Status: {response.status_code}, Response: {response.text[:200]}"
                
                self.log_test(scenario["name"], success, details)
                
            except Exception as e:
                self.log_test(scenario["name"], False, str(e))
    
    def test_user_creation_and_relogin(self):
        """Test user creation and re-login functionality"""
        print("=== Testing User Creation & Re-login ===")
        
        test_user = {"username": "producer", "role": "producer"}
        
        # First login - should create user
        try:
            response1 = self.session.post(f"{API_BASE}/auth/login", json=test_user)
            
            success1 = response1.status_code == 200
            user_id1 = None
            
            if success1:
                data1 = response1.json()
                success1 = data1.get("success") == True and "user" in data1
                if success1:
                    user_id1 = data1["user"]["id"]
            
            details1 = f"Status: {response1.status_code}, User ID: {user_id1 if user_id1 else 'N/A'}"
            self.log_test("First login (user creation)", success1, details1)
            
            # Second login - should return existing user
            response2 = self.session.post(f"{API_BASE}/auth/login", json=test_user)
            
            success2 = response2.status_code == 200
            user_id2 = None
            
            if success2:
                data2 = response2.json()
                success2 = data2.get("success") == True and "user" in data2
                if success2:
                    user_id2 = data2["user"]["id"]
                    # Check if same user ID (existing user)
                    success2 = user_id1 == user_id2
            
            details2 = f"Status: {response2.status_code}, User ID: {user_id2 if user_id2 else 'N/A'}, Same user: {user_id1 == user_id2 if user_id1 and user_id2 else False}"
            self.log_test("Re-login (existing user)", success2, details2)
            
        except Exception as e:
            self.log_test("User creation & re-login", False, str(e))
    
    def test_backend_validation(self):
        """Test backend validation logic"""
        print("=== Testing Backend Validation ===")
        
        # Test role validation
        try:
            invalid_role_data = {"username": "producer", "role": "invalid_role"}
            response = self.session.post(f"{API_BASE}/auth/login", json=invalid_role_data)
            
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Role validation (invalid role)", success, details)
            
        except Exception as e:
            self.log_test("Role validation (invalid role)", False, str(e))
        
        # Test username-role matching
        try:
            mismatch_data = {"username": "buyer", "role": "producer"}
            response = self.session.post(f"{API_BASE}/auth/login", json=mismatch_data)
            
            success = response.status_code == 400
            details = f"Status: {response.status_code}, Response: {response.text[:200]}"
            
            self.log_test("Username-role matching validation", success, details)
            
        except Exception as e:
            self.log_test("Username-role matching validation", False, str(e))
    
    def test_password_handling_note(self):
        """Note about password handling discrepancy"""
        print("=== Password Handling Analysis ===")
        
        print("⚠️  NOTE: Backend Implementation Discrepancy")
        print("   The review request mentions password validation (password='1234')")
        print("   However, the current backend implementation does not handle passwords")
        print("   The LoginRequest model only accepts 'username' and 'role' fields")
        print("   Password validation appears to be handled on the frontend only")
        print()
    
    def run_authentication_tests(self):
        """Run complete authentication test suite"""
        print("🔐 Starting Authentication System Tests")
        print("=" * 60)
        
        self.test_password_handling_note()
        self.test_valid_logins()
        self.test_invalid_credentials()
        self.test_user_creation_and_relogin()
        self.test_backend_validation()
        
        print("=" * 60)
        print("✅ Authentication testing completed!")

if __name__ == "__main__":
    tester = AuthenticationTest()
    tester.run_authentication_tests()