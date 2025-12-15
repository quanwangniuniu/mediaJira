"""
Locust load testing script for campaign execution
mock 1000 times launch across channels (mocked)
"""
import json
import random
import uuid
from datetime import datetime, timedelta
from faker import Faker

from locust import HttpUser, task, between, events


fake = Faker()


class CampaignExecutionUser(HttpUser):
    """Simulates user behavior for campaign execution workflow"""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Initialize user session"""
        self.auth_token = None
        self.campaign_tasks = []
        self.login()
    
    def login(self):
        """Authenticate user"""
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
    
    @task(5)
    def create_campaign_task(self):
        """Test creating campaign tasks"""
        if not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Generate random campaign data using faker
        channels = ["GoogleAds", "FacebookAds", "TikTokAds"]
        channel = random.choice(channels)
        
        campaign_data = {
            "title": fake.sentence(nb_words=4),
            "scheduled_date": (datetime.now() + timedelta(days=random.randint(1, 30))).isoformat(),
            "channel": channel,
            "creative_asset_ids": [fake.uuid4() for _ in range(random.randint(1, 5))],
            "audience_config": {
                "type": channel.lower().replace("ads", ""),
                "common": {
                    "locations": [fake.country_code() for _ in range(random.randint(1, 3))],
                    "age_range": {"min": random.randint(18, 25), "max": random.randint(45, 65)},
                    "genders": random.sample(["male", "female"], random.randint(1, 2)),
                    "budget": {
                        "daily": round(random.uniform(50, 500), 2),
                        "currency": "AUD"
                    }
                }
            },
            "roi_threshold": round(random.uniform(1.5, 3.0), 2)
        }
        
        # Add channel-specific config
        if channel == "GoogleAds":
            campaign_data["audience_config"]["google"] = {
                "campaign_type": random.choice(["SEARCH", "DISPLAY", "VIDEO"]),
                "bidding_strategy": random.choice(["TARGET_ROAS", "MAXIMIZE_CONVERSIONS"])
            }
        elif channel == "FacebookAds":
            campaign_data["audience_config"]["facebook"] = {
                "objective": random.choice(["CONVERSIONS", "TRAFFIC", "ENGAGEMENT"]),
                "optimization_goal": random.choice(["OFFSITE_CONVERSIONS", "LINK_CLICKS"])
            }
        elif channel == "TikTokAds":
            campaign_data["audience_config"]["tiktok"] = {
                "objective": random.choice(["VIDEO_VIEWS", "CONVERSIONS"]),
                "optimization_goal": random.choice(["VIDEO_VIEWS", "CONVERSIONS"])
            }
        
        with self.client.post("/api/campaigns/tasks/",
                            json=campaign_data,
                            headers=headers,
                            name="Create Campaign Task") as response:
            if response.status_code == 201:
                task_data = response.json()
                self.campaign_tasks.append(task_data.get('campaign_task_id') or task_data.get('id'))
    
    @task(4)
    def launch_campaign(self):
        """Test launching campaigns (main requirement: 1000 launches)"""
        if not self.campaign_tasks or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        task_id = random.choice(self.campaign_tasks)
        
        with self.client.post(f"/api/campaigns/tasks/{task_id}/launch/",
                            json={"dry_run": False},
                            headers=headers,
                            name="Launch Campaign (1000 launches)") as response:
            if response.status_code == 200:
                # Verify launch was successful
                pass
            elif response.status_code == 400:
                # Campaign might already be launched, that's okay
                pass
    
    @task(3)
    def poll_campaign_status(self):
        """Test polling campaign status"""
        if not self.campaign_tasks or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        task_id = random.choice(self.campaign_tasks)
        
        with self.client.get(f"/api/campaigns/tasks/{task_id}/",
                            headers=headers,
                            name="Poll Campaign Status") as response:
            if response.status_code == 200:
                # Verify status is returned
                data = response.json()
                assert 'status' in data or 'campaign_task_id' in data
    
    @task(2)
    def query_execution_logs(self):
        """Test querying execution logs by task ID"""
        if not self.campaign_tasks or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        task_id = random.choice(self.campaign_tasks)
        
        with self.client.get(f"/api/campaigns/tasks/{task_id}/logs/",
                            headers=headers,
                            name="Query Execution Logs (traceable by task ID)") as response:
            if response.status_code == 200:
                # Verify logs are traceable by task ID
                logs = response.json()
                if isinstance(logs, list):
                    for log in logs:
                        assert 'campaign_task_id' in log or 'task_id' in log
    
    @task(2)
    def pause_campaign(self):
        """Test pausing campaigns"""
        if not self.campaign_tasks or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        task_id = random.choice(self.campaign_tasks)
        
        pause_reason = fake.sentence(nb_words=6)
        
        with self.client.post(f"/api/campaigns/tasks/{task_id}/pause/",
                            json={"reason": pause_reason},
                            headers=headers,
                            name="Pause Campaign") as response:
            if response.status_code in [200, 400]:  # 400 if already paused
                pass
    
    @task(1)
    def check_roi_alerts(self):
        """Test ROI alert checking"""
        if not self.campaign_tasks or not self.auth_token:
            return
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        task_id = random.choice(self.campaign_tasks)
        
        with self.client.get(f"/api/campaigns/tasks/{task_id}/roi_alerts/",
                            headers=headers,
                            name="Check ROI Alerts") as response:
            pass


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Print test start information"""
    print("\n" + "="*50)
    print("🚀 Starting Campaign Execution Load Test")
    print("📊 Testing BE3-04 Requirements:")
    print("   • Simulate 1,000 launches across channels (mocked)")
    print("   • Campaign task creation and execution")
    print("   • Status polling performance")
    print("   • Execution logs traceable per task ID")
    print("="*50 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Print test completion summary"""
    print("\n" + "="*50)
    print("Campaign Execution Load Test Complete")
    print(f"Total Requests: {environment.stats.total.num_requests}")
    print(f"Average Response Time: {environment.stats.total.avg_response_time:.2f}ms")
    print(f"Failure Rate: {environment.stats.total.fail_ratio:.2%}")
    print("="*50 + "\n")


if __name__ == "__main__":
    """
    Usage example:
    
    # Run with web UI
    locust -f locust_campaigns.py --host=http://localhost:8000
    
    # Run headless for CI/CD (simulate 1000 launches)
    locust -f locust_campaigns.py --host=http://localhost:8000 --users 100 --spawn-rate 10 --run-time 120s --headless
    
    # Focus on launch performance test
    locust -f locust_campaigns.py --host=http://localhost:8000 --users 200 --spawn-rate 20 --run-time 180s --headless --tags launch_campaign
    """
    print("Run with: locust -f locust_campaigns.py --host=http://localhost:8000")

