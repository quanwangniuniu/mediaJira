"""
KPI聚合集成测试
测试KPI数据聚合、多源数据整合、聚合计算准确性
"""
import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import transaction
from unittest.mock import patch, MagicMock

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, CampaignMetric, RetrospectiveStatus
from retrospective.services import RetrospectiveService

User = get_user_model()


class TestKPIAggregation(TransactionTestCase):
    """测试KPI数据聚合"""

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
            created_by=self.user
        )

    def test_basic_kpi_aggregation(self):
        """测试基本KPI聚合"""
        # 创建KPI数据
        base_date = datetime.now().date()
        
        for i in range(10):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 100),
                clicks=50 + (i * 5),
                conversions=5 + (i * 0.5),
                cost_per_click=Decimal('2.50') + Decimal(str(i * 0.1)),
                cost_per_impression=Decimal('0.10') + Decimal(str(i * 0.01)),
                cost_per_conversion=Decimal('25.00') + Decimal(str(i * 1)),
                click_through_rate=Decimal('0.05') + Decimal(str(i * 0.001)),
                conversion_rate=Decimal('0.10') + Decimal(str(i * 0.005))
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 聚合KPI数据
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # 验证聚合结构
        self.assertIn('aggregated_metrics', kpi_data)
        self.assertIn('total_metrics', kpi_data)
        self.assertIn('campaign_id', kpi_data)
        self.assertIn('aggregated_at', kpi_data)
        
        # 验证指标聚合
        metrics = kpi_data['aggregated_metrics']
        self.assertIn('ROI', metrics)
        self.assertIn('CTR', metrics)
        self.assertIn('CPC', metrics)
        self.assertIn('CPM', metrics)
        self.assertIn('CPA', metrics)
        self.assertIn('Conversion Rate', metrics)
        
        # 验证聚合计算
        for metric_name, metric_data in metrics.items():
            self.assertIn('current_value', metric_data)
            self.assertIn('average_value', metric_data)
            self.assertIn('min_value', metric_data)
            self.assertIn('max_value', metric_data)
            self.assertIn('target_value', metric_data)
            self.assertIn('unit', metric_data)
            self.assertIn('sources', metric_data)
            self.assertIn('data_points', metric_data)
            
            # 验证数据点数量
            self.assertEqual(metric_data['data_points'], 10)
            
            # 验证聚合值的合理性
            self.assertGreaterEqual(metric_data['max_value'], metric_data['min_value'])
            self.assertGreaterEqual(metric_data['average_value'], metric_data['min_value'])
            self.assertLessEqual(metric_data['average_value'], metric_data['max_value'])

    def test_kpi_aggregation_with_missing_data(self):
        """测试包含缺失数据的KPI聚合"""
        # 创建不完整的KPI数据
        base_date = datetime.now().date()
        
        # 创建一些有数据的记录
        for i in range(5):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 100),
                clicks=50 + (i * 5),
                conversions=5 + (i * 0.5),
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建一些缺失数据的记录
        for i in range(5, 10):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=0,  # 缺失数据
                clicks=0,
                conversions=0,
                cost_per_click=Decimal('0'),
                cost_per_impression=Decimal('0'),
                cost_per_conversion=Decimal('0'),
                click_through_rate=Decimal('0'),
                conversion_rate=Decimal('0')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 聚合KPI数据
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # 验证聚合处理了缺失数据
        metrics = kpi_data['aggregated_metrics']
        self.assertEqual(kpi_data['total_metrics'], 10)
        
        # 验证聚合计算正确性
        for metric_name, metric_data in metrics.items():
            self.assertEqual(metric_data['data_points'], 10)
            # 平均值应该考虑所有数据点，包括零值
            self.assertIsNotNone(metric_data['average_value'])

    def test_kpi_aggregation_with_large_dataset(self):
        """测试大数据集的KPI聚合"""
        # 创建大量KPI数据
        base_date = datetime.now().date()
        
        for i in range(1000):  # 1000条记录
            date = base_date - timedelta(days=i % 365)  # 分布在一年内
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i % 100),
                clicks=50 + (i % 10),
                conversions=5 + (i % 5),
                cost_per_click=Decimal('2.50') + Decimal(str((i % 10) * 0.01)),
                cost_per_impression=Decimal('0.10') + Decimal(str((i % 10) * 0.001)),
                cost_per_conversion=Decimal('25.00') + Decimal(str((i % 10) * 0.1)),
                click_through_rate=Decimal('0.05') + Decimal(str((i % 10) * 0.001)),
                conversion_rate=Decimal('0.10') + Decimal(str((i % 10) * 0.001))
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 测试聚合性能
        import time
        start_time = time.time()
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        end_time = time.time()
        
        duration = end_time - start_time
        
        # 应该在2秒内完成
        self.assertLess(duration, 2.0, f"KPI聚合耗时 {duration:.2f} 秒，预期 < 2.0")
        
        # 验证聚合结果
        self.assertEqual(kpi_data['total_metrics'], 1000)
        metrics = kpi_data['aggregated_metrics']
        
        for metric_name, metric_data in metrics.items():
            self.assertEqual(metric_data['data_points'], 1000)

    def test_kpi_aggregation_accuracy(self):
        """测试KPI聚合计算准确性"""
        # 创建已知数据的KPI记录
        base_date = datetime.now().date()
        
        test_data = [
            {'impressions': 1000, 'clicks': 50, 'conversions': 5, 'cost_per_click': Decimal('2.00')},
            {'impressions': 2000, 'clicks': 100, 'conversions': 10, 'cost_per_click': Decimal('3.00')},
            {'impressions': 3000, 'clicks': 150, 'conversions': 15, 'cost_per_click': Decimal('4.00')},
        ]
        
        for i, data in enumerate(test_data):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=data['impressions'],
                clicks=data['clicks'],
                conversions=data['conversions'],
                cost_per_click=data['cost_per_click'],
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 聚合KPI数据
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # 验证CTR计算准确性
        ctr_data = kpi_data['aggregated_metrics']['CTR']
        
        # 手动计算期望值
        total_impressions = 1000 + 2000 + 3000
        total_clicks = 50 + 100 + 150
        expected_ctr = total_clicks / total_impressions
        
        # 验证CTR聚合
        self.assertAlmostEqual(float(ctr_data['average_value']), expected_ctr, places=4)
        self.assertEqual(ctr_data['data_points'], 3)
        
        # 验证CPC聚合
        cpc_data = kpi_data['aggregated_metrics']['CPC']
        expected_cpc_avg = (2.00 + 3.00 + 4.00) / 3
        self.assertAlmostEqual(float(cpc_data['average_value']), expected_cpc_avg, places=2)

    def test_kpi_aggregation_with_different_sources(self):
        """测试多源KPI数据聚合"""
        # 创建来自不同来源的KPI数据
        base_date = datetime.now().date()
        
        # 模拟内部数据
        for i in range(5):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 100),
                clicks=50 + (i * 5),
                conversions=5 + (i * 0.5),
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 聚合KPI数据
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # 验证数据源信息
        metrics = kpi_data['aggregated_metrics']
        for metric_name, metric_data in metrics.items():
            self.assertIn('sources', metric_data)
            self.assertIn('internal', metric_data['sources'])

    def test_kpi_aggregation_with_date_ranges(self):
        """测试不同日期范围的KPI聚合"""
        # 创建跨越多个月的数据
        base_date = datetime.now().date()
        
        # 创建最近30天的数据
        for i in range(30):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 10),
                clicks=50 + (i * 1),
                conversions=5 + (i * 0.1),
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 聚合KPI数据
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # 验证日期范围处理
        self.assertEqual(kpi_data['total_metrics'], 30)
        
        # 验证最新值是最新的记录
        metrics = kpi_data['aggregated_metrics']
        for metric_name, metric_data in metrics.items():
            self.assertIsNotNone(metric_data['current_value'])
            self.assertIsNotNone(metric_data['latest_recorded_at'])

    def test_kpi_aggregation_error_handling(self):
        """测试KPI聚合错误处理"""
        # 测试不存在的回顾ID
        with self.assertRaises(ValueError):
            RetrospectiveService.aggregate_kpi_data(str(uuid.uuid4()))
        
        # 测试无效的回顾ID格式
        with self.assertRaises(ValueError):
            RetrospectiveService.aggregate_kpi_data("invalid-id")

    def test_kpi_aggregation_with_zero_values(self):
        """测试包含零值的KPI聚合"""
        # 创建包含零值的数据
        base_date = datetime.now().date()
        
        test_cases = [
            {'impressions': 0, 'clicks': 0, 'conversions': 0},
            {'impressions': 1000, 'clicks': 0, 'conversions': 0},
            {'impressions': 1000, 'clicks': 50, 'conversions': 0},
            {'impressions': 1000, 'clicks': 50, 'conversions': 5},
        ]
        
        for i, data in enumerate(test_cases):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=data['impressions'],
                clicks=data['clicks'],
                conversions=data['conversions'],
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 聚合KPI数据
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # 验证零值处理
        metrics = kpi_data['aggregated_metrics']
        
        # CTR应该正确处理零点击的情况
        ctr_data = metrics['CTR']
        self.assertIsNotNone(ctr_data['average_value'])
        self.assertGreaterEqual(ctr_data['min_value'], 0)
        
        # 转换率应该正确处理零转换的情况
        conversion_data = metrics['Conversion Rate']
        self.assertIsNotNone(conversion_data['average_value'])
        self.assertGreaterEqual(conversion_data['min_value'], 0)

    def test_kpi_aggregation_performance_benchmark(self):
        """测试KPI聚合性能基准"""
        # 创建大量数据
        base_date = datetime.now().date()
        
        for i in range(5000):  # 5000条记录
            date = base_date - timedelta(days=i % 365)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i % 100),
                clicks=50 + (i % 10),
                conversions=5 + (i % 5),
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user
        )
        
        # 多次运行以测试一致性
        durations = []
        for _ in range(5):
            start_time = time.time()
            kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
            end_time = time.time()
            durations.append(end_time - start_time)
        
        # 验证性能一致性
        avg_duration = sum(durations) / len(durations)
        max_duration = max(durations)
        
        # 平均时间应该在合理范围内
        self.assertLess(avg_duration, 3.0, f"平均聚合时间 {avg_duration:.2f} 秒")
        
        # 最大时间不应该超过平均时间的2倍
        self.assertLess(max_duration, avg_duration * 2, f"最大聚合时间 {max_duration:.2f} 秒")


