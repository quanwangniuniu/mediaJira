#!/usr/bin/env python
"""
Quick test script to verify teams migration fixes
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import Organization, Team, TeamMember, TeamRole, CustomUser
from teams.services import is_same_organization, create_team, add_member

def test_is_same_organization():
    """Test the is_same_organization function"""
    print("Testing is_same_organization function...")
    
    # Create test data
    org1 = Organization.objects.create(name="Test Org 1")
    org2 = Organization.objects.create(name="Test Org 2")
    
    user1 = CustomUser.objects.create_user(
        username="user1",
        email="user1@test.com",
        password="testpass123",
        organization=org1
    )
    
    user2 = CustomUser.objects.create_user(
        username="user2", 
        email="user2@test.com",
        password="testpass123",
        organization=org2
    )
    
    team1 = create_team("Team 1", org1.id)
    team2 = create_team("Team 2", org2.id)
    
    # Test same organization
    result1 = is_same_organization(user1.id, team1.id)
    print(f"User1 in Team1 (same org): {result1}")
    
    # Test different organization
    result2 = is_same_organization(user1.id, team2.id)
    print(f"User1 in Team2 (different org): {result2}")
    
    # Clean up
    team1.delete()
    team2.delete()
    user1.delete()
    user2.delete()
    org1.delete()
    org2.delete()
    
    print("✓ is_same_organization test completed")

def test_team_creation():
    """Test team creation with core models"""
    print("\nTesting team creation...")
    
    org = Organization.objects.create(name="Test Organization")
    team = create_team("Test Team", org.id, "Test description")
    
    print(f"✓ Created team: {team.name} in {team.organization.name}")
    
    # Clean up
    team.delete()
    org.delete()
    
    print("✓ Team creation test completed")

if __name__ == "__main__":
    try:
        test_team_creation()
        test_is_same_organization()
        print("\n🎉 All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1) 