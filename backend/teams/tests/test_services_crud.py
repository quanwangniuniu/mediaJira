import pytest
from django.core.exceptions import ValidationError
from teams.models import Team
from teams.services import create_team, update_team, delete_team
from django.test import TestCase

class TestTeamCRUD(TestCase):
    def test_create_team_success(self):
        from teams.services import create_team
        team = create_team(name="Alpha", organization_id=1, desc="desc")
        self.assertIsNotNone(team.id)
        self.assertEqual(team.name, "Alpha")
        self.assertEqual(team.organization_id, 1)
        self.assertEqual(team.desc, "desc")

    def test_create_team_with_parent(self):
        from teams.services import create_team
        parent = create_team(name="Parent", organization_id=1)
        child = create_team(name="Child", organization_id=1, parent_team_id=parent.id)
        self.assertEqual(child.parent_team_id, parent.id)

    def test_update_team_success(self):
        from teams.services import create_team, update_team
        team = create_team(name="Beta", organization_id=2)
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
        team = create_team(name="Gamma", organization_id=3)
        self.assertTrue(delete_team(team.id))
        with self.assertRaises(ValidationError):
            delete_team(team.id)

