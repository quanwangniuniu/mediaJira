"""
Locust负载测试脚本 - 回顾功能
测试并发回顾创建、洞察生成和API性能
"""
import json
import random
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from locust import HttpUser, task, between
from locust.exception import RescheduleTask


class RetrospectiveUser(HttpUser):
    """回顾功能的Locust用户类"""
    
    wait_time = between(1, 3)  # 任务间等待1-3秒
    
    def on_start(self):
        """用户开始时调用"""
        self.login()
        self.campaigns = []
        self.retrospectives = []
    
    def login(self):
        """登录并获取认证令牌"""
        login_data = {
            "email": "loadtest@testagency.com",
            "password": "testpass123"
        }
        
        response = self.client.post("/auth/login/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.user = data.get("user")
            # 为后续请求设置授权头
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            raise RescheduleTask("登录失败")
    
    @task(3)
    def create_retrospective(self):
        """创建新的回顾"""
        # 如果需要，先创建活动
        if not self.campaigns or random.random() < 0.3:
            self.create_campaign()
        
        if self.campaigns:
            campaign = random.choice(self.campaigns)
            
            retrospective_data = {
                "campaign": str(campaign["id"]),
                "scheduled_at": datetime.now().isoformat()
            }
            
            response = self.client.post("/retrospective/api/retrospectives/", json=retrospective_data)
            
            if response.status_code == 201:
                data = response.json()
                self.retrospectives.append(data)
                return data
    
    @task(2)
    def start_retrospective_analysis(self):
        """开始回顾分析"""
        if self.retrospectives:
            retrospective = random.choice(self.retrospectives)
            
            response = self.client.post(
                f"/retrospective/api/retrospectives/{retrospective['id']}/start_analysis/"
            )
            
            if response.status_code == 200:
                return response.json()
    
    @task(2)
    def generate_insights(self):
        """为回顾生成洞察"""
        if self.retrospectives:
            retrospective = random.choice(self.retrospectives)
            
            insight_data = {
                "retrospective_id": str(retrospective["id"]),
                "regenerate": random.choice([True, False])
            }
            
            response = self.client.post(
                "/retrospective/api/insights/generate_insights/",
                json=insight_data
            )
            
            if response.status_code == 200:
                return response.json()
    
    @task(1)
    def get_retrospective_summary(self):
        """获取回顾摘要"""
        if self.retrospectives:
            retrospective = random.choice(self.retrospectives)
            
            response = self.client.get(
                f"/retrospective/api/retrospectives/{retrospective['id']}/summary/"
            )
            
            if response.status_code == 200:
                return response.json()
    
    @task(1)
    def list_retrospectives(self):
        """列出用户的回顾"""
        response = self.client.get("/retrospective/api/retrospectives/my_retrospectives/")
        
        if response.status_code == 200:
            return response.json()
    
    @task(1)
    def get_insights_by_retrospective(self):
        """获取回顾的洞察"""
        if self.retrospectives:
            retrospective = random.choice(self.retrospectives)
            
            response = self.client.get(
                f"/retrospective/api/insights/by_retrospective/?retrospective_id={retrospective['id']}"
            )
            
            if response.status_code == 200:
                return response.json()
    
    @task(1)
    def generate_report(self):
        """为回顾生成报告"""
        if self.retrospectives:
            retrospective = random.choice(self.retrospectives)
            
            report_data = {
                "format": "pdf",
                "include_charts": True,
                "include_recommendations": True
            }
            
            response = self.client.post(
                f"/retrospective/api/retrospectives/{retrospective['id']}/generate_report/",
                json=report_data
            )
            
            if response.status_code == 200:
                return response.json()
    
    @task(1)
    def approve_report(self):
        """批准回顾报告"""
        if self.retrospectives:
            retrospective = random.choice(self.retrospectives)
            
            approval_data = {
                "approved": True,
                "comments": "负载测试批准"
            }
            
            response = self.client.post(
                f"/retrospective/api/retrospectives/{retrospective['id']}/approve_report/",
                json=approval_data
            )
            
            if response.status_code == 200:
                return response.json()
    
    def create_campaign(self):
        """创建测试活动"""
        campaign_data = {
            "name": f"负载测试活动 {uuid.uuid4().hex[:8]}",
            "description": "负载测试期间创建的活动",
            "budget": 10000.00,
            "start_date": datetime.now().isoformat(),
            "end_date": (datetime.now() + timedelta(days=30)).isoformat()
        }
        
        response = self.client.post("/core/api/projects/", json=campaign_data)
        
        if response.status_code == 201:
            data = response.json()
            self.campaigns.append(data)
            return data


class RetrospectiveAPIUser(HttpUser):
    """专注于API端点性能的用户类"""
    
    wait_time = between(0.5, 2)
    
    def on_start(self):
        """登录和设置"""
        self.login()
        self.setup_test_data()
    
    def login(self):
        """登录并获取令牌"""
        login_data = {
            "email": "apiuser@testagency.com",
            "password": "testpass123"
        }
        
        response = self.client.post("/auth/login/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            raise RescheduleTask("登录失败")
    
    def setup_test_data(self):
        """为API测试设置测试数据"""
        # 创建活动
        campaign_data = {
            "name": f"API测试活动 {uuid.uuid4().hex[:8]}",
            "description": "API负载测试的活动"
        }
        
        response = self.client.post("/core/api/projects/", json=campaign_data)
        if response.status_code == 201:
            self.campaign = response.json()
            
            # 创建回顾
            retrospective_data = {
                "campaign": str(self.campaign["id"])
            }
            
            response = self.client.post("/retrospective/api/retrospectives/", json=retrospective_data)
            if response.status_code == 201:
                self.retrospective = response.json()
    
    @task(5)
    def test_retrospective_list_performance(self):
        """测试回顾列表端点性能"""
        response = self.client.get("/retrospective/api/retrospectives/")
        assert response.status_code == 200
    
    @task(3)
    def test_retrospective_detail_performance(self):
        """测试回顾详情端点性能"""
        if hasattr(self, 'retrospective'):
            response = self.client.get(f"/retrospective/api/retrospectives/{self.retrospective['id']}/")
            assert response.status_code == 200
    
    @task(2)
    def test_insights_list_performance(self):
        """测试洞察列表端点性能"""
        response = self.client.get("/retrospective/api/insights/")
        assert response.status_code == 200
    
    @task(2)
    def test_rules_list_performance(self):
        """测试规则列表端点性能"""
        response = self.client.get("/retrospective/api/rules/rules/")
        assert response.status_code == 200
    
    @task(1)
    def test_health_check_performance(self):
        """测试健康检查端点性能"""
        response = self.client.get("/retrospective/health/")
        assert response.status_code == 200


class RetrospectiveConcurrentUser(HttpUser):
    """用于测试并发操作的用户类"""
    
    wait_time = between(0.1, 0.5)  # 非常快的操作
    
    def on_start(self):
        """登录"""
        self.login()
    
    def login(self):
        """登录"""
        login_data = {
            "email": "concurrent@testagency.com",
            "password": "testpass123"
        }
        
        response = self.client.post("/auth/login/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token")
            self.client.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            raise RescheduleTask("登录失败")
    
    @task(10)
    def rapid_retrospective_creation(self):
        """快速创建回顾以测试并发性"""
        campaign_data = {
            "name": f"并发活动 {uuid.uuid4().hex[:8]}"
        }
        
        # 创建活动
        response = self.client.post("/core/api/projects/", json=campaign_data)
        if response.status_code == 201:
            campaign = response.json()
            
            # 创建回顾
            retrospective_data = {
                "campaign": str(campaign["id"])
            }
            
            response = self.client.post("/retrospective/api/retrospectives/", json=retrospective_data)
            if response.status_code == 201:
                retrospective = response.json()
                
                # 立即开始分析
                self.client.post(
                    f"/retrospective/api/retrospectives/{retrospective['id']}/start_analysis/"
                )
    
    @task(5)
    def rapid_insight_generation(self):
        """快速生成洞察"""
        # 获取现有回顾
        response = self.client.get("/retrospective/api/retrospectives/my_retrospectives/")
        if response.status_code == 200:
            retrospectives = response.json()
            if retrospectives:
                retrospective = random.choice(retrospectives)
                
                insight_data = {
                    "retrospective_id": str(retrospective["id"]),
                    "regenerate": True
                }
                
                self.client.post(
                    "/retrospective/api/insights/generate_insights/",
                    json=insight_data
                )


# 负载测试配置
class RetrospectiveLoadTest:
    """回顾负载测试配置"""
    
    @staticmethod
    def get_test_scenarios():
        """获取不同的测试场景"""
        return {
            "normal_load": {
                "users": [RetrospectiveUser],
                "spawn_rate": 10,
                "duration": "5m"
            },
            "api_performance": {
                "users": [RetrospectiveAPIUser],
                "spawn_rate": 20,
                "duration": "3m"
            },
            "concurrent_operations": {
                "users": [RetrospectiveConcurrentUser],
                "spawn_rate": 50,
                "duration": "2m"
            }
        }
    
    @staticmethod
    def run_load_test(scenario_name="normal_load"):
        """运行特定的负载测试场景"""
        scenarios = RetrospectiveLoadTest.get_test_scenarios()
        if scenario_name not in scenarios:
            raise ValueError(f"未知场景: {scenario_name}")
        
        scenario = scenarios[scenario_name]
        print(f"运行 {scenario_name} 负载测试:")
        print(f"用户: {[user.__name__ for user in scenario['users']]}")
        print(f"生成率: {scenario['spawn_rate']}")
        print(f"持续时间: {scenario['duration']}")


if __name__ == "__main__":
    # 使用示例
    test_runner = RetrospectiveLoadTest()
    test_runner.run_load_test("normal_load")
