#!/usr/bin/env python3
"""
Backend API Test Suite for Green Ledger Dashboard
Tests all API endpoints for green hydrogen credits management system
"""

import requests
import json
from datetime import datetime, timedelta
import uuid
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'https://carbon-mobile-dash.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE}")

class GreenLedgerAPITest:
    def __init__(self):
        self.session = requests.Session()
        self.test_users = {}
        self.test_credits = {}
        self.test_transactions = {}
        
    def log_test(self, test_name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if not success:
            print(f"   Error: {details}")
        print()
        
    def test_health_endpoints(self):
        """Test basic health and connectivity endpoints"""
        print("=== Testing Health & Connectivity ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{API_BASE}/")
            success = response.status_code == 200 and "Green Ledger API" in response.text
            self.log_test("Root endpoint (/api/)", success, 
                         f"Status: {response.status_code}, Response: {response.text[:100]}")
        except Exception as e:
            self.log_test("Root endpoint (/api/)", False, str(e))
            
        # Test health endpoint
        try:
            response = self.session.get(f"{API_BASE}/health")
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "status" in data and data["status"] == "healthy"
            self.log_test("Health endpoint (/api/health)", success,
                         f"Status: {response.status_code}, Response: {response.text[:100]}")
        except Exception as e:
            self.log_test("Health endpoint (/api/health)", False, str(e))
    
    def test_authentication(self):
        """Test authentication system with different roles"""
        print("=== Testing Authentication System ===")
        
        roles = ["producer", "buyer", "regulator"]
        
        for role in roles:
            username = f"test_{role}_{uuid.uuid4().hex[:8]}"
            
            try:
                # Test login/user creation
                login_data = {
                    "username": username,
                    "role": role
                }
                
                response = self.session.post(f"{API_BASE}/auth/login", 
                                           json=login_data)
                
                success = response.status_code == 200
                if success:
                    data = response.json()
                    success = (data.get("success") == True and 
                             "user" in data and 
                             data["user"]["role"] == role)
                    
                    if success:
                        self.test_users[role] = data["user"]
                
                self.log_test(f"Login as {role}", success,
                             f"Status: {response.status_code}, User ID: {data.get('user', {}).get('id', 'N/A') if success else 'Failed'}")
                
                # Test login for existing user
                response2 = self.session.post(f"{API_BASE}/auth/login", 
                                            json=login_data)
                success2 = response2.status_code == 200
                if success2:
                    data2 = response2.json()
                    success2 = data2.get("success") == True
                
                self.log_test(f"Re-login as existing {role}", success2,
                             f"Status: {response2.status_code}")
                             
            except Exception as e:
                self.log_test(f"Login as {role}", False, str(e))
    
    def test_producer_functionality(self):
        """Test producer credit minting and management"""
        print("=== Testing Producer Functionality ===")
        
        if "producer" not in self.test_users:
            self.log_test("Producer functionality", False, "No producer user available")
            return
            
        producer = self.test_users["producer"]
        producer_id = producer["id"]
        
        # Test credit minting
        try:
            production_data = {
                "batch_id": f"BATCH_{uuid.uuid4().hex[:8]}",
                "units": 100.5,
                "production_date": datetime.utcnow().isoformat()
            }
            
            response = self.session.post(f"{API_BASE}/producer/mint-credit?producer_id={producer_id}",
                                       json=production_data)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = (data.get("success") == True and 
                         "credit" in data and 
                         "transaction_hash" in data and
                         len(data["transaction_hash"]) > 50)  # Check blockchain hash format
                
                if success:
                    self.test_credits["producer_credit"] = data["credit"]
            
            self.log_test("Mint credit", success,
                         f"Status: {response.status_code}, Hash: {data.get('transaction_hash', 'N/A')[:20]}..." if success else "Failed")
                         
        except Exception as e:
            self.log_test("Mint credit", False, str(e))
        
        # Test fetching producer credits
        try:
            response = self.session.get(f"{API_BASE}/producer/{producer_id}/credits")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = (data.get("success") == True and 
                         "credits" in data and 
                         isinstance(data["credits"], list))
            
            self.log_test("Fetch producer credits", success,
                         f"Status: {response.status_code}, Credits count: {len(data.get('credits', [])) if success else 'N/A'}")
                         
        except Exception as e:
            self.log_test("Fetch producer credits", False, str(e))
    
    def test_buyer_functionality(self):
        """Test buyer marketplace and purchasing"""
        print("=== Testing Buyer Functionality ===")
        
        if "buyer" not in self.test_users:
            self.log_test("Buyer functionality", False, "No buyer user available")
            return
            
        buyer = self.test_users["buyer"]
        buyer_id = buyer["id"]
        
        # Test fetching available credits
        try:
            response = self.session.get(f"{API_BASE}/buyer/available-credits")
            
            success = response.status_code == 200
            available_credits = []
            if success:
                data = response.json()
                success = (data.get("success") == True and 
                         "credits" in data and 
                         isinstance(data["credits"], list))
                available_credits = data.get("credits", [])
            
            self.log_test("Fetch available credits", success,
                         f"Status: {response.status_code}, Available credits: {len(available_credits)}")
                         
        except Exception as e:
            self.log_test("Fetch available credits", False, str(e))
            available_credits = []
        
        # Test credit purchase (if credits available)
        if available_credits and "producer_credit" in self.test_credits:
            try:
                credit_to_buy = self.test_credits["producer_credit"]
                
                purchase_data = {
                    "credit_id": credit_to_buy["id"],
                    "buyer_id": buyer_id,
                    "units": credit_to_buy["units"]
                }
                
                response = self.session.post(f"{API_BASE}/buyer/purchase-credit",
                                           json=purchase_data)
                
                success = response.status_code == 200
                if success:
                    data = response.json()
                    success = (data.get("success") == True and 
                             "transaction" in data and 
                             "transaction_hash" in data)
                
                self.log_test("Purchase credit", success,
                             f"Status: {response.status_code}, Hash: {data.get('transaction_hash', 'N/A')[:20]}... if success else 'Failed'")
                             
            except Exception as e:
                self.log_test("Purchase credit", False, str(e))
        
        # Test fetching buyer purchases
        try:
            response = self.session.get(f"{API_BASE}/buyer/{buyer_id}/purchases")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = (data.get("success") == True and 
                         "purchases" in data and 
                         isinstance(data["purchases"], list))
            
            self.log_test("Fetch buyer purchases", success,
                         f"Status: {response.status_code}, Purchases count: {len(data.get('purchases', [])) if success else 'N/A'}")
                         
        except Exception as e:
            self.log_test("Fetch buyer purchases", False, str(e))
    
    def test_regulator_functionality(self):
        """Test regulator monitoring and compliance"""
        print("=== Testing Regulator Functionality ===")
        
        # Test fetching all transactions
        try:
            response = self.session.get(f"{API_BASE}/regulator/transactions")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = (data.get("success") == True and 
                         "transactions" in data and 
                         isinstance(data["transactions"], list))
            
            self.log_test("Fetch all transactions", success,
                         f"Status: {response.status_code}, Transactions count: {len(data.get('transactions', [])) if success else 'N/A'}")
                         
        except Exception as e:
            self.log_test("Fetch all transactions", False, str(e))
        
        # Test credits overview
        try:
            response = self.session.get(f"{API_BASE}/regulator/credits-overview")
            
            success = response.status_code == 200
            if success:
                data = response.json()
                success = (data.get("success") == True and 
                         "overview" in data and 
                         "total_credits" in data["overview"])
            
            self.log_test("Fetch credits overview", success,
                         f"Status: {response.status_code}, Total credits: {data.get('overview', {}).get('total_credits', 'N/A') if success else 'N/A'}")
                         
        except Exception as e:
            self.log_test("Fetch credits overview", False, str(e))
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Green Ledger Backend API Tests")
        print("=" * 50)
        
        self.test_health_endpoints()
        self.test_authentication()
        self.test_producer_functionality()
        self.test_buyer_functionality()
        self.test_regulator_functionality()
        
        print("=" * 50)
        print("✅ Backend API testing completed!")

if __name__ == "__main__":
    tester = GreenLedgerAPITest()
    tester.run_all_tests()