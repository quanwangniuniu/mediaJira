"""
Simple pytest configuration for reports testing
"""
import pytest
import json
import random
from datetime import datetime, timedelta
from django.test import TestCase
from core.models import CustomUser
from reports.models import ReportTemplate, Report, ReportSection


@pytest.fixture
def test_user():
    """Create a test user"""
    return CustomUser.objects.create_user(
        email="test@example.com",
        password="testpass"
    )


@pytest.fixture
def test_template():
    """Create a simple test template"""
    return ReportTemplate.objects.create(
        id="test_template",
        name="Test Template",
        version=1,
        is_default=False,
        blocks=[
            {"type": "header", "content": "Test Report"},
            {"type": "table", "title": "Data Table"}
        ],
        variables={"total_records": 0}
    )


@pytest.fixture
def random_test_data():
    """Generate random test data"""
    campaigns = ["Campaign A", "Campaign B", "Campaign C"]
    channels = ["Google Ads", "Facebook Ads", "LinkedIn Ads", "Twitter Ads"]
    data = []
    
    for i in range(50):
        # 40% empty slices, 60% non-empty
        is_empty = random.random() < 0.4
        
        if is_empty:
            data.append({
                "campaign": random.choice(campaigns),
                "channel": random.choice(channels),
                "date": (datetime.now() - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d"),
                "cost": 0.0,
                "revenue": 0.0,
                "leads": 0,
                "conversions": 0
            })
        else:
            cost = random.uniform(100, 2000)
            revenue = cost * random.uniform(1.5, 3.0)
            leads = random.randint(10, 100)
            conversions = random.randint(5, 50)
            
            data.append({
                "campaign": random.choice(campaigns),
                "channel": random.choice(channels),
                "date": (datetime.now() - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d"),
                "cost": round(cost, 2),
                "revenue": round(revenue, 2),
                "leads": leads,
                "conversions": conversions
            })
    
    return data