"""
Pure rule logic for insight generation
Contains only rule declarations and trigger logic
"""
from typing import Dict, List, Any, Optional
from decimal import Decimal


class InsightRules:
    """
    Pure rule logic for generating insights from KPI data
    Only handles rule declarations and trigger logic
    """
    
    # Rule definitions with thresholds
    RULE_DEFINITIONS = {
        'roi_poor': {
            'name': 'Poor ROI',
            'description': 'ROI is below acceptable threshold',
            'severity': 'high',
            'threshold': 0.7,
            'metric': 'ROI',
            'condition': 'less_than',
            'suggested_actions': [
                'Review audience targeting strategy',
                'Analyze ad creative performance',
                'Optimize bidding strategy',
                'Consider budget reallocation'
            ]
        },
        'roi_critical': {
            'name': 'Critical ROI',
            'description': 'ROI is critically low',
            'severity': 'critical',
            'threshold': 0.5,
            'metric': 'ROI',
            'condition': 'less_than',
            'suggested_actions': [
                'Immediate campaign pause recommended',
                'Conduct thorough performance audit',
                'Review campaign objectives',
                'Consider creative refresh'
            ]
        },
        'ctr_low': {
            'name': 'Low Click-Through Rate',
            'description': 'CTR is below industry standards',
            'severity': 'medium',
            'threshold': 0.005,  # 0.5%
            'metric': 'CTR',
            'condition': 'less_than',
            'suggested_actions': [
                'Test new ad creatives',
                'Review ad copy and messaging',
                'Optimize ad placement',
                'Analyze audience relevance'
            ]
        },
        'cpc_high': {
            'name': 'High Cost Per Click',
            'description': 'CPC is above target threshold',
            'severity': 'medium',
            'threshold': 2.0,  # $2.00
            'metric': 'CPC',
            'condition': 'greater_than',
            'suggested_actions': [
                'Review bidding strategy',
                'Optimize keyword selection',
                'Analyze competitor landscape',
                'Consider audience refinement'
            ]
        },
        'budget_overspend': {
            'name': 'Budget Overspend',
            'description': 'Campaign spending exceeds budget',
            'severity': 'high',
            'threshold': 1.1,  # 110% of budget
            'metric': 'budget_utilization',
            'condition': 'greater_than',
            'suggested_actions': [
                'Immediate budget review required',
                'Pause high-cost campaigns',
                'Optimize spending allocation',
                'Review campaign performance'
            ]
        },
        'conversion_rate_low': {
            'name': 'Low Conversion Rate',
            'description': 'Conversion rate is below target',
            'severity': 'medium',
            'threshold': 0.02,  # 2%
            'metric': 'conversion_rate',
            'condition': 'less_than',
            'suggested_actions': [
                'Review landing page experience',
                'Analyze conversion funnel',
                'Test different offers',
                'Optimize targeting criteria'
            ]
        },
        'impression_share_low': {
            'name': 'Low Impression Share',
            'description': 'Campaign not reaching full potential audience',
            'severity': 'medium',
            'threshold': 0.5,  # 50%
            'metric': 'impression_share',
            'condition': 'less_than',
            'suggested_actions': [
                'Increase bid strategy',
                'Expand keyword coverage',
                'Review budget allocation',
                'Analyze competitor activity'
            ]
        }
    }
    
    @staticmethod
    def check_roi_threshold(kpi_value: float, threshold: float = 0.7) -> Dict[str, Any]:
        """
        Pure rule logic for ROI threshold checking
        
        Args:
            kpi_value: Current ROI value
            threshold: Threshold to check against (default 0.7)
            
        Returns:
            Dict with rule evaluation results
        """
        rule_id = 'roi_critical' if kpi_value <= 0.5 else 'roi_poor'
        rule_def = InsightRules.RULE_DEFINITIONS[rule_id]
        
        return {
            'triggered': kpi_value < threshold,
            'rule_id': rule_id,
            'severity': rule_def['severity'],
            'insight_type': rule_def['name'],
            'description': rule_def['description'],
            'suggested_actions': rule_def['suggested_actions'],
            'threshold': threshold,
            'actual_value': kpi_value
        }
    
    @staticmethod
    def check_ctr_threshold(kpi_value: float, threshold: float = 0.005) -> Dict[str, Any]:
        """
        Pure rule logic for CTR threshold checking
        
        Args:
            kpi_value: Current CTR value
            threshold: Threshold to check against (default 0.5%)
            
        Returns:
            Dict with rule evaluation results
        """
        rule_def = InsightRules.RULE_DEFINITIONS['ctr_low']
        
        return {
            'triggered': kpi_value < threshold,
            'rule_id': 'ctr_low',
            'severity': rule_def['severity'],
            'insight_type': rule_def['name'],
            'description': rule_def['description'],
            'suggested_actions': rule_def['suggested_actions'],
            'threshold': threshold,
            'actual_value': kpi_value
        }
    
    @staticmethod
    def check_cpc_threshold(kpi_value: float, threshold: float = 2.0) -> Dict[str, Any]:
        """
        Pure rule logic for CPC threshold checking
        
        Args:
            kpi_value: Current CPC value
            threshold: Threshold to check against (default $2.00)
            
        Returns:
            Dict with rule evaluation results
        """
        rule_def = InsightRules.RULE_DEFINITIONS['cpc_high']
        
        return {
            'triggered': kpi_value > threshold,
            'rule_id': 'cpc_high',
            'severity': rule_def['severity'],
            'insight_type': rule_def['name'],
            'description': rule_def['description'],
            'suggested_actions': rule_def['suggested_actions'],
            'threshold': threshold,
            'actual_value': kpi_value
        }
    
    @staticmethod
    def check_budget_utilization(kpi_value: float, threshold: float = 1.1) -> Dict[str, Any]:
        """
        Pure rule logic for budget utilization checking
        
        Args:
            kpi_value: Current budget utilization ratio
            threshold: Threshold to check against (default 110%)
            
        Returns:
            Dict with rule evaluation results
        """
        rule_def = InsightRules.RULE_DEFINITIONS['budget_overspend']
        
        return {
            'triggered': kpi_value > threshold,
            'rule_id': 'budget_overspend',
            'severity': rule_def['severity'],
            'insight_type': rule_def['name'],
            'description': rule_def['description'],
            'suggested_actions': rule_def['suggested_actions'],
            'threshold': threshold,
            'actual_value': kpi_value
        }
    
    @staticmethod
    def check_conversion_rate_threshold(kpi_value: float, threshold: float = 0.02) -> Dict[str, Any]:
        """
        Pure rule logic for conversion rate threshold checking
        
        Args:
            kpi_value: Current conversion rate value
            threshold: Threshold to check against (default 2%)
            
        Returns:
            Dict with rule evaluation results
        """
        rule_def = InsightRules.RULE_DEFINITIONS['conversion_rate_low']
        
        return {
            'triggered': kpi_value < threshold,
            'rule_id': 'conversion_rate_low',
            'severity': rule_def['severity'],
            'insight_type': rule_def['name'],
            'description': rule_def['description'],
            'suggested_actions': rule_def['suggested_actions'],
            'threshold': threshold,
            'actual_value': kpi_value
        }
    
    @staticmethod
    def check_impression_share_threshold(kpi_value: float, threshold: float = 0.5) -> Dict[str, Any]:
        """
        Pure rule logic for impression share threshold checking
        
        Args:
            kpi_value: Current impression share value
            threshold: Threshold to check against (default 50%)
            
        Returns:
            Dict with rule evaluation results
        """
        rule_def = InsightRules.RULE_DEFINITIONS['impression_share_low']
        
        return {
            'triggered': kpi_value < threshold,
            'rule_id': 'impression_share_low',
            'severity': rule_def['severity'],
            'insight_type': rule_def['name'],
            'description': rule_def['description'],
            'suggested_actions': rule_def['suggested_actions'],
            'threshold': threshold,
            'actual_value': kpi_value
        }
    
    @staticmethod
    def get_rule_definition(rule_id: str) -> Optional[Dict[str, Any]]:
        """
        Get rule definition by rule ID
        
        Args:
            rule_id: ID of the rule to retrieve
            
        Returns:
            Rule definition dict or None if not found
        """
        return InsightRules.RULE_DEFINITIONS.get(rule_id)
    
    @staticmethod
    def get_all_rules() -> Dict[str, Dict[str, Any]]:
        """
        Get all available rule definitions
        
        Returns:
            Dict of all rule definitions
        """
        return InsightRules.RULE_DEFINITIONS.copy()
    
    @staticmethod
    def validate_rule_parameters(metric_name: str, value: float, threshold: float, condition: str) -> bool:
        """
        Validate rule parameters
        
        Args:
            metric_name: Name of the metric
            value: Current value
            threshold: Threshold value
            condition: Comparison condition
            
        Returns:
            True if parameters are valid
        """
        valid_conditions = ['less_than', 'greater_than', 'equals', 'not_equals']
        
        if condition not in valid_conditions:
            return False
        
        if not isinstance(value, (int, float, Decimal)):
            return False
        
        if not isinstance(threshold, (int, float, Decimal)):
            return False
        
        return True 