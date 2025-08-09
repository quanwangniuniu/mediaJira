"""
Django management command to generate mock retrospective data
"""
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import random
import uuid

from retrospective.models import RetrospectiveTask, Insight, RetrospectiveStatus, InsightSeverity
from campaigns.models import CampaignMetric
from retrospective.services import RetrospectiveService
from retrospective.tasks import generate_mock_kpi_data

User = get_user_model()


class Command(BaseCommand):
    help = 'Generate mock retrospective data for testing and demonstration'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=5,
            help='Number of retrospectives to generate (default: 5)'
        )
        parser.add_argument(
            '--user',
            type=str,
            help='Username to assign retrospectives to (default: first superuser)'
        )
        parser.add_argument(
            '--campaign-status',
            type=str,
            default='completed',
            help='Campaign status to filter by (default: completed)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing retrospective data before generating'
        )
    
    def handle(self, *args, **options):
        count = options['count']
        username = options['user']
        campaign_status = options['campaign_status']
        clear_existing = options['clear']
        
        # Get or create user
        if username:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise CommandError(f'User "{username}" does not exist')
        else:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                raise CommandError('No superuser found. Please create a superuser first.')
        
        # Clear existing data if requested
        if clear_existing:
            self.stdout.write('Clearing existing retrospective data...')
            RetrospectiveTask.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing data cleared'))
        
        # Get completed campaigns
        try:
            from campaigns.models import Campaign
            campaigns = Campaign.objects.filter(status=campaign_status)
        except ImportError:
            raise CommandError('Campaigns app not available')
        
        if not campaigns.exists():
            raise CommandError(f'No campaigns with status "{campaign_status}" found')
        
        self.stdout.write(f'Generating {count} retrospectives for user: {user.username}')
        
        created_count = 0
        for i in range(count):
            try:
                # Select a random campaign
                campaign = random.choice(campaigns)
                
                # Check if retrospective already exists
                if RetrospectiveTask.objects.filter(campaign=campaign).exists():
                    self.stdout.write(f'Skipping campaign "{campaign.name}" - retrospective already exists')
                    continue
                
                # Create retrospective
                retrospective = RetrospectiveTask.objects.create(
                    campaign=campaign,
                    created_by=user,
                    status=RetrospectiveStatus.SCHEDULED
                )
                
                self.stdout.write(f'Created retrospective for campaign: {campaign.name}')
                
                # Generate mock KPI data
                kpi_result = generate_mock_kpi_data(str(retrospective.id))
                
                if kpi_result.get('success'):
                    self.stdout.write(f'  - Generated {kpi_result.get("metric_count", 0)} metrics')
                    
                    # Generate insights
                    insights = RetrospectiveService.generate_insights_batch(
                        retrospective_id=str(retrospective.id),
                        user=user
                    )
                    
                    self.stdout.write(f'  - Generated {len(insights)} insights')
                    
                    # Mark as completed
                    retrospective.status = RetrospectiveStatus.COMPLETED
                    retrospective.started_at = timezone.now() - timezone.timedelta(hours=2)
                    retrospective.completed_at = timezone.now()
                    retrospective.save()
                    
                    created_count += 1
                else:
                    self.stdout.write(self.style.WARNING(f'  - Failed to generate KPIs: {kpi_result.get("error")}'))
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating retrospective {i+1}: {str(e)}'))
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} retrospectives')
        )
        
        # Display summary
        total_retrospectives = RetrospectiveTask.objects.count()
        total_metrics = CampaignMetric.objects.count()
        total_insights = Insight.objects.count()
        
        self.stdout.write('\nSummary:')
        self.stdout.write(f'  - Total retrospectives: {total_retrospectives}')
        self.stdout.write(f'  - Total metrics: {total_metrics}')
        self.stdout.write(f'  - Total insights: {total_insights}')
        
        # Show some sample data
        if RetrospectiveTask.objects.exists():
            sample_retrospective = RetrospectiveTask.objects.first()
            self.stdout.write(f'\nSample retrospective:')
            self.stdout.write(f'  - ID: {sample_retrospective.id}')
            self.stdout.write(f'  - Campaign: {sample_retrospective.campaign.name}')
            self.stdout.write(f'  - Status: {sample_retrospective.get_status_display()}')
            self.stdout.write(f'  - Metrics: {CampaignMetric.objects.filter(campaign=sample_retrospective.campaign).count()}')
            self.stdout.write(f'  - Insights: {sample_retrospective.insights.count()}') 