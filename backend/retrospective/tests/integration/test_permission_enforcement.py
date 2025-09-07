"""
回顾权限执行集成测试
测试报告批准权限、用户访问权限、基于角色的洞察可见性
"""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, Insight, CampaignMetric, RetrospectiveStatus
from retrospective.services import RetrospectiveService
from access_control.models import UserRole, Role

User = get_user_model()


class TestPermissionEnforcement(TransactionTestCase):
    """测试回顾权限执行"""

    def setUp(self):
        """设置测试数据"""
        # 创建组织
        self.organization = Organization.objects.create(
            name="测试机构",
            email_domain="testagency.com"
        )
        
        # 创建用户角色
        self.media_buyer_role = Role.objects.create(
            name="媒体购买者",
            organization=self.organization,
            level=10
        )
        
        self.team_lead_role = Role.objects.create(
            name="团队负责人",
            organization=self.organization,
            level=20
        )
        
        self.manager_role = Role.objects.create(
            name="经理",
            organization=self.organization,
            level=30
        )
        
        self.admin_role = Role.objects.create(
            name="管理员",
            organization=self.organization,
            level=40
        )
        
        # 创建用户
        self.media_buyer = User.objects.create_user(
            username="buyer1",
            email="buyer@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        self.team_lead = User.objects.create_user(
            username="lead1",
            email="lead@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        self.manager = User.objects.create_user(
            username="manager1",
            email="manager@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        self.admin = User.objects.create_user(
            username="admin1",
            email="admin@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # 分配角色
        UserRole.objects.create(user=self.media_buyer, role=self.media_buyer_role)
        UserRole.objects.create(user=self.team_lead, role=self.team_lead_role)
        UserRole.objects.create(user=self.manager, role=self.manager_role)
        UserRole.objects.create(user=self.admin, role=self.admin_role)
        
        # 创建活动
        self.campaign = Project.objects.create(
            name="测试活动",
            organization=self.organization
        )
        
        # 创建KPI数据
        self.create_kpi_data()
        
        # 创建回顾
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.COMPLETED,
            report_url="/media/reports/test_report.pdf",
            report_generated_at=datetime.now()
        )
        
        # 创建洞察
        self.insight = Insight.objects.create(
            retrospective=self.retrospective,
            title="测试洞察",
            description="这是一个测试洞察",
            severity="medium",
            rule_id="test_rule",
            generated_by="rule_engine"
        )

    def create_kpi_data(self):
        """创建测试KPI数据"""
        base_date = datetime.now().date()
        
        for i in range(10):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 10),
                clicks=50 + (i * 2),
                conversions=5 + (i * 0.1),
                cost_per_click=Decimal('2.50') + Decimal(str(i * 0.01)),
                cost_per_impression=Decimal('0.10') + Decimal(str(i * 0.001)),
                cost_per_conversion=Decimal('25.00') + Decimal(str(i * 0.1)),
                click_through_rate=Decimal('0.05') + Decimal(str(i * 0.001)),
                conversion_rate=Decimal('0.10') + Decimal(str(i * 0.001))
            )

    def test_report_approval_permissions(self):
        """测试报告批准权限"""
        client = APIClient()
        
        # 媒体购买者不应该能够批准报告
        client.force_authenticate(user=self.media_buyer)
        response = client.post(
            f"/retrospective/api/retrospectives/{self.retrospective.id}/approve_report/",
            {"approved": True, "comments": "测试批准"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 团队负责人应该能够批准报告
        client.force_authenticate(user=self.team_lead)
        response = client.post(
            f"/retrospective/api/retrospectives/{self.retrospective.id}/approve_report/",
            {"approved": True, "comments": "测试批准"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 经理应该能够批准报告
        client.force_authenticate(user=self.manager)
        response = client.post(
            f"/retrospective/api/retrospectives/{self.retrospective.id}/approve_report/",
            {"approved": True, "comments": "测试批准"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 管理员应该能够批准报告
        client.force_authenticate(user=self.admin)
        response = client.post(
            f"/retrospective/api/retrospectives/{self.retrospective.id}/approve_report/",
            {"approved": True, "comments": "测试批准"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_user_access_to_retrospectives(self):
        """测试用户对回顾的访问权限"""
        client = APIClient()
        
        # 媒体购买者应该只能看到自己创建的回顾
        client.force_authenticate(user=self.media_buyer)
        response = client.get("/retrospective/api/retrospectives/my_retrospectives/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.retrospective.id))
        
        # 创建另一个用户的回顾
        other_campaign = Project.objects.create(
            name="其他活动",
            organization=self.organization,
            created_by=self.team_lead
        )
        other_retrospective = RetrospectiveTask.objects.create(
            campaign=other_campaign,
            created_by=self.team_lead
        )
        
        # 媒体购买者不应该看到其他用户的回顾
        response = client.get("/retrospective/api/retrospectives/my_retrospectives/")
        self.assertEqual(len(response.data), 1)
        
        # 管理员应该看到所有回顾
        client.force_authenticate(user=self.admin)
        response = client.get("/retrospective/api/retrospectives/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    def test_role_based_insight_visibility(self):
        """测试基于角色的洞察可见性"""
        client = APIClient()
        
        # 创建不同严重级别的洞察
        critical_insight = Insight.objects.create(
            retrospective=self.retrospective,
            title="关键洞察",
            description="这是一个关键洞察",
            severity="critical",
            rule_id="critical_rule",
            generated_by="rule_engine"
        )
        
        high_insight = Insight.objects.create(
            retrospective=self.retrospective,
            title="高优先级洞察",
            description="这是一个高优先级洞察",
            severity="high",
            rule_id="high_rule",
            generated_by="rule_engine"
        )
        
        low_insight = Insight.objects.create(
            retrospective=self.retrospective,
            title="低优先级洞察",
            description="这是一个低优先级洞察",
            severity="low",
            rule_id="low_rule",
            generated_by="rule_engine"
        )
        
        # 媒体购买者应该看到所有洞察
        client.force_authenticate(user=self.media_buyer)
        response = client.get(
            f"/retrospective/api/insights/by_retrospective/?retrospective_id={self.retrospective.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)  # 包括原始洞察
        
        # 团队负责人应该看到所有洞察
        client.force_authenticate(user=self.team_lead)
        response = client.get(
            f"/retrospective/api/insights/by_retrospective/?retrospective_id={self.retrospective.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)

    def test_admin_override_capabilities(self):
        """测试管理员覆盖功能"""
        client = APIClient()
        
        # 管理员应该能够访问所有回顾
        client.force_authenticate(user=self.admin)
        response = client.get("/retrospective/api/retrospectives/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 管理员应该能够批准任何报告
        response = client.post(
            f"/retrospective/api/retrospectives/{self.retrospective.id}/approve_report/",
            {"approved": True, "comments": "管理员批准"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 管理员应该能够生成洞察
        response = client.post(
            "/retrospective/api/insights/generate_insights/",
            {"retrospective_id": str(self.retrospective.id), "regenerate": True}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_organization_isolation(self):
        """测试组织隔离"""
        # 创建另一个组织
        other_organization = Organization.objects.create(
            name="其他机构",
            email_domain="otheragency.com"
        )
        
        # 创建其他组织的用户
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@otheragency.com",
            password="testpass123",
            organization=other_organization
        )
        
        # 创建其他组织的活动
        other_campaign = Project.objects.create(
            name="其他活动",
            organization=other_organization
        )
        
        # 创建其他组织的回顾
        other_retrospective = RetrospectiveTask.objects.create(
            campaign=other_campaign,
            created_by=other_user
        )
        
        client = APIClient()
        
        # 原始用户不应该看到其他组织的回顾
        client.force_authenticate(user=self.media_buyer)
        response = client.get("/retrospective/api/retrospectives/my_retrospectives/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(self.retrospective.id))
        
        # 其他用户不应该看到原始组织的回顾
        client.force_authenticate(user=other_user)
        response = client.get("/retrospective/api/retrospectives/my_retrospectives/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], str(other_retrospective.id))

    def test_insight_creation_permissions(self):
        """测试洞察创建权限"""
        client = APIClient()
        
        # 媒体购买者应该能够创建洞察
        client.force_authenticate(user=self.media_buyer)
        insight_data = {
            "retrospective_id": str(self.retrospective.id),
            "title": "手动洞察",
            "description": "这是一个手动创建的洞察",
            "severity": "medium",
            "suggested_actions": ["行动1", "行动2"]
        }
        response = client.post("/retrospective/api/insights/", insight_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 团队负责人应该能够创建洞察
        client.force_authenticate(user=self.team_lead)
        insight_data["title"] = "团队负责人洞察"
        response = client.post("/retrospective/api/insights/", insight_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_retrospective_creation_permissions(self):
        """测试回顾创建权限"""
        client = APIClient()
        
        # 媒体购买者应该能够创建回顾
        client.force_authenticate(user=self.media_buyer)
        retrospective_data = {
            "campaign": str(self.campaign.id),
            "scheduled_at": datetime.now().isoformat()
        }
        response = client.post("/retrospective/api/retrospectives/", retrospective_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 团队负责人应该能够创建回顾
        client.force_authenticate(user=self.team_lead)
        response = client.post("/retrospective/api/retrospectives/", retrospective_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_pending_approval_access(self):
        """测试待批准访问权限"""
        client = APIClient()
        
        # 媒体购买者不应该看到待批准的回顾
        client.force_authenticate(user=self.media_buyer)
        response = client.get("/retrospective/api/retrospectives/pending_approval/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 团队负责人应该看到待批准的回顾
        client.force_authenticate(user=self.team_lead)
        response = client.get("/retrospective/api/retrospectives/pending_approval/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 经理应该看到待批准的回顾
        client.force_authenticate(user=self.manager)
        response = client.get("/retrospective/api/retrospectives/pending_approval/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rule_engine_access(self):
        """测试规则引擎访问权限"""
        client = APIClient()
        
        # 所有认证用户都应该能够访问规则
        client.force_authenticate(user=self.media_buyer)
        response = client.get("/retrospective/api/rules/rules/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 测试规则定义访问
        response = client.get("/retrospective/api/rules/rule_definition/?rule_id=test_rule")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 测试规则测试功能
        test_data = {
            "rule_id": "test_rule",
            "kpi_value": 0.01
        }
        response = client.post("/retrospective/api/rules/test_rule/", test_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthorized_access_denied(self):
        """测试未授权访问被拒绝"""
        client = APIClient()
        
        # 未认证用户不应该能够访问任何回顾端点
        response = client.get("/retrospective/api/retrospectives/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = client.post("/retrospective/api/retrospectives/", {})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = client.get(f"/retrospective/api/retrospectives/{self.retrospective.id}/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = client.get("/retrospective/api/insights/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cross_organization_access_denied(self):
        """测试跨组织访问被拒绝"""
        # 创建另一个组织
        other_organization = Organization.objects.create(
            name="其他机构",
            email_domain="otheragency.com"
        )
        
        # 创建其他组织的用户
        other_user = User.objects.create_user(
            username="otheruser",
            email="other@otheragency.com",
            password="testpass123",
            organization=other_organization
        )
        
        client = APIClient()
        client.force_authenticate(user=other_user)
        
        # 其他组织的用户不应该能够访问原始组织的回顾
        response = client.get(f"/retrospective/api/retrospectives/{self.retrospective.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # 其他组织的用户不应该能够访问原始组织的洞察
        response = client.get(
            f"/retrospective/api/insights/by_retrospective/?retrospective_id={self.retrospective.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


@pytest.mark.django_db
class TestPermissionPerformance:
    """权限检查性能测试"""
    
    def test_permission_check_performance(self):
        """测试权限检查性能"""
        # 创建大量用户和回顾
        org = Organization.objects.create(name="性能测试机构")
        
        users = []
        retrospectives = []
        
        for i in range(100):
            user = User.objects.create_user(
                username=f"user{i}",
                email=f"user{i}@test.com",
                organization=org
            )
            users.append(user)
            
            campaign = Project.objects.create(
                name=f"活动{i}",
                organization=org
            )
            
            retrospective = RetrospectiveTask.objects.create(
                campaign=campaign,
                created_by=user
            )
            retrospectives.append(retrospective)
        
        client = APIClient()
        
        # 测试权限检查性能
        import time
        start_time = time.time()
        
        for user in users[:10]:  # 测试前10个用户
            client.force_authenticate(user=user)
            response = client.get("/retrospective/api/retrospectives/my_retrospectives/")
            assert response.status_code == 200
        
        end_time = time.time()
        duration = end_time - start_time
        
        # 10个用户的权限检查应该在1秒内完成
        assert duration < 1.0
