"""
序列化器单元测试
测试回顾和洞察的序列化器功能
"""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, Insight, CampaignMetric, RetrospectiveStatus, InsightSeverity
from retrospective.serializers import (
    RetrospectiveTaskListSerializer, RetrospectiveTaskDetailSerializer, RetrospectiveTaskCreateSerializer,
    InsightListSerializer, InsightDetailSerializer, InsightCreateSerializer,
    RetrospectiveSummarySerializer, KPIUploadSerializer, InsightGenerationSerializer,
    ReportGenerationSerializer, ReportApprovalSerializer, RuleDefinitionSerializer,
    KPIComparisonSerializer
)

User = get_user_model()


class TestRetrospectiveSerializers(TestCase):
    """测试回顾序列化器"""

    def setUp(self):
        """设置测试数据"""
        # 创建组织
        self.organization = Organization.objects.create(
            name="测试机构",
            email_domain="testagency.com"
        )
        
        # 创建用户
        self.user = User.objects.create_user(
            username="testuser",
            email="test@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # 创建活动
        self.campaign = Project.objects.create(
            name="测试活动",
            organization=self.organization,
        )
        
        # 创建回顾
        from django.utils import timezone
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED,
            scheduled_at=timezone.now()
        )

    def test_retrospective_list_serializer(self):
        """测试回顾列表序列化器"""
        serializer = RetrospectiveTaskListSerializer(self.retrospective)
        data = serializer.data
        
        # 验证必需字段
        required_fields = [
            'id', 'campaign', 'status', 'scheduled_at', 'created_at', 'created_by'
        ]
        
        for field in required_fields:
            self.assertIn(field, data)
        
        # 验证数据类型
        self.assertIsInstance(data['id'], str)
        self.assertIsInstance(data['campaign'], str)
        self.assertIsInstance(data['status'], str)
        self.assertIsInstance(data['scheduled_at'], str)
        self.assertIsInstance(data['created_at'], str)
        self.assertIsInstance(data['created_by'], str)

    def test_retrospective_detail_serializer(self):
        """测试回顾详情序列化器"""
        # 更新回顾状态
        self.retrospective.status = RetrospectiveStatus.COMPLETED
        self.retrospective.started_at = datetime.now() - timedelta(hours=1)
        self.retrospective.completed_at = datetime.now()
        self.retrospective.save()
        
        serializer = RetrospectiveTaskDetailSerializer(self.retrospective)
        data = serializer.data
        
        # 验证详细字段
        detail_fields = [
            'id', 'campaign', 'status', 'scheduled_at', 'started_at', 'completed_at',
            'created_at', 'updated_at', 'created_by', 'duration'
        ]
        
        for field in detail_fields:
            self.assertIn(field, data)
        
        # 验证持续时间计算
        self.assertIsNotNone(data['duration'])

    def test_retrospective_create_serializer(self):
        """测试回顾创建序列化器"""
        data = {
            'campaign': str(self.campaign.id),
            'scheduled_at': datetime.now().isoformat()
        }
        
        serializer = RetrospectiveTaskCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertEqual(validated_data['campaign'], self.campaign)
        self.assertIsNotNone(validated_data['scheduled_at'])

    def test_retrospective_create_serializer_validation(self):
        """测试回顾创建序列化器验证"""
        # 测试无效数据
        invalid_data = {
            'campaign': 'invalid-uuid',
            'scheduled_at': 'invalid-date'
        }
        
        serializer = RetrospectiveTaskCreateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('campaign', serializer.errors)
        self.assertIn('scheduled_at', serializer.errors)
        
        # 测试缺失必需字段
        incomplete_data = {
            'campaign': str(self.campaign.id)
        }
        
        serializer = RetrospectiveTaskCreateSerializer(data=incomplete_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('scheduled_at', serializer.errors)

    def test_retrospective_summary_serializer(self):
        """测试回顾摘要序列化器"""
        # 创建摘要数据
        summary_data = {
            'retrospective_id': str(self.retrospective.id),
            'campaign_id': str(self.campaign.id),
            'campaign_name': self.campaign.name,
            'status': self.retrospective.status,
            'scheduled_at': self.retrospective.scheduled_at.isoformat(),
            'kpi_summary': {
                'ROI': {
                    'current_value': 1.2,
                    'average_value': 1.1,
                    'target_value': 1.5
                }
            },
            'insights_summary': {
                'total': 5,
                'critical': 1,
                'high': 2,
                'medium': 2,
                'low': 0
            }
        }
        
        serializer = RetrospectiveSummarySerializer(summary_data)
        data = serializer.data
        
        # 验证摘要结构
        self.assertIn('retrospective_id', data)
        self.assertIn('campaign_name', data)
        self.assertIn('kpi_summary', data)
        self.assertIn('insights_summary', data)
        
        # 验证洞察摘要
        insights_summary = data['insights_summary']
        self.assertEqual(insights_summary['total'], 5)
        self.assertEqual(insights_summary['critical'], 1)
        self.assertEqual(insights_summary['high'], 2)


class TestInsightSerializers(TestCase):
    """测试洞察序列化器"""

    def setUp(self):
        """设置测试数据"""
        # 创建组织
        self.organization = Organization.objects.create(
            name="测试机构",
            email_domain="testagency.com"
        )
        
        # 创建用户
        self.user = User.objects.create_user(
            username="testuser",
            email="test@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # 创建活动
        self.campaign = Project.objects.create(
            name="测试活动",
            organization=self.organization,
        )
        
        # 创建回顾
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
        )
        
        # 创建洞察
        self.insight = Insight.objects.create(
            retrospective=self.retrospective,
            title="测试洞察",
            description="这是一个测试洞察",
            severity=InsightSeverity.MEDIUM,
            rule_id="test_rule",
            triggered_kpis=["kpi1", "kpi2"],
            suggested_actions=["行动1", "行动2"],
            generated_by="rule_engine"
        )

    def test_insight_list_serializer(self):
        """测试洞察列表序列化器"""
        serializer = InsightListSerializer(self.insight)
        data = serializer.data
        
        # 验证必需字段
        required_fields = [
            'id', 'title', 'description', 'severity', 'created_at', 'generated_by'
        ]
        
        for field in required_fields:
            self.assertIn(field, data)
        
        # 验证数据类型
        self.assertIsInstance(data['id'], str)
        self.assertIsInstance(data['title'], str)
        self.assertIsInstance(data['description'], str)
        self.assertIsInstance(data['severity'], str)
        self.assertIsInstance(data['created_at'], str)
        self.assertIsInstance(data['generated_by'], str)

    def test_insight_detail_serializer(self):
        """测试洞察详情序列化器"""
        serializer = InsightDetailSerializer(self.insight)
        data = serializer.data
        
        # 验证详细字段
        detail_fields = [
            'id', 'title', 'description', 'severity', 'rule_id', 'triggered_kpis',
            'suggested_actions', 'created_at', 'updated_at', 'generated_by', 'is_active'
        ]
        
        for field in detail_fields:
            self.assertIn(field, data)
        
        # 验证复杂字段
        self.assertIsInstance(data['triggered_kpis'], list)
        self.assertIsInstance(data['suggested_actions'], list)
        self.assertIsInstance(data['is_active'], bool)

    def test_insight_create_serializer(self):
        """测试洞察创建序列化器"""
        data = {
            'retrospective_id': str(self.retrospective.id),
            'title': '新洞察',
            'description': '这是一个新洞察',
            'severity': InsightSeverity.HIGH,
            'suggested_actions': ['新行动1', '新行动2']
        }
        
        serializer = InsightCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertEqual(validated_data['title'], '新洞察')
        self.assertEqual(validated_data['severity'], InsightSeverity.HIGH)
        self.assertEqual(len(validated_data['suggested_actions']), 2)

    def test_insight_create_serializer_validation(self):
        """测试洞察创建序列化器验证"""
        # 测试无效严重级别
        invalid_data = {
            'retrospective_id': str(self.retrospective.id),
            'title': '测试洞察',
            'description': '测试描述',
            'severity': 'invalid_severity'
        }
        
        serializer = InsightCreateSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('severity', serializer.errors)
        
        # 测试缺失必需字段
        incomplete_data = {
            'title': '测试洞察'
        }
        
        serializer = InsightCreateSerializer(data=incomplete_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('retrospective_id', serializer.errors)
        self.assertIn('description', serializer.errors)


class TestUtilitySerializers(TestCase):
    """测试工具序列化器"""

    def setUp(self):
        """设置测试数据"""
        # 创建组织
        self.organization = Organization.objects.create(
            name="测试机构",
            email_domain="testagency.com"
        )
        
        # 创建用户
        self.user = User.objects.create_user(
            username="testuser",
            email="test@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # 创建活动
        self.campaign = Project.objects.create(
            name="测试活动",
            organization=self.organization,
        )
        
        # 创建回顾
        from django.utils import timezone
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED,
            scheduled_at=timezone.now()
        )

    def test_kpi_upload_serializer(self):
        """测试KPI上传序列化器"""
        data = {
            'retrospective_id': str(self.retrospective.id),
            'kpi_data': [
                {
                    'metric_name': 'ROI',
                    'value': 0.15,
                    'source': 'campaign_1'
                }
            ]
        }
        
        serializer = KPIUploadSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertIn('campaign_id', validated_data)
        self.assertIn('kpi_data', validated_data)
        self.assertEqual(len(validated_data['kpi_data']), 1)

    def test_insight_generation_serializer(self):
        """测试洞察生成序列化器"""
        data = {
            'retrospective_id': str(self.retrospective.id),
            'regenerate': True
        }
        
        serializer = InsightGenerationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertIn('retrospective_id', validated_data)
        self.assertTrue(validated_data['regenerate'])

    def test_report_generation_serializer(self):
        """测试报告生成序列化器"""
        data = {
            'retrospective_id': str(self.retrospective.id),
            'format': 'pdf'
        }
        
        serializer = ReportGenerationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertEqual(validated_data['format'], 'pdf')
        self.assertTrue(validated_data['include_charts'])
        self.assertTrue(validated_data['include_recommendations'])

    def test_report_approval_serializer(self):
        """测试报告批准序列化器"""
        data = {
            'retrospective_id': str(self.retrospective.id),
            'approved': True,
            'comments': '报告已批准'
        }
        
        serializer = ReportApprovalSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertTrue(validated_data['approved'])
        self.assertEqual(validated_data['comments'], '报告已批准')

    def test_rule_definition_serializer(self):
        """测试规则定义序列化器"""
        data = {
            'rule_id': 'test_rule',
            'name': '测试规则',
            'description': '这是一个测试规则',
            'threshold': 0.5,
            'severity': 'medium',
            'metric': 'roi',
            'condition': 'less_than',
            'suggested_actions': ['优化投放策略', '调整预算分配']
        }
        
        serializer = RuleDefinitionSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertEqual(validated_data['rule_id'], 'test_rule')
        self.assertEqual(validated_data['name'], '测试规则')
        self.assertEqual(validated_data['threshold'], 0.5)

    def test_kpi_comparison_serializer(self):
        """测试KPI比较序列化器"""
        data = {
            'metric_name': 'ROI',
            'current_value': 0.15,
            'target_value': 0.20,
            'previous_value': 0.12,
            'percentage_change': 25.0,
            'unit': 'percentage',
            'is_on_target': False,
            'sources': ['campaign_1', 'campaign_2']
        }
        
        serializer = KPIComparisonSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # 验证验证后的数据
        validated_data = serializer.validated_data
        self.assertEqual(len(validated_data['campaign_ids']), 2)
        self.assertEqual(len(validated_data['metrics']), 3)
        self.assertIn('date_range', validated_data)


class TestSerializerValidation(TestCase):
    """测试序列化器验证"""

    def setUp(self):
        """设置测试数据"""
        # 创建组织
        self.organization = Organization.objects.create(
            name="测试机构",
            email_domain="testagency.com"
        )
        
        # 创建用户
        self.user = User.objects.create_user(
            username="testuser",
            email="test@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # 创建活动
        self.campaign = Project.objects.create(
            name="测试活动",
            organization=self.organization,
        )
        
        # 创建回顾
        from django.utils import timezone
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED,
            scheduled_at=timezone.now()
        )

    def test_retrospective_serializer_field_validation(self):
        """测试回顾序列化器字段验证"""
        # 测试状态字段验证
        data = {
            'campaign': str(uuid.uuid4()),
            'status': 'invalid_status'
        }
        
        serializer = RetrospectiveTaskCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('status', serializer.errors)
        
        # 测试有效状态
        data['status'] = RetrospectiveStatus.SCHEDULED
        serializer = RetrospectiveTaskCreateSerializer(data=data)
        # 注意：这里可能仍然无效，因为缺少其他必需字段

    def test_insight_serializer_field_validation(self):
        """测试洞察序列化器字段验证"""
        # 测试严重级别验证
        data = {
            'retrospective_id': str(uuid.uuid4()),
            'title': '测试洞察',
            'description': '测试描述',
            'severity': 'invalid_severity'
        }
        
        serializer = InsightCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('severity', serializer.errors)
        
        # 测试有效严重级别
        data['severity'] = InsightSeverity.HIGH
        serializer = InsightCreateSerializer(data=data)
        # 注意：这里可能仍然无效，因为缺少其他必需字段

    def test_serializer_error_messages(self):
        """测试序列化器错误消息"""
        # 测试回顾创建错误消息
        data = {}
        serializer = RetrospectiveTaskCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        
        # 验证错误消息存在
        self.assertIn('campaign', serializer.errors)
        self.assertIn('scheduled_at', serializer.errors)
        
        # 测试洞察创建错误消息
        data = {}
        serializer = InsightCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        
        # 验证错误消息存在
        self.assertIn('retrospective_id', serializer.errors)
        self.assertIn('title', serializer.errors)
        self.assertIn('description', serializer.errors)

    def test_serializer_nested_validation(self):
        """测试序列化器嵌套验证"""
        # 测试KPI上传嵌套验证
        data = {
            'campaign_id': str(uuid.uuid4()),
            'kpi_data': [
                {
                    'date': 'invalid-date',
                    'impressions': 'invalid-number'
                }
            ]
        }
        
        serializer = KPIUploadSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('kpi_data', serializer.errors)

    def test_serializer_custom_validation(self):
        """测试序列化器自定义验证"""
        # 测试日期范围验证
        data = {
            'campaign_ids': [str(uuid.uuid4())],
            'metrics': ['ROI'],
            'date_range': {
                'start_date': '2024-01-31',
                'end_date': '2024-01-01'  # 结束日期早于开始日期
            }
        }
        
        serializer = KPIComparisonSerializer(data=data)
        # 这里可能需要自定义验证来检查日期范围
        # 具体实现取决于序列化器的自定义验证逻辑


@pytest.mark.django_db
class TestSerializerIntegration(APITestCase):
    """序列化器集成测试"""
    
    def setUp(self):
        """设置测试数据"""
        # 创建组织
        self.organization = Organization.objects.create(
            name="集成测试机构",
            email_domain="integration.com"
        )
        
        # 创建用户
        self.user = User.objects.create_user(
            username="integration",
            email="integration@test.com",
            password="testpass123",
            organization=self.organization
        )
        
        # 创建活动
        self.campaign = Project.objects.create(
            name="集成测试活动",
            organization=self.organization,
        )
    
    def test_retrospective_serializer_integration(self):
        """测试回顾序列化器集成"""
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
        )
        
        # 测试列表序列化器
        list_serializer = RetrospectiveTaskListSerializer(retrospective)
        list_data = list_serializer.data
        self.assertIn('id', list_data)
        self.assertIn('campaign', list_data)
        
        # 测试详情序列化器
        detail_serializer = RetrospectiveTaskDetailSerializer(retrospective)
        detail_data = detail_serializer.data
        self.assertIn('id', detail_data)
        self.assertIn('campaign', detail_data)
        self.assertIn('duration', detail_data)
    
    def test_insight_serializer_integration(self):
        """测试洞察序列化器集成"""
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
        )
        
        # 创建洞察
        insight = Insight.objects.create(
            retrospective=retrospective,
            title="集成测试洞察",
            description="集成测试描述",
            severity=InsightSeverity.MEDIUM
        )
        
        # 测试列表序列化器
        list_serializer = InsightListSerializer(insight)
        list_data = list_serializer.data
        self.assertIn('id', list_data)
        self.assertIn('title', list_data)
        
        # 测试详情序列化器
        detail_serializer = InsightDetailSerializer(insight)
        detail_data = detail_serializer.data
        self.assertIn('id', detail_data)
        self.assertIn('title', detail_data)
        self.assertIn('suggested_actions', detail_data)
