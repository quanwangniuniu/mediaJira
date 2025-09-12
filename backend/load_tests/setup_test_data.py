#!/usr/bin/env python
"""
Setup script for creating test data for load testing
Creates users, campaigns, and initial KPI data for realistic load testing
"""
import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add Django project to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Organization, Project, Campaign
from retrospective.models import CampaignMetric, RetrospectiveTask, RetrospectiveStatus
from access_control.models import Role, UserRole

User = get_user_model()

def create_test_data():
    """Create comprehensive test data for load testing"""
    print("🚀 Creating test data for load testing...")
    
    # 1. Create test organization
    org, created = Organization.objects.get_or_create(
        name="Load Test Organization",
        defaults={"description": "Organization for load testing"}
    )
    if created:
        print(f"✅ Created organization: {org.name}")
    
    # 2. Create test users
    test_users = []
    user_data = [
        ("testuser", "testpass123", "test@example.com"),
        ("analyst1", "testpass123", "analyst1@example.com"),
        ("analyst2", "testpass123", "analyst2@example.com"),
        ("teamlead", "testpass123", "teamlead@example.com"),
        ("admin", "testpass123", "admin@example.com"),
    ]
    
    for username, password, email in user_data:
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                "email": email,
                "first_name": username.title(),
                "last_name": "Test"
            }
        )
        if created:
            user.set_password(password)
            user.save()
            print(f"✅ Created user: {username}")
        test_users.append(user)
    
    # 3. Create test project
    project, created = Project.objects.get_or_create(
        name="Load Test Project",
        organization=org,
        defaults={"description": "Project for load testing"}
    )
    if created:
        print(f"✅ Created project: {project.name}")
    
    # 4. Create test campaigns
    campaigns = []
    for i in range(5):
        campaign, created = Campaign.objects.get_or_create(
            name=f"Campaign {i+1}",
            project=project,
            defaults={
                "description": f"Load test campaign {i+1}",
                "budget": Decimal("10000.00"),
                "status": "active"
            }
        )
        if created:
            print(f"✅ Created campaign: {campaign.name}")
        campaigns.append(campaign)
    
    # 5. Create KPI data (30 days of data for each campaign)
    print("📊 Creating KPI data...")
    base_date = datetime.now().date()
    
    for campaign in campaigns:
        for day in range(30):
            date = base_date - timedelta(days=day)
            
            metric, created = CampaignMetric.objects.get_or_create(
                campaign=campaign,
                date=date,
                defaults={
                    'revenue': Decimal(str(random.uniform(1000, 5000))),
                    'cost': Decimal(str(random.uniform(500, 2000))),
                    'impressions': random.randint(10000, 50000),
                    'clicks': random.randint(100, 1000),
                    'conversions': random.randint(10, 100),
                    'roi': Decimal(str(random.uniform(0.5, 2.0))),
                    'ctr': Decimal(str(random.uniform(0.01, 0.1))),
                    'conversion_rate': Decimal(str(random.uniform(0.01, 0.2))),
                    'cpm': Decimal(str(random.uniform(5, 20))),
                    'cpc': Decimal(str(random.uniform(0.5, 5))),
                    'cpa': Decimal(str(random.uniform(10, 100))),
                }
            )
    
    print(f"✅ Created KPI data for {len(campaigns)} campaigns x 30 days")
    
    # 6. Create some retrospective tasks
    for i, campaign in enumerate(campaigns[:3]):  # Only first 3 campaigns
        retrospective, created = RetrospectiveTask.objects.get_or_create(
            campaign=campaign,
            created_by=test_users[0],
            defaults={
                'status': RetrospectiveStatus.COMPLETED if i < 2 else RetrospectiveStatus.SCHEDULED,
                'scheduled_at': datetime.now() - timedelta(days=i),
                'report_url': f"https://example.com/report{i}.pdf" if i < 2 else None
            }
        )
        if created:
            print(f"✅ Created retrospective for {campaign.name}")
    
    print("\n🎉 Test data creation completed!")
    print("\n📋 Summary:")
    print(f"   • Organization: {org.name}")
    print(f"   • Users: {len(test_users)}")
    print(f"   • Campaigns: {len(campaigns)}")
    print(f"   • KPI records: {CampaignMetric.objects.count()}")
    print(f"   • Retrospectives: {RetrospectiveTask.objects.count()}")
    print("\n🔐 Test user credentials:")
    for username, password, _ in user_data:
        print(f"   • {username}: {password}")

def cleanup_test_data():
    """Clean up test data"""
    print("🧹 Cleaning up test data...")
    
    # Delete in reverse dependency order
    CampaignMetric.objects.filter(campaign__project__organization__name="Load Test Organization").delete()
    RetrospectiveTask.objects.filter(campaign__project__organization__name="Load Test Organization").delete()
    Campaign.objects.filter(project__organization__name="Load Test Organization").delete()
    Project.objects.filter(organization__name="Load Test Organization").delete()
    Organization.objects.filter(name="Load Test Organization").delete()
    
    # Delete test users
    User.objects.filter(username__in=["testuser", "analyst1", "analyst2", "teamlead", "admin"]).delete()
    
    print("✅ Test data cleanup completed!")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup test data for load testing")
    parser.add_argument("--cleanup", action="store_true", help="Clean up test data instead of creating")
    args = parser.parse_args()
    
    if args.cleanup:
        cleanup_test_data()
    else:
        create_test_data()