@pytest.mark.django_db
class TestKPIAggregationConcurrency:
    """KPI聚合并发测试"""
    
    def test_concurrent_kpi_aggregation(self):
        """测试并发KPI聚合"""
        import threading
        import queue
        
        # 创建测试数据
        org = Organization.objects.create(name="并发测试机构")
        user = User.objects.create_user(username="concurrent", email="concurrent@test.com", organization=org)
        campaign = Project.objects.create(name="并发测试活动", organization=org, created_by=user)
        
        # 创建KPI数据
        base_date = datetime.now().date()
        for i in range(100):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=campaign,
                date=date,
                impressions=1000 + i,
                clicks=50 + i,
                conversions=5 + i,
                cost_per_click=Decimal('2.50'),
                cost_per_impression=Decimal('0.10'),
                cost_per_conversion=Decimal('25.00'),
                click_through_rate=Decimal('0.05'),
                conversion_rate=Decimal('0.10')
            )
        
        # 创建回顾
        retrospective = RetrospectiveTask.objects.create(campaign=campaign, created_by=user)
        
        # 并发聚合测试
        results = queue.Queue()
        
        def aggregate_kpi():
            try:
                kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
                results.put(('success', kpi_data))
            except Exception as e:
                results.put(('error', str(e)))
        
        # 启动多个线程
        threads = []
        for i in range(10):
            thread = threading.Thread(target=aggregate_kpi)
            threads.append(thread)
            thread.start()
        
        # 等待所有线程完成
        for thread in threads:
            thread.join()
        
        # 验证结果
        success_count = 0
        error_count = 0
        
        while not results.empty():
            result_type, result_data = results.get()
            if result_type == 'success':
                success_count += 1
                # 验证聚合结果
                assert 'aggregated_metrics' in result_data
                assert result_data['total_metrics'] == 100
            else:
                error_count += 1
        
        # 所有聚合都应该成功
        assert success_count == 10
        assert error_count == 0
