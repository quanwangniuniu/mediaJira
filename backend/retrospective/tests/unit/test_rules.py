"""
规则引擎单元测试
测试洞察规则、规则评估、规则配置
"""
import pytest
from decimal import Decimal
from django.test import TestCase
from unittest.mock import patch, MagicMock

from retrospective.rules import InsightRules


class TestInsightRules(TestCase):
    """测试洞察规则引擎"""

    def setUp(self):
        """设置测试数据"""
        self.rules = InsightRules()

    def test_roi_threshold_rules(self):
        """测试ROI阈值规则"""
        # 测试优秀ROI
        result = InsightRules.check_roi_threshold(2.5)
        self.assertFalse(result['triggered'])
        
        # 测试良好ROI
        result = InsightRules.check_roi_threshold(1.2)
        self.assertFalse(result['triggered'])
        
        # 测试差劲ROI
        result = InsightRules.check_roi_threshold(0.5)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'critical')
        self.assertIn('critical', result['insight_type'].lower())
        
        # 测试关键ROI
        result = InsightRules.check_roi_threshold(-0.2)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'critical')
        self.assertIn('critical', result['insight_type'].lower())

    def test_ctr_threshold_rules(self):
        """测试CTR阈值规则"""
        # 测试优秀CTR
        result = InsightRules.check_ctr_threshold(0.05)
        self.assertFalse(result['triggered'])
        
        # 测试良好CTR
        result = InsightRules.check_ctr_threshold(0.02)
        self.assertFalse(result['triggered'])
        
        # 测试低CTR
        result = InsightRules.check_ctr_threshold(0.004)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'medium')
        self.assertIn('low', result['insight_type'].lower())

    def test_cpc_threshold_rules(self):
        """测试CPC阈值规则"""
        # 测试优秀CPC
        result = InsightRules.check_cpc_threshold(1.0)
        self.assertFalse(result['triggered'])
        
        # 测试良好CPC
        result = InsightRules.check_cpc_threshold(2.0)
        self.assertFalse(result['triggered'])
        
        # 测试高CPC
        result = InsightRules.check_cpc_threshold(5.0)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'medium')
        self.assertIn('high', result['insight_type'].lower())

    def test_budget_utilization_rules(self):
        """测试预算利用率规则"""
        # 测试正常预算利用率
        result = InsightRules.check_budget_utilization(0.8)
        self.assertFalse(result['triggered'])
        
        # 测试高预算利用率
        result = InsightRules.check_budget_utilization(1.2)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'high')
        self.assertIn('overspend', result['insight_type'].lower())
        
        # 测试预算超支
        result = InsightRules.check_budget_utilization(1.15)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'high')
        self.assertIn('overspend', result['insight_type'].lower())

    def test_conversion_rate_threshold_rules(self):
        """测试转换率阈值规则"""
        # 测试优秀转换率
        result = InsightRules.check_conversion_rate_threshold(0.15)
        self.assertFalse(result['triggered'])
        
        # 测试良好转换率
        result = InsightRules.check_conversion_rate_threshold(0.05)
        self.assertFalse(result['triggered'])
        
        # 测试低转换率
        result = InsightRules.check_conversion_rate_threshold(0.01)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'medium')
        self.assertIn('low', result['insight_type'].lower())

    def test_impression_share_threshold_rules(self):
        """测试展示份额阈值规则"""
        # 测试优秀展示份额
        result = InsightRules.check_impression_share_threshold(0.8)
        self.assertFalse(result['triggered'])
        
        # 测试良好展示份额
        result = InsightRules.check_impression_share_threshold(0.5)
        self.assertFalse(result['triggered'])
        
        # 测试低展示份额
        result = InsightRules.check_impression_share_threshold(0.2)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'medium')
        self.assertIn('low', result['insight_type'].lower())

    def test_rule_result_structure(self):
        """测试规则结果结构"""
        result = InsightRules.check_roi_threshold(0.3)
        
        # 验证结果结构
        required_fields = [
            'triggered', 'insight_type', 'description', 'severity',
            'rule_id', 'suggested_actions'
        ]
        
        for field in required_fields:
            self.assertIn(field, result)
        
        # 验证数据类型
        self.assertIsInstance(result['triggered'], bool)
        self.assertIsInstance(result['insight_type'], str)
        self.assertIsInstance(result['description'], str)
        self.assertIsInstance(result['severity'], str)
        self.assertIsInstance(result['rule_id'], str)
        self.assertIsInstance(result['suggested_actions'], list)

    def test_suggested_actions(self):
        """测试建议行动"""
        # 测试ROI差劲的建议行动
        result = InsightRules.check_roi_threshold(0.3)
        self.assertTrue(result['triggered'])
        self.assertGreater(len(result['suggested_actions']), 0)
        
        # 验证建议行动的内容
        for action in result['suggested_actions']:
            self.assertIsInstance(action, str)
            self.assertGreater(len(action), 10)  # 建议行动应该有足够的内容

    def test_rule_id_consistency(self):
        """测试规则ID一致性"""
        # 相同输入应该产生相同的规则ID
        result1 = InsightRules.check_roi_threshold(0.3)
        result2 = InsightRules.check_roi_threshold(0.3)
        
        self.assertEqual(result1['rule_id'], result2['rule_id'])
        
        # 不同输入应该产生不同的规则ID
        result3 = InsightRules.check_ctr_threshold(0.005)
        self.assertNotEqual(result1['rule_id'], result3['rule_id'])

    def test_edge_cases(self):
        """测试边界情况"""
        # 测试零值
        result = InsightRules.check_roi_threshold(0.0)
        self.assertTrue(result['triggered'])
        
        # 测试负值
        result = InsightRules.check_roi_threshold(-0.5)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'critical')
        
        # 测试极大值
        result = InsightRules.check_roi_threshold(100.0)
        self.assertFalse(result['triggered'])
        
        # 测试小数精度
        result = InsightRules.check_ctr_threshold(0.019999)
        self.assertFalse(result['triggered'])
        
        result = InsightRules.check_ctr_threshold(0.020001)
        self.assertFalse(result['triggered'])

    def test_rule_thresholds(self):
        """测试规则阈值"""
        # 测试ROI阈值
        self.assertTrue(InsightRules.check_roi_threshold(0.6)['triggered'])  # 低于0.7
        self.assertFalse(InsightRules.check_roi_threshold(0.7)['triggered'])  # 等于0.7
        self.assertFalse(InsightRules.check_roi_threshold(0.8)['triggered'])  # 高于0.7
        
        # 测试CTR阈值
        self.assertTrue(InsightRules.check_ctr_threshold(0.004)['triggered'])  # 低于0.005
        self.assertFalse(InsightRules.check_ctr_threshold(0.005)['triggered'])  # 等于0.005
        self.assertFalse(InsightRules.check_ctr_threshold(0.006)['triggered'])  # 高于0.005
        
        # 测试CPC阈值
        self.assertTrue(InsightRules.check_cpc_threshold(2.1)['triggered'])  # 高于2.0
        self.assertFalse(InsightRules.check_cpc_threshold(2.0)['triggered'])  # 等于2.0
        self.assertFalse(InsightRules.check_cpc_threshold(1.9)['triggered'])  # 低于2.0

    def test_rule_combinations(self):
        """测试规则组合"""
        # 测试多个规则同时触发
        kpi_data = {
            'ROI': 0.3,  # 应该触发
            'CTR': 0.01,  # 应该触发
            'CPC': 3.0,  # 应该触发
            'Conversion Rate': 0.005  # 应该触发
        }
        
        triggered_rules = []
        
        for metric, value in kpi_data.items():
            if metric == 'ROI':
                result = InsightRules.check_roi_threshold(value)
            elif metric == 'CTR':
                result = InsightRules.check_ctr_threshold(value)
            elif metric == 'CPC':
                result = InsightRules.check_cpc_threshold(value)
            elif metric == 'Conversion Rate':
                result = InsightRules.check_conversion_rate_threshold(value)
            
            if result['triggered']:
                triggered_rules.append(result)
        
        # 应该触发多个规则
        self.assertGreater(len(triggered_rules), 1)
        
        # 验证每个触发的规则都有正确的结构
        for rule in triggered_rules:
            self.assertIn('severity', rule)
            self.assertIn(rule['severity'], ['low', 'medium', 'high', 'critical'])

    def test_rule_descriptions(self):
        """测试规则描述"""
        # 测试描述包含关键信息
        result = InsightRules.check_roi_threshold(0.3)
        description = result['description']
        
        # 描述应该包含ROI相关信息
        self.assertIn('ROI', description.upper())
        
        # 测试CTR描述
        result = InsightRules.check_ctr_threshold(0.01)
        description = result['description']
        self.assertIn('CTR', description.upper())

    def test_rule_severity_levels(self):
        """测试规则严重级别"""
        # 测试不同严重级别
        critical_result = InsightRules.check_roi_threshold(-0.2)
        self.assertEqual(critical_result['severity'], 'critical')
        
        high_result = InsightRules.check_ctr_threshold(0.005)
        self.assertEqual(high_result['severity'], 'medium')
        
        high_result = InsightRules.check_budget_utilization(1.2)
        self.assertEqual(high_result['severity'], 'high')

    def test_rule_performance(self):
        """测试规则性能"""
        import time
        
        # 测试规则评估性能
        start_time = time.time()
        
        for i in range(1000):
            InsightRules.check_roi_threshold(i / 1000.0)
            InsightRules.check_ctr_threshold(i / 10000.0)
            InsightRules.check_cpc_threshold(i / 100.0)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # 1000次规则评估应该在1秒内完成
        self.assertLess(duration, 1.0, f"规则评估耗时 {duration:.2f} 秒")

    def test_rule_configuration(self):
        """测试规则配置"""
        # 测试获取所有规则
        all_rules = InsightRules.get_all_rules()
        self.assertIsInstance(all_rules, dict)
        self.assertGreater(len(all_rules), 0)
        
        # 验证规则结构
        for rule_id, rule in all_rules.items():
            self.assertIn('name', rule)
            self.assertIn('description', rule)
            self.assertIn('threshold', rule)
            self.assertIn('severity', rule)
        
        # 测试获取特定规则定义
        rule_def = InsightRules.get_rule_definition('roi_poor')
        self.assertIsNotNone(rule_def)
        self.assertEqual(rule_def['name'], 'Poor ROI')
        
        # 测试不存在的规则
        rule_def = InsightRules.get_rule_definition('nonexistent_rule')
        self.assertIsNone(rule_def)

    def test_rule_validation(self):
        """测试规则验证"""
        # 测试无效输入
        with self.assertRaises((ValueError, TypeError)):
            InsightRules.check_roi_threshold("invalid")
        
        with self.assertRaises((ValueError, TypeError)):
            InsightRules.check_ctr_threshold(None)
        
        # 测试边界值
        result = InsightRules.check_roi_threshold(float('inf'))
        self.assertIsInstance(result, dict)
        
        result = InsightRules.check_roi_threshold(float('-inf'))
        self.assertIsInstance(result, dict)

    def test_rule_customization(self):
        """测试规则自定义"""
        # 测试自定义阈值
        # 使用默认阈值0.7，0.85应该不触发
        result = InsightRules.check_roi_threshold(0.85)
        self.assertFalse(result['triggered'])
        
        # 使用自定义阈值0.9，0.85应该触发
        result = InsightRules.check_roi_threshold(0.85, threshold=0.9)
        self.assertTrue(result['triggered'])

    def test_rule_metrics_calculation(self):
        """测试规则指标计算"""
        # 测试ROI计算
        revenue = 1000
        cost = 500
        roi = (revenue - cost) / cost
        result = InsightRules.check_roi_threshold(roi)
        self.assertFalse(result['triggered'])  # ROI = 1.0，应该不触发
        
        # 测试CTR计算
        clicks = 50
        impressions = 1000
        ctr = clicks / impressions
        result = InsightRules.check_ctr_threshold(ctr)
        self.assertFalse(result['triggered'])  # CTR = 0.05，应该不触发
        
        # 测试转换率计算
        conversions = 10
        clicks = 100
        conversion_rate = conversions / clicks
        result = InsightRules.check_conversion_rate_threshold(conversion_rate)
        self.assertFalse(result['triggered'])  # 转换率 = 0.1，应该不触发
