"""
DALLI E-commerce Load Testing with Locust
Distributed load testing for e-commerce platform
"""

from locust import HttpUser, task, between, events
from locust.exception import RescheduleTask
import random
import json
import time
import json
import os

class EcommerceUser(HttpUser):
    wait_time = between(1, 3)
    host = "https://dalli.rs"
    
    # Test data
    test_users = [
        {"email": "test1@dalli.rs", "password": "Test123!"},
        {"email": "test2@dalli.rs", "password": "Test123!"},
        {"email": "test3@dalli.rs", "password": "Test123!"}
    ]
    
    test_products = [
        {"id": 1, "slug": "osnovna-majica", "category": "majice", "name": "Osnovna Majica"},
        { "id": 2, "slug": "muski-duks-hoodie", "category": "dukseri", "name": "Muški Duks" },
        { "id": 3, "slug": "zenska-trenerka", "category": "trenerke", "name": "Ženska Trenerka" }
    ]
    
    categories = ['muska-garderoba', 'zenska-garderoba', 'dukseri', 'trenerke', 'carape']
    
    def on_start(self):
        """Initialize user session"""
        self.client.verify = False  # Skip SSL verification for testing
        self.client.headers.update({
            'User-Agent': 'Locust-LoadTest/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'sr-RS,sr;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br'
        })
        self.login()
    
    def login(self):
        """Authenticate user"""
        user = self.get_random_user()
        with self.client.post("/api/auth/login", json={
            "email": self.current_user["email"],
            "password": self.current_user["password"]
        }, catch_response=True) as response:
            if response.status_code == 200:
                self.token = response.json().get("token")
                self.client.headers.update({"Authorization": f"Bearer {self.token}"})
            else:
                response.failure("Login failed")
    
    def get_random_user(self):
        return self.environment.parsed_options.test_users[
            int(self.environment.parsed_options.test_users.index(self)) % len(self.environment.parsed_options.test_users)
        ]
    
    @task(30)
    def browse_home(self):
        """Browse homepage"""
        with self.client.get("/", catch_response=True, name="Home Page") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Home page failed: {response.status_code}")
    
    @task(20)
    def browse_category(self):
        """Browse a category page"""
        categories = ['muska-garderoba', 'zenska-garderoba', 'dukseri', 'trenerke', 'carape']
        category = random.choice(self.categories)
        
        with self.client.get(f"/{category}.html", catch_response=True, name="Category Page") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Category page failed: {response.status_code}")
    
    @task(25)
    def view_product(self):
        """View product detail page"""
        product = self.get_random_product()
        slug = product["slug"]
        
        with self.client.get(f"/proizvod-{product['slug']}.html", catch_response=True, name="Product Detail") as response:
            if response.status_code == 200:
                if product["name"] in response.text:
                    response.success()
                else:
                    response.failure("Product name not found in response")
            else:
                response.failure(f"Product page failed: {response.status_code}")
    
    @task(15)
    def add_to_cart(self):
        """Add product to cart"""
        product = self.get_random_product()
        product_id = product["id"]
        
        # Get CSRF token if needed
        with self.client.get("/api/csrf-token", catch_response=True) as csrf_response:
            if csrf_response.status_code == 200:
                csrf_token = csrf_response.json().get("token", "")
            else:
                csrf_token = ""
        
        payload = {
            "productId": product["id"],
            "quantity": 1
        }
        
        headers = {"Content-Type": "application/json"}
        if hasattr(self, 'token') and self.token:
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        if hasattr(self, 'csrf_token'):
            payload = {"_token": self.csrf_token}
        
        with self.client.post("/api/cart/add", json=payload, catch_response=True, name="Add to Cart") as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Add to cart failed: {response.status_code}")
    
    @task(5)
    def checkout_flow(self):
        """Complete checkout flow"""
        with self.client.get("/cart.html", catch_response=True) as response:
            if response.status_code != 200:
                response.failure("Cart page failed to load")
                return
        
        # Proceed to checkout
        checkout_data = {
            "shippingAddress": {
                "firstName": "Test",
                "lastName": "User",
                "address": "Test Address 123",
                "city": "Beograd",
                "postalCode": "11000",
                "country": "RS",
                "phone": "+381601234567"
            },
            "paymentMethod": "cash_on_delivery",
            "shippingMethod": "post_express"
        }
        
        with self.client.post("/api/checkout", json=checkout_data, catch_response=True, name="Checkout") as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Checkout failed: {response.status_code}")
    
    @task(10)
    def search_products(self):
        """Search for products"""
        queries = ["majica", "dukseri", "trenerka", "čarape", "dukseri"]
        query = random.choice(queries)
        
        with self.client.get(f"/proizvodi.html?q={query}", catch_response=True, name="Search") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Search failed: {response.status_code}")
    
    @task(5)
    def view_orders(self):
        """View order history"""
        with self.client.get("/orders.html", catch_response=True, name="View Orders") as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Orders page failed: {response.status_code}")
    
    def on_stop(self):
        """Cleanup on test stop"""
        pass

# Event hooks for custom metrics
@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        events.request_failure.fire(request_type=request_type, name=name, response_time=0, exception=e)

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"Load test started with {environment.runner.user_count} users")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("Load test completed")

if __name__ == "__main__":
    # For running standalone
    pass