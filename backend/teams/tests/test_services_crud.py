from django.core.exceptions import ValidationError
from core.models import Team, Organization
from teams.services import create_team, update_team, delete_team
from django.test import TestCase

class TestTeamCRUD(TestCase):
    def setUp(self):
        """Set up test data"""
        self.org = Organization.objects.create(name="Test Organization")
    
    def test_create_team_success(self):
        from teams.services import create_team
        team = create_team(name="Alpha", organization_id=self.org.id, desc="desc")
        self.assertIsNotNone(team.id)
        self.assertEqual(team.name, "Alpha")
        self.assertEqual(team.organization.id, self.org.id)
        self.assertEqual(team.desc, "desc")

    def test_create_team_with_parent(self):
        from teams.services import create_team
        parent = create_team(name="Parent", organization_id=self.org.id)
        child = create_team(name="Child", organization_id=self.org.id, parent_team_id=parent.id)
        self.assertEqual(child.parent.id, parent.id)

    def test_update_team_success(self):
        from teams.services import create_team, update_team
        team = create_team(name="Beta", organization_id=self.org.id)
        updated = update_team(team.id, name="Beta2", desc="newdesc")
        self.assertEqual(updated.name, "Beta2")
        self.assertEqual(updated.desc, "newdesc")

    def test_update_team_not_found(self):
        from teams.services import update_team
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            update_team(9999, name="X")

    def test_delete_team_success(self):
        from teams.services import create_team, delete_team
        from django.core.exceptions import ValidationError
        team = create_team(name="Gamma", organization_id=self.org.id)
        self.assertTrue(delete_team(team.id))
        with self.assertRaises(ValidationError):
            delete_team(team.id)

