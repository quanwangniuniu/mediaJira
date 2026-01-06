from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from task.models import Task, TaskRelation
from core.models import Organization, Project, ProjectMember

User = get_user_model()


class TaskRelationAPITest(APITestCase):
    """Tests for task relations API (/api/tasks/<task_id>/relations/)."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="user@example.com",
            username="user",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            username="other",
            password="testpass123",
        )

        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
        )

        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role="owner",
            is_active=True,
        )

        self.user.active_project = self.project
        self.user.save(update_fields=["active_project"])

        self.task1 = Task.objects.create(
            summary="Task 1",
            type="asset",
            project=self.project,
            owner=self.user,
        )

        self.task2 = Task.objects.create(
            summary="Task 2",
            type="asset",
            project=self.project,
            owner=self.user,
        )

        self.task3 = Task.objects.create(
            summary="Task 3",
            type="asset",
            project=self.project,
            owner=self.user,
        )

        # Authenticate as project member by default
        self.client.force_authenticate(user=self.user)

    def _get_relations_url(self, task_id):
        return reverse("task-relations", kwargs={"pk": task_id})

    def _get_relation_detail_url(self, task_id, relation_id):
        return reverse("task-relation-detail", kwargs={"pk": task_id, "relation_id": relation_id})

    def test_list_relations_success(self):
        """Authenticated project member can list relations of a task."""
        # Create some relations
        TaskRelation.objects.create(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        )
        TaskRelation.objects.create(
            source_task=self.task3,
            target_task=self.task1,
            relationship_type=TaskRelation.BLOCKS
        )

        url = self._get_relations_url(self.task1.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("causes", response.data)
        self.assertIn("is_caused_by", response.data)
        self.assertIn("blocks", response.data)
        self.assertIn("is_blocked_by", response.data)
        self.assertIn("clones", response.data)
        self.assertIn("is_cloned_by", response.data)
        self.assertIn("relates_to", response.data)
        
        # Check that task2 is in causes (task1 causes task2)
        causes_ids = [t["task"]["id"] for t in response.data["causes"]]
        self.assertIn(self.task2.id, causes_ids)
        
        # Check that task3 is in is_blocked_by (task3 blocks task1)
        is_blocked_by_ids = [t["task"]["id"] for t in response.data["is_blocked_by"]]
        self.assertIn(self.task3.id, is_blocked_by_ids)

    def test_list_relations_empty(self):
        """Listing relations for task with no relations returns empty arrays."""
        url = self._get_relations_url(self.task1.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["causes"]), 0)
        self.assertEqual(len(response.data["is_caused_by"]), 0)
        self.assertEqual(len(response.data["blocks"]), 0)
        self.assertEqual(len(response.data["is_blocked_by"]), 0)
        self.assertEqual(len(response.data["clones"]), 0)
        self.assertEqual(len(response.data["is_cloned_by"]), 0)
        self.assertEqual(len(response.data["relates_to"]), 0)

    def test_add_relation_causes_success(self):
        """Authenticated project member can add a 'causes' relation."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "causes"
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["source_task_id"], self.task1.id)
        self.assertEqual(response.data["target_task_id"], self.task2.id)
        self.assertEqual(response.data["relationship_type"], "causes")
        
        # Verify relation was created
        self.assertTrue(
            TaskRelation.objects.filter(
                source_task=self.task1,
                target_task=self.task2,
                relationship_type=TaskRelation.CAUSES
            ).exists()
        )

    def test_add_relation_blocks_success(self):
        """Authenticated project member can add a 'blocks' relation."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "blocks"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_relation_clones_success(self):
        """Authenticated project member can add a 'clones' relation."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "clones"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_relation_relates_to_success(self):
        """Authenticated project member can add a 'relates_to' relation."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "relates_to"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_add_relation_requires_authentication(self):
        """Unauthenticated requests cannot add relations."""
        self.client.force_authenticate(user=None)

        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "causes"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_add_relation_requires_project_membership(self):
        """Non-project member cannot add relations."""
        self.client.force_authenticate(user=self.other_user)

        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "causes"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_add_relation_invalid_target_task_id(self):
        """Adding relation with invalid target_task_id returns 404."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": 999999,
            "relationship_type": "causes"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_add_relation_invalid_relationship_type(self):
        """Adding relation with invalid relationship_type returns 400."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "invalid_type"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_relation_missing_fields(self):
        """Adding relation with missing required fields returns 400."""
        url = self._get_relations_url(self.task1.id)
        
        # Missing target_task_id
        data = {"relationship_type": "causes"}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing relationship_type
        data = {"target_task_id": self.task2.id}
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_add_relation_self_reference(self):
        """Adding relation to self should fail."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task1.id,
            "relationship_type": "causes"
        }

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_add_relation_duplicate(self):
        """Adding duplicate relation should not create duplicate (get_or_create behavior)."""
        url = self._get_relations_url(self.task1.id)
        data = {
            "target_task_id": self.task2.id,
            "relationship_type": "causes"
        }

        # Add first time
        response1 = self.client.post(url, data, format="json")
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        
        # Add second time (should succeed but not create duplicate)
        response2 = self.client.post(url, data, format="json")
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        
        # Verify only one relation exists
        count = TaskRelation.objects.filter(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        ).count()
        self.assertEqual(count, 1)

    def test_delete_relation_success(self):
        """Authenticated project member can delete a relation."""
        # Create relation
        relation = TaskRelation.objects.create(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        )

        url = self._get_relation_detail_url(self.task1.id, relation.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify relation was deleted
        self.assertFalse(
            TaskRelation.objects.filter(id=relation.id).exists()
        )

    def test_delete_relation_from_target_task_perspective(self):
        """Can delete relation when accessing from target task's perspective."""
        # Create relation: task1 causes task2
        relation = TaskRelation.objects.create(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        )

        # Delete from task2's perspective
        url = self._get_relation_detail_url(self.task2.id, relation.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_delete_relation_requires_authentication(self):
        """Unauthenticated requests cannot delete relations."""
        relation = TaskRelation.objects.create(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        )

        self.client.force_authenticate(user=None)
        url = self._get_relation_detail_url(self.task1.id, relation.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_relation_requires_project_membership(self):
        """Non-project member cannot delete relations."""
        relation = TaskRelation.objects.create(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        )

        self.client.force_authenticate(user=self.other_user)
        url = self._get_relation_detail_url(self.task1.id, relation.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_relation_not_belonging_to_task(self):
        """Deleting relation that doesn't belong to task returns 403."""
        # Create relation between task2 and task3
        relation = TaskRelation.objects.create(
            source_task=self.task2,
            target_task=self.task3,
            relationship_type=TaskRelation.CAUSES
        )

        # Try to delete from task1's perspective (should fail)
        url = self._get_relation_detail_url(self.task1.id, relation.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_relation_nonexistent(self):
        """Deleting non-existent relation returns 404."""
        url = self._get_relation_detail_url(self.task1.id, 999999)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_relations_bidirectional(self):
        """List relations should show both directions correctly."""
        # Create relation: task1 causes task2
        TaskRelation.objects.create(
            source_task=self.task1,
            target_task=self.task2,
            relationship_type=TaskRelation.CAUSES
        )

        # Check task1's relations
        url1 = self._get_relations_url(self.task1.id)
        response1 = self.client.get(url1)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        causes_ids = [t["task"]["id"] for t in response1.data["causes"]]
        self.assertIn(self.task2.id, causes_ids)
        self.assertEqual(len(response1.data["is_caused_by"]), 0)

        # Check task2's relations
        url2 = self._get_relations_url(self.task2.id)
        response2 = self.client.get(url2)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        is_caused_by_ids = [t["task"]["id"] for t in response2.data["is_caused_by"]]
        self.assertIn(self.task1.id, is_caused_by_ids)
        self.assertEqual(len(response2.data["causes"]), 0)

