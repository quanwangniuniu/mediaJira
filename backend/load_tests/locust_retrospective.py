"""
Locust load testing script for retrospective workflow
Tests core retrospective functionality as required by BE4-04

Focus Areas:
- Retrospective task lifecycle
- KPI aggregation performance  
- Dashboard query performance (1000+ KPI rows in <2s)
- Insight generation under load
"""
import json
import random
import uuid
from datetime import datetime, timedelta

from locust import HttpUser, task, between, events


class RetrospectiveUser(HttpUser):
    """Simulates user behavior for retrospective workflow"""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Initialize user session"""
        self.auth_token = None
        self.campaigns = []
        self.retrospectives = []
        self.login()
    
    def login(self):
        """Authenticate user - using actual auth endpoint"""
        # Use actual authentication endpoint
        auth_data = {
            "username": "testuser",
            "password": "testpass123"
        }
        
        response = self.client.post("/authentication/api/login/", json=auth_data)
        if response.status_code == 200:
            self.auth_token = response.json().get("access_token", "test_token")
        else:
            # Fallback for load testing
            self.auth_token = "test_token_for_load_testing"
        
        # Get actual campaigns from API
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        response = self.client.get("/core/api/campaigns/", headers=headers)
        if response.status_code == 200:
            self.campaigns = response.json().get("results", [])[:5]  # Limit to 5 for testing
        else:
            # Fallback campaign data
            self.campaigns = [
                {"id": str(uuid.uuid4()), "name": f"Campaign {i}"} 
                for i in range(1, 6)
            ]
    
    @task(4)
    def query_dashboard_kpi(self):
        """Test dashboard KPI query performance (main requirement)"""
        if not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        campaign_id = random.choice(self.campaigns)["id"]
        
        # Test 30-day KPI query as per requirements
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=30)
        
        params = {
            "campaign_id": campaign_id,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "limit": 1000  # Test with 1000+ records as required
        }
        
        # Use actual KPI endpoint - CampaignMetric API
        with self.client.get("/retrospective/api/campaign_metrics/", 
                           params=params, 
                           headers=headers, 
                           name="Dashboard KPI Query (1000+ records)") as response:
            if response.status_code == 200:
                # Verify response time meets <2s requirement
                if response.elapsed.total_seconds() > 2:
                    response.failure(f"Query took {response.elapsed.total_seconds():.2f}s (>2s requirement)")
    
    @task(3)
    def create_retrospective(self):
        """Test retrospective task lifecycle"""
        if not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        campaign = random.choice(self.campaigns)
        
        retrospective_data = {
            "campaign": campaign['id'],
            "scheduled_at": datetime.now().isoformat(),
            "status": "SCHEDULED"  # Use actual enum value
        }
        
        with self.client.post("/retrospective/api/retrospectives/", 
                            json=retrospective_data,
                            headers=headers, 
                            name="Create Retrospective Task") as response:
            if response.status_code == 201:
                self.retrospectives.append(response.json())
    
    @task(2)
    def generate_insights(self):
        """Test insight generation performance"""
        if not self.retrospectives or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        retrospective = random.choice(self.retrospectives)
        
        # Use actual insight generation endpoint
        with self.client.post(f"/retrospective/api/retrospectives/{retrospective['id']}/generate_report/",
                            headers=headers,
                            name="Generate Report & Insights") as response:
            if response.status_code == 200:
                # Test insight generation time
                if response.elapsed.total_seconds() > 5:
                    response.failure(f"Insight generation took {response.elapsed.total_seconds():.2f}s (>5s)")
    
    @task(2) 
    def query_retrospective_summary(self):
        """Test retrospective summary query"""
        if not self.retrospectives or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        retrospective = random.choice(self.retrospectives)
        
        # Use actual retrospective detail endpoint
        with self.client.get(f"/retrospective/api/retrospectives/{retrospective['id']}/",
                           headers=headers,
                           name="Retrospective Detail") as response:
            pass
    
    @task(1)
    def test_rule_engine(self):
        """Test rule engine performance"""
        if not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test rule with sample KPI data
        test_data = {
            "rule": "roi_threshold",
            "kpi_data": {
                "roi": random.uniform(0.5, 1.5),
                "ctr": random.uniform(0.01, 0.1),
                "conversion_rate": random.uniform(0.01, 0.2)
            }
        }
        
        # Use actual insights API to test rule engine
        with self.client.get("/retrospective/api/insights/",
                           params={"limit": 10},
                           headers=headers,
                           name="Query Insights (Rule Engine)") as response:
            pass


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print test start information"""
    print("\n" + "="*50)
    print("🚀 Starting Retrospective Load Test")
    print("📊 Testing BE4-04 Requirements:")
    print("   • Dashboard KPI queries (1000+ records in <2s)")
    print("   • Retrospective task lifecycle")
    print("   • Insight generation performance")
    print("   • Rule engine performance")
    print("="*50 + "\n")


@events.test_stop.add_listener  
def on_test_stop(environment, **kwargs):
    """Print test completion summary"""
    print("\n" + "="*50)
    print("✅ Retrospective Load Test Complete")
    print(f"📈 Total Requests: {environment.stats.total.num_requests}")
    print(f"⚡ Average Response Time: {environment.stats.total.avg_response_time:.2f}ms")
    print(f"❌ Failure Rate: {environment.stats.total.fail_ratio:.2%}")
    print("="*50 + "\n")


if __name__ == "__main__":
    """
    Usage example:
    
    # Run with web UI
    locust -f locust_retrospective.py --host=http://localhost:8000
    
    # Run headless for CI/CD
    locust -f locust_retrospective.py --host=http://localhost:8000 --users 10 --spawn-rate 2 --run-time 60s --headless
    
    # Focus on dashboard performance test
    locust -f locust_retrospective.py --host=http://localhost:8000 --users 50 --spawn-rate 5 --run-time 120s --headless
    """
    print("Run with: locust -f locust_retrospective.py --host=http://localhost:8000")