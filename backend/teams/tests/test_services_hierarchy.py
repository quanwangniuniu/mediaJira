from teams.services import (
    create_team, get_child_teams, get_parent_team, is_valid_team_hierarchy
)
from core.models import Organization
from django.test import TestCase

class TestTeamHierarchy(TestCase):
    def setUp(self):
        """Set up test data"""
        self.org = Organization.objects.create(name="Test Organization")
    
    def test_get_child_teams(self):
        parent = create_team(name="Parent", organization_id=self.org.id)
        child1 = create_team(name="Child1", organization_id=self.org.id, parent_team_id=parent.id)
        child2 = create_team(name="Child2", organization_id=self.org.id, parent_team_id=parent.id)
        children = get_child_teams(parent.id)
        child_ids = [c.id for c in children]
        self.assertEqual(set(child_ids), {child1.id, child2.id})

    def test_get_parent_team(self):
        parent = create_team(name="Parent2", organization_id=self.org.id)
        child = create_team(name="Child3", organization_id=self.org.id, parent_team_id=parent.id)
        found_parent = get_parent_team(child.id)
        self.assertEqual(found_parent.id, parent.id)
        self.assertIsNone(get_parent_team(parent.id))

    def test_is_valid_team_hierarchy_valid(self):
        parent = create_team(name="P3", organization_id=self.org.id)
        child = create_team(name="C3", organization_id=self.org.id, parent_team_id=parent.id)
        self.assertTrue(is_valid_team_hierarchy(parent.id, child.id))

    def test_is_valid_team_hierarchy_cycle(self):
        t1 = create_team(name="T1", organization_id=self.org.id)
        t2 = create_team(name="T2", organization_id=self.org.id, parent_team_id=t1.id)
        self.assertFalse(is_valid_team_hierarchy(t2.id, t1.id))

