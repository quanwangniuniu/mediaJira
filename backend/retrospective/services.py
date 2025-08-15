"""
Business logic services for retrospective engine
Handles complex business flows like KPI aggregation, batch insight generation, and report generation
"""
from typing import Dict, List, Any, Optional
from decimal import Decimal
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from .models import RetrospectiveTask, Insight, RetrospectiveStatus, CampaignMetric
from .rules import InsightRules

User = get_user_model()


class RetrospectiveService:
    """
    Service class for handling retrospective business logic
    """
    
    @staticmethod
    def create_retrospective_for_campaign(campaign_id: str, created_by: User) -> RetrospectiveTask:
        """
        Create a new retrospective task for a completed campaign
        
        Args:
            campaign_id: ID of the campaign
            created_by: User creating the retrospective
            
        Returns:
            Created RetrospectiveTask instance
        """
        from core.models import Project as Campaign
        
        try:
            campaign = Campaign.objects.get(id=campaign_id)
            
            # For Project model, we assume it's always eligible for retrospective
            # since Project doesn't have a status field, we skip the status check
            
            # If a retrospective already exists, return it instead of raising
            existing = RetrospectiveTask.objects.filter(campaign=campaign).first()
            if existing:
                return existing

            retrospective = RetrospectiveTask.objects.create(
                campaign=campaign,
                created_by=created_by,
                status=RetrospectiveStatus.SCHEDULED
            )
            
            return retrospective
            
        except Campaign.DoesNotExist:
            raise ValueError(f"Campaign with ID {campaign_id} not found")
    
    @staticmethod
    def aggregate_kpi_data(retrospective_id: str) -> Dict[str, Any]:
        """
        Aggregate KPI data from multiple sources for a retrospective
        
        Args:
            retrospective_id: ID of the retrospective task
            
        Returns:
            Aggregated KPI data dictionary
        """
        try:
            retrospective = RetrospectiveTask.objects.get(id=retrospective_id)
            
            # Get all KPIs for this retrospective using CampaignMetric
            campaign_metrics = CampaignMetric.objects.filter(campaign=retrospective.campaign)
            
            # Group KPIs by metric name using CampaignMetric data
            kpi_data = {}
            for metric in campaign_metrics:
                # Convert CampaignMetric to KPI format
                # Calculate ROI from available metrics
                roi_value = 0
                if metric.conversions and metric.cost_per_conversion:
                    # Mock revenue calculation (in real scenario, this would come from actual data)
                    revenue_per_conversion = 100  # Mock value
                    total_revenue = metric.conversions * revenue_per_conversion
                    total_cost = metric.conversions * float(metric.cost_per_conversion)
                    roi_value = (total_revenue - total_cost) / total_cost if total_cost > 0 else 0
                
                metrics_to_process = [
                    ('ROI', roi_value, 'ratio', 0.8),
                    ('CTR', float(metric.click_through_rate) if metric.click_through_rate else 0, '%', 0.02),
                    ('Conversion Rate', float(metric.conversion_rate) if metric.conversion_rate else 0, '%', 0.01),
                    ('CPC', float(metric.cost_per_click) if metric.cost_per_click else 0, '$', 2.0),
                    ('CPM', float(metric.cost_per_impression) if metric.cost_per_impression else 0, '$', 10.0),
                    ('CPA', float(metric.cost_per_conversion) if metric.cost_per_conversion else 0, '$', 50.0),
                ]
                
                for metric_name, value, unit, target in metrics_to_process:
                    if metric_name not in kpi_data:
                        kpi_data[metric_name] = {
                            'values': [],
                            'sources': [],
                            'latest_value_value': None,
                            'latest_recorded_at': None,
                            'target_value': target,
                            'unit': unit
                        }

                    kpi_data[metric_name]['values'].append({
                        'value': value,
                        'source': 'internal',
                        'recorded_at': metric.recorded_at.isoformat(),
                        'raw_data': {
                            'impressions': metric.impressions,
                            'clicks': metric.clicks,
                            'conversions': metric.conversions,
                            'date': metric.date.isoformat()
                        }
                    })
                    kpi_data[metric_name]['sources'].append('internal')

                    # Track latest value using datetime comparison
                    latest_recorded_at = kpi_data[metric_name]['latest_recorded_at']
                    if latest_recorded_at is None or metric.recorded_at > latest_recorded_at:
                        kpi_data[metric_name]['latest_value_value'] = value
                        kpi_data[metric_name]['latest_recorded_at'] = metric.recorded_at
            
            # Calculate aggregated metrics
            aggregated_metrics = {}
            for metric_name, data in kpi_data.items():
                if data['values']:
                    values = [v['value'] for v in data['values']]
                    aggregated_metrics[metric_name] = {
                        'current_value': data['latest_value_value'],
                        'average_value': sum(values) / len(values),
                        'min_value': min(values),
                        'max_value': max(values),
                        'target_value': data['target_value'],
                        'unit': data['unit'],
                        'sources': list(set(data['sources'])),
                        'data_points': len(data['values'])
                    }
            
            return {
                'retrospective_id': retrospective_id,
            'campaign_id': str(retrospective.campaign.id),
                'aggregated_metrics': aggregated_metrics,
                'total_metrics': len(campaign_metrics),
                'aggregated_at': timezone.now().isoformat()
            }
            
        except RetrospectiveTask.DoesNotExist:
            raise ValueError(f"Retrospective with ID {retrospective_id} not found")
    
    @staticmethod
    def generate_insights_batch(retrospective_id: str, user: Optional[User] = None) -> List[Insight]:
        """
        Batch generate insights using rule engine for a retrospective
        
        Args:
            retrospective_id: ID of the retrospective task
            user: User generating insights (optional, for manual insights)
            
        Returns:
            List of generated Insight instances
        """
        try:
            retrospective = RetrospectiveTask.objects.get(id=retrospective_id)
            
            # Get aggregated KPI data
            kpi_data = RetrospectiveService.aggregate_kpi_data(retrospective_id)
            aggregated_metrics = kpi_data['aggregated_metrics']
            
            generated_insights = []
            
            # Apply rules to each metric
            for metric_name, metric_data in aggregated_metrics.items():
                current_value = metric_data['current_value']
                
                # Apply relevant rules based on metric name
                if metric_name.upper() == 'ROI':
                    rule_result = InsightRules.check_roi_threshold(current_value)
                    if rule_result['triggered']:
                        insight = RetrospectiveService._create_insight_from_rule(
                            retrospective, rule_result, user
                        )
                        generated_insights.append(insight)
                
                elif metric_name.upper() == 'CTR':
                    rule_result = InsightRules.check_ctr_threshold(current_value)
                    if rule_result['triggered']:
                        insight = RetrospectiveService._create_insight_from_rule(
                            retrospective, rule_result, user
                        )
                        generated_insights.append(insight)
                
                elif metric_name.upper() == 'CPC':
                    rule_result = InsightRules.check_cpc_threshold(current_value)
                    if rule_result['triggered']:
                        insight = RetrospectiveService._create_insight_from_rule(
                            retrospective, rule_result, user
                        )
                        generated_insights.append(insight)
                
                elif metric_name.upper() == 'BUDGET_UTILIZATION':
                    rule_result = InsightRules.check_budget_utilization(current_value)
                    if rule_result['triggered']:
                        insight = RetrospectiveService._create_insight_from_rule(
                            retrospective, rule_result, user
                        )
                        generated_insights.append(insight)
                
                elif metric_name.upper() == 'CONVERSION RATE':
                    rule_result = InsightRules.check_conversion_rate_threshold(current_value)
                    if rule_result['triggered']:
                        insight = RetrospectiveService._create_insight_from_rule(
                            retrospective, rule_result, user
                        )
                        generated_insights.append(insight)
                
                elif metric_name.upper() == 'IMPRESSION_SHARE':
                    rule_result = InsightRules.check_impression_share_threshold(current_value)
                    if rule_result['triggered']:
                        insight = RetrospectiveService._create_insight_from_rule(
                            retrospective, rule_result, user
                        )
                        generated_insights.append(insight)
            
            return generated_insights
            
        except RetrospectiveTask.DoesNotExist:
            raise ValueError(f"Retrospective with ID {retrospective_id} not found")
    
    @staticmethod
    def _create_insight_from_rule(retrospective: RetrospectiveTask, rule_result: Dict[str, Any], user: Optional[User] = None) -> Insight:
        """
        Create an Insight instance from rule evaluation result
        
        Args:
            retrospective: RetrospectiveTask instance
            rule_result: Result from rule evaluation
            user: User creating the insight (optional)
            
        Returns:
            Created Insight instance
        """
        return Insight.objects.create(
            retrospective=retrospective,
            title=rule_result['insight_type'],
            description=rule_result['description'],
            severity=rule_result['severity'],
            rule_id=rule_result['rule_id'],
            suggested_actions=rule_result['suggested_actions'],
            created_by=user,
            generated_by='rule_engine'
        )
    
    @staticmethod
    def generate_report(retrospective_id: str) -> str:
        """
        Generate PDF report for a retrospective
        
        Args:
            retrospective_id: ID of the retrospective task
            
        Returns:
            URL to the generated report
        """
        try:
            retrospective = RetrospectiveTask.objects.get(id=retrospective_id)
            
            # Check if retrospective is completed
            if retrospective.status != RetrospectiveStatus.COMPLETED:
                raise ValueError(f"Cannot generate report for retrospective with status: {retrospective.status}")
            
            # Generate report content
            report_data = RetrospectiveService._prepare_report_data(retrospective)
            
            # Generate PDF (mock implementation for now)
            report_url = RetrospectiveService._generate_pdf_report(report_data)
            
            # Update retrospective with report URL
            retrospective.report_url = report_url
            retrospective.report_generated_at = timezone.now()
            retrospective.save()
            
            return report_url
            
        except RetrospectiveTask.DoesNotExist:
            raise ValueError(f"Retrospective with ID {retrospective_id} not found")
    
    @staticmethod
    def _prepare_report_data(retrospective: RetrospectiveTask) -> Dict[str, Any]:
        """
        Prepare data for report generation
        
        Args:
            retrospective: RetrospectiveTask instance
            
        Returns:
            Report data dictionary
        """
        # Get campaign data
        campaign = retrospective.campaign
        
        # Get KPI data
        kpi_data = RetrospectiveService.aggregate_kpi_data(str(retrospective.id))
        
        # Get insights
        insights = Insight.objects.filter(retrospective=retrospective, is_active=True)
        
        return {
            'retrospective_id': str(retrospective.id),
            'campaign_name': campaign.name,
            'campaign_description': f"Campaign for {campaign.organization.name}",  # Use organization name as description
            'campaign_budget': 0.0,  # Default value since Project doesn't have budget
            'campaign_spent': 0.0,   # Default value since Project doesn't have spent_amount
            'campaign_duration': {
                'start_date': timezone.now().isoformat(),  # Use current time as default
                'end_date': timezone.now().isoformat()     # Use current time as default
            },
            'retrospective_duration': retrospective.duration.total_seconds() / 3600 if retrospective.duration else None,
            'kpi_summary': kpi_data['aggregated_metrics'],
            'insights': [
                {
                    'title': insight.title,
                    'description': insight.description,
                    'severity': insight.severity,
                    'suggested_actions': insight.suggested_actions
                }
                for insight in insights
            ],
            'generated_at': timezone.now().isoformat()
        }
    
    @staticmethod
    def _generate_pdf_report(report_data: Dict[str, Any]) -> str:
        """
        Generate PDF report (mock implementation)
        
        Args:
            report_data: Data for report generation
            
        Returns:
            URL to the generated report
        """
        # Mock implementation - in real implementation, use reportlab or similar
        import uuid
        report_id = str(uuid.uuid4())
        
        # Mock URL - in production, this would be a real file URL
        report_url = f"/media/reports/retrospective_{report_id}.pdf"
        
        return report_url
    
    @staticmethod
    def approve_report(retrospective_id: str, approved_by: User) -> RetrospectiveTask:
        """
        Approve a retrospective report
        
        Args:
            retrospective_id: ID of the retrospective task
            approved_by: User approving the report
            
        Returns:
            Updated RetrospectiveTask instance
        """
        try:
            retrospective = RetrospectiveTask.objects.get(id=retrospective_id)
            
            # Check if report exists
            if not retrospective.report_url:
                raise ValueError("Cannot approve retrospective without generated report")
            
            # Check if already approved
            if retrospective.reviewed_by:
                raise ValueError("Retrospective report already approved")
            
            # Update retrospective
            retrospective.reviewed_by = approved_by
            retrospective.reviewed_at = timezone.now()
            retrospective.status = RetrospectiveStatus.REPORTED
            retrospective.save()
            
            return retrospective
            
        except RetrospectiveTask.DoesNotExist:
            raise ValueError(f"Retrospective with ID {retrospective_id} not found")
    
    @staticmethod
    def get_retrospective_summary(retrospective_id: str) -> Dict[str, Any]:
        """
        Get comprehensive summary of a retrospective
        
        Args:
            retrospective_id: ID of the retrospective task
            
        Returns:
            Summary dictionary
        """
        try:
            retrospective = RetrospectiveTask.objects.get(id=retrospective_id)
            
            # Get KPI data
            kpi_data = RetrospectiveService.aggregate_kpi_data(retrospective_id)
            
            # Get insights
            insights = Insight.objects.filter(retrospective=retrospective, is_active=True)
            
            # Calculate summary statistics
            total_insights = insights.count()
            critical_insights = insights.filter(severity='critical').count()
            high_insights = insights.filter(severity='high').count()
            medium_insights = insights.filter(severity='medium').count()
            low_insights = insights.filter(severity='low').count()
            
            return {
                'retrospective_id': str(retrospective.id),
                'campaign_id': str(retrospective.campaign.id),
                'campaign_name': retrospective.campaign.name,
                'status': retrospective.status,
                'scheduled_at': retrospective.scheduled_at.isoformat(),
                'started_at': retrospective.started_at.isoformat() if retrospective.started_at else None,
                'completed_at': retrospective.completed_at.isoformat() if retrospective.completed_at else None,
                'duration_hours': retrospective.duration.total_seconds() / 3600 if retrospective.duration else None,
                'report_url': retrospective.report_url,
                'report_generated_at': retrospective.report_generated_at.isoformat() if retrospective.report_generated_at else None,
                'reviewed_by': retrospective.reviewed_by.username if retrospective.reviewed_by else None,
                'reviewed_at': retrospective.reviewed_at.isoformat() if retrospective.reviewed_at else None,
                'kpi_summary': kpi_data['aggregated_metrics'],
                'insights_summary': {
                    'total': total_insights,
                    'critical': critical_insights,
                    'high': high_insights,
                    'medium': medium_insights,
                    'low': low_insights
                },
                'created_by': retrospective.created_by.username,
                'created_at': retrospective.created_at.isoformat()
            }
            
        except RetrospectiveTask.DoesNotExist:
            raise ValueError(f"Retrospective with ID {retrospective_id} not found") 