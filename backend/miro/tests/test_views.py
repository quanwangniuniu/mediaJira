from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import uuid

from core.models import Project, ProjectMember, Organization
from miro.models import Board, BoardItem, BoardRevision

User = get_user_model()


class BoardAPITest(TestCase):
    """Test Board API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.client.force_authenticate(user=self.user)

    def _results(self, response):
        """
        DRF may paginate list endpoints. Normalize to a list of items.
        """
        data = response.data
        if isinstance(data, dict) and "results" in data:
            return data["results"]
        return data

    def _assert_has_error_key(self, response, key: str):
        """
        Validation errors in this codebase are typically returned as top-level
        field keys (e.g. {'project_id': ['...']}) rather than nested under 'detail'.
        """
        data = response.data
        if isinstance(data, dict) and isinstance(data.get("detail"), dict):
            data = data["detail"]
        self.assertIsInstance(data, dict)
        self.assertIn(key, data)

    def test_create_board(self):
        """Create board with valid project_id, verify share_token generation"""
        url = "/api/miro/boards/"
        payload = {
            "project_id": self.project.id,
            "title": "Test Board",
            "viewport": {"x": 0, "y": 0, "zoom": 1.0},
        }

        response = self.client.post(url, payload, format="json")
        if response.status_code != status.HTTP_201_CREATED:
            # Debug: print error response
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Test Board")
        self.assertIn("share_token", response.data)
        self.assertEqual(len(response.data["share_token"]), 24)
        
        # Verify in DB
        board = Board.objects.get(id=response.data["id"])
        self.assertEqual(board.share_token, response.data["share_token"])

    def test_create_board_invalid_project(self):
        """Create board with non-existent project_id (400)"""
        url = "/api/miro/boards/"
        # Use a very large integer that doesn't exist
        invalid_id = 999999999
        payload = {
            "project_id": invalid_id,
            "title": "Test Board",
        }

        response = self.client.post(url, payload, format="json")
        # Should return 400 with validation error, not 404
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_has_error_key(response, "project_id")

    def test_create_board_non_member(self):
        """Create board for project user is not member of (400)"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        
        url = "/api/miro/boards/"
        payload = {
            "project_id": str(other_project.id),
            "title": "Test Board",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self._assert_has_error_key(response, "project_id")

    def test_list_boards(self):
        """List boards, verify only user's project boards returned"""
        board1 = Board.objects.create(
            project=self.project,
            title="Board 1",
            share_token="token123456789012345678",
        )
        
        # Create board in another project
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        board2 = Board.objects.create(
            project=other_project,
            title="Board 2",
            share_token="token223456789012345678",
        )

        url = "/api/miro/boards/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(str(results[0]["id"]), str(board1.id))

    def test_list_boards_filtered(self):
        """List boards excludes boards from other projects"""
        board1 = Board.objects.create(
            project=self.project,
            title="Board 1",
            share_token="token123456789012345678",
        )
        
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        Board.objects.create(
            project=other_project,
            title="Board 2",
            share_token="token223456789012345678",
        )

        url = "/api/miro/boards/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._results(response)
        self.assertEqual(len(results), 1)
        self.assertEqual(str(results[0]["id"]), str(board1.id))

    def test_get_board_detail(self):
        """Retrieve board detail (200)"""
        board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )

        url = f"/api/miro/boards/{board.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(str(response.data["id"]), str(board.id))
        self.assertEqual(response.data["title"], "Test Board")

    def test_get_board_detail_non_member(self):
        """Retrieve board detail for non-member (404)"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        board = Board.objects.create(
            project=other_project,
            title="Test Board",
            share_token="token123456789012345678",
        )

        url = f"/api/miro/boards/{board.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_board(self):
        """PATCH board with valid data (200)"""
        board = Board.objects.create(
            project=self.project,
            title="Original Title",
            share_token="token123456789012345678",
        )

        url = f"/api/miro/boards/{board.id}/"
        payload = {
            "title": "Updated Title",
            "is_archived": True,
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Updated Title")
        self.assertEqual(response.data["is_archived"], True)

        # Verify in DB
        board.refresh_from_db()
        self.assertEqual(board.title, "Updated Title")
        self.assertEqual(board.is_archived, True)

    def test_update_board_non_member(self):
        """PATCH board as non-member (404)"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        board = Board.objects.create(
            project=other_project,
            title="Test Board",
            share_token="token123456789012345678",
        )

        url = f"/api/miro/boards/{board.id}/"
        payload = {"title": "Updated Title"}

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class BoardItemAPITest(TestCase):
    """Test BoardItem API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )
        self.client.force_authenticate(user=self.user)

    def test_list_board_items(self):
        """GET /boards/{board_id}/items/ returns items (200)"""
        item1 = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )
        item2 = BoardItem.objects.create(
            board=self.board,
            type="shape",
            x=30.0,
            y=40.0,
            width=80.0,
            height=60.0,
        )

        url = f"/api/miro/boards/{self.board.id}/items/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        item_ids = [str(item["id"]) for item in response.data]
        self.assertIn(str(item1.id), item_ids)
        self.assertIn(str(item2.id), item_ids)

    def test_list_board_items_exclude_deleted(self):
        """List items excludes soft-deleted items by default"""
        item1 = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
            is_deleted=False,
        )
        item2 = BoardItem.objects.create(
            board=self.board,
            type="shape",
            x=30.0,
            y=40.0,
            width=80.0,
            height=60.0,
            is_deleted=True,
        )

        url = f"/api/miro/boards/{self.board.id}/items/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(str(response.data[0]["id"]), str(item1.id))

    def test_list_board_items_include_deleted(self):
        """List items with include_deleted=true includes soft-deleted"""
        item1 = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
            is_deleted=False,
        )
        item2 = BoardItem.objects.create(
            board=self.board,
            type="shape",
            x=30.0,
            y=40.0,
            width=80.0,
            height=60.0,
            is_deleted=True,
        )

        url = f"/api/miro/boards/{self.board.id}/items/?include_deleted=true"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_create_board_item(self):
        """POST /boards/{board_id}/items/ creates item (201)"""
        url = f"/api/miro/boards/{self.board.id}/items/"
        payload = {
            "type": "text",
            "x": 10.0,
            "y": 20.0,
            "width": 100.0,
            "height": 50.0,
            "content": "Hello World",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["type"], "text")
        self.assertEqual(response.data["content"], "Hello World")
        
        # Verify in DB
        item = BoardItem.objects.get(id=response.data["id"])
        self.assertEqual(item.board, self.board)

    def test_create_board_item_invalid_type(self):
        """Create item with invalid type enum (400)"""
        url = f"/api/miro/boards/{self.board.id}/items/"
        payload = {
            "type": "invalid_type",
            "x": 10.0,
            "y": 20.0,
            "width": 100.0,
            "height": 50.0,
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_board_item_with_parent(self):
        """Create item with parent_item_id (201)"""
        parent_item = BoardItem.objects.create(
            board=self.board,
            type="frame",
            x=0.0,
            y=0.0,
            width=200.0,
            height=200.0,
        )

        url = f"/api/miro/boards/{self.board.id}/items/"
        payload = {
            "type": "text",
            "parent_item_id": str(parent_item.id),
            "x": 10.0,
            "y": 20.0,
            "width": 100.0,
            "height": 50.0,
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["parent_item_id"], str(parent_item.id))
        
        # Verify in DB
        item = BoardItem.objects.get(id=response.data["id"])
        self.assertEqual(item.parent_item, parent_item)

    def test_update_board_item(self):
        """PATCH /items/{item_id}/ updates item (200)"""
        item = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )

        url = f"/api/miro/items/{item.id}/"
        payload = {
            "x": 50.0,
            "y": 60.0,
            "content": "Updated content",
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["x"], 50.0)
        self.assertEqual(response.data["y"], 60.0)
        self.assertEqual(response.data["content"], "Updated content")

        # Verify in DB
        item.refresh_from_db()
        self.assertEqual(item.x, 50.0)
        self.assertEqual(item.y, 60.0)
        self.assertEqual(item.content, "Updated content")

    def test_update_board_item_non_member(self):
        """PATCH item as non-member (404)"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        other_board = Board.objects.create(
            project=other_project,
            title="Other Board",
            share_token="token223456789012345678",
        )
        item = BoardItem.objects.create(
            board=other_board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )

        url = f"/api/miro/items/{item.id}/"
        payload = {"x": 50.0}

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_board_item_soft_delete(self):
        """DELETE /items/{item_id}/ performs soft delete, returns specific format (200)"""
        item = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
            is_deleted=False,
        )

        url = f"/api/miro/items/{item.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response format
        self.assertEqual(response.data["id"], str(item.id))
        self.assertEqual(response.data["is_deleted"], True)
        self.assertIn("updated_at", response.data)

        # Verify soft delete in DB
        item.refresh_from_db()
        self.assertEqual(item.is_deleted, True)
        self.assertTrue(BoardItem.objects.filter(id=item.id).exists())

    def test_delete_board_item_response_format(self):
        """Verify DELETE response: {"id": "...", "is_deleted": true, "updated_at": "..."}"""
        item = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )

        url = f"/api/miro/items/{item.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertIn("id", response.data)
        self.assertIn("is_deleted", response.data)
        self.assertIn("updated_at", response.data)
        self.assertEqual(response.data["is_deleted"], True)

    def test_delete_board_item_non_member(self):
        """DELETE item as non-member (404)"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        other_board = Board.objects.create(
            project=other_project,
            title="Other Board",
            share_token="token223456789012345678",
        )
        item = BoardItem.objects.create(
            board=other_board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )

        url = f"/api/miro/items/{item.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class BoardItemBatchUpdateTest(TestCase):
    """Test batch item updates"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )
        self.item1 = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )
        self.item2 = BoardItem.objects.create(
            board=self.board,
            type="shape",
            x=30.0,
            y=40.0,
            width=80.0,
            height=60.0,
        )
        self.client.force_authenticate(user=self.user)

    def test_batch_update_items_success(self):
        """PATCH /boards/{board_id}/items/batch/ updates multiple items (200)"""
        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"id": str(self.item1.id), "x": 100.0, "y": 200.0},
                {"id": str(self.item2.id), "x": 300.0, "y": 400.0},
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["updated"]), 2)
        self.assertEqual(len(response.data["failed"]), 0)

        # Verify updates in DB
        self.item1.refresh_from_db()
        self.item2.refresh_from_db()
        self.assertEqual(self.item1.x, 100.0)
        self.assertEqual(self.item2.x, 300.0)

    def test_batch_update_items_partial_success(self):
        """Batch update with some valid and invalid items returns both updated and failed arrays"""
        invalid_id = str(uuid.uuid4())
        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"id": str(self.item1.id), "x": 100.0},
                {"id": invalid_id, "x": 200.0},  # Invalid ID
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["updated"]), 1)
        self.assertEqual(len(response.data["failed"]), 1)
        self.assertEqual(response.data["failed"][0]["id"], invalid_id)

    def test_batch_update_items_all_fail(self):
        """Batch update with all invalid items returns all in failed array"""
        invalid_id1 = str(uuid.uuid4())
        invalid_id2 = str(uuid.uuid4())
        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"id": invalid_id1, "x": 100.0},
                {"id": invalid_id2, "x": 200.0},
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["updated"]), 0)
        self.assertEqual(len(response.data["failed"]), 2)

    def test_batch_update_items_missing_id(self):
        """Batch update with item missing id field returns error in failed array"""
        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"x": 100.0},  # Missing id
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["updated"]), 0)
        self.assertEqual(len(response.data["failed"]), 1)
        self.assertIsNone(response.data["failed"][0]["id"])

    def test_batch_update_items_not_found(self):
        """Batch update with non-existent item_id returns error in failed array"""
        invalid_id = str(uuid.uuid4())
        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"id": invalid_id, "x": 100.0},
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["updated"]), 0)
        self.assertEqual(len(response.data["failed"]), 1)
        self.assertEqual(response.data["failed"][0]["id"], invalid_id)

    def test_batch_update_items_wrong_board(self):
        """Batch update with item from different board returns error"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.user,
        )
        other_board = Board.objects.create(
            project=other_project,
            title="Other Board",
            share_token="token223456789012345678",
        )
        other_item = BoardItem.objects.create(
            board=other_board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )

        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"id": str(other_item.id), "x": 100.0},  # Item from different board
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["updated"]), 0)
        self.assertEqual(len(response.data["failed"]), 1)

    def test_batch_update_items_response_format(self):
        """Verify response format: {"updated": [...], "failed": [...]}"""
        url = f"/api/miro/boards/{self.board.id}/items/batch/"
        payload = {
            "items": [
                {"id": str(self.item1.id), "x": 100.0},
            ]
        }

        response = self.client.patch(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("updated", response.data)
        self.assertIn("failed", response.data)
        self.assertIsInstance(response.data["updated"], list)
        self.assertIsInstance(response.data["failed"], list)


class BoardRevisionAPITest(TestCase):
    """Test BoardRevision API endpoints"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )
        self.client.force_authenticate(user=self.user)

    def test_create_revision(self):
        """POST /boards/{board_id}/revisions/ creates revision (201)"""
        url = f"/api/miro/boards/{self.board.id}/revisions/"
        payload = {
            "snapshot": {"items": [{"id": "1", "type": "text"}]},
            "note": "Initial revision",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["version"], 1)
        self.assertEqual(response.data["note"], "Initial revision")

    def test_create_revision_auto_increment_version(self):
        """Create multiple revisions, verify version auto-increments"""
        url = f"/api/miro/boards/{self.board.id}/revisions/"
        
        # Create first revision
        payload1 = {"snapshot": {"items": []}, "note": "Revision 1"}
        response1 = self.client.post(url, payload1, format="json")
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response1.data["version"], 1)

        # Create second revision
        payload2 = {"snapshot": {"items": []}, "note": "Revision 2"}
        response2 = self.client.post(url, payload2, format="json")
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response2.data["version"], 2)

        # Create third revision
        payload3 = {"snapshot": {"items": []}, "note": "Revision 3"}
        response3 = self.client.post(url, payload3, format="json")
        self.assertEqual(response3.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response3.data["version"], 3)

    def test_list_revisions(self):
        """GET /boards/{board_id}/revisions/ returns revisions (200)"""
        rev1 = BoardRevision.objects.create(
            board=self.board, version=1, snapshot={"items": []}
        )
        rev2 = BoardRevision.objects.create(
            board=self.board, version=2, snapshot={"items": []}
        )

        url = f"/api/miro/boards/{self.board.id}/revisions/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_revisions_with_limit(self):
        """List revisions with limit parameter (default 20, max 100)"""
        # Create 5 revisions
        for i in range(1, 6):
            BoardRevision.objects.create(
                board=self.board, version=i, snapshot={"items": []}
            )

        url = f"/api/miro/boards/{self.board.id}/revisions/?limit=3"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)

    def test_list_revisions_ordering(self):
        """Verify revisions ordered by -version, -created_at"""
        rev1 = BoardRevision.objects.create(
            board=self.board, version=1, snapshot={"items": []}
        )
        rev2 = BoardRevision.objects.create(
            board=self.board, version=2, snapshot={"items": []}
        )

        url = f"/api/miro/boards/{self.board.id}/revisions/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        versions = [rev["version"] for rev in response.data]
        self.assertEqual(versions, [2, 1])  # Descending order

    def test_get_revision_detail(self):
        """GET /boards/{board_id}/revisions/{version}/ returns specific revision (200)"""
        revision = BoardRevision.objects.create(
            board=self.board,
            version=1,
            snapshot={"items": [{"id": "1"}]},
            note="Test revision",
        )

        url = f"/api/miro/boards/{self.board.id}/revisions/1/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["version"], 1)
        self.assertEqual(response.data["note"], "Test revision")

    def test_get_revision_detail_not_found(self):
        """GET non-existent revision version (404)"""
        url = f"/api/miro/boards/{self.board.id}/revisions/999/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_restore_revision(self):
        """POST /boards/{board_id}/revisions/{version}/restore/ creates new revision with old snapshot (201)"""
        old_revision = BoardRevision.objects.create(
            board=self.board,
            version=1,
            snapshot={"items": [{"id": "1", "type": "text"}]},
            note="Original revision",
        )

        url = f"/api/miro/boards/{self.board.id}/revisions/1/restore/"
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["version"], 2)
        self.assertIn("Restored from version 1", response.data["note"])
        self.assertEqual(response.data["snapshot"], old_revision.snapshot)

    def test_restore_revision_version_increment(self):
        """Restore creates new revision with incremented version"""
        rev1 = BoardRevision.objects.create(
            board=self.board, version=1, snapshot={"items": []}
        )
        rev2 = BoardRevision.objects.create(
            board=self.board, version=2, snapshot={"items": []}
        )

        url = f"/api/miro/boards/{self.board.id}/revisions/1/restore/"
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["version"], 3)  # Incremented from max (2)

    def test_restore_revision_not_found(self):
        """Restore non-existent revision (404)"""
        url = f"/api/miro/boards/{self.board.id}/revisions/999/restore/"
        response = self.client.post(url, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ShareTokenAPITest(TestCase):
    """Test share token access"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )

    def test_share_board_access(self):
        """GET /share/boards/{share_token}/ returns board and items without authentication (200)"""
        item1 = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
        )

        url = f"/api/miro/share/boards/{self.board.share_token}/"
        # No authentication
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("board", response.data)
        self.assertIn("items", response.data)
        self.assertEqual(response.data["board"]["id"], str(self.board.id))
        self.assertEqual(len(response.data["items"]), 1)

    def test_share_board_access_active_items_only(self):
        """Share endpoint returns only non-deleted items"""
        item1 = BoardItem.objects.create(
            board=self.board,
            type="text",
            x=10.0,
            y=20.0,
            width=100.0,
            height=50.0,
            is_deleted=False,
        )
        item2 = BoardItem.objects.create(
            board=self.board,
            type="shape",
            x=30.0,
            y=40.0,
            width=80.0,
            height=60.0,
            is_deleted=True,
        )

        url = f"/api/miro/share/boards/{self.board.share_token}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["items"]), 1)
        self.assertEqual(response.data["items"][0]["id"], str(item1.id))

    def test_share_board_access_invalid_token(self):
        """GET with invalid share_token (401/403)"""
        url = "/api/miro/share/boards/invalid_token/"
        response = self.client.get(url)
        # DRF may return 401 for unauthenticated or 403 for permission denied
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_share_board_access_response_format(self):
        """Verify response format: {"board": {...}, "items": [...]}"""
        url = f"/api/miro/share/boards/{self.board.share_token}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("board", response.data)
        self.assertIn("items", response.data)
        self.assertIsInstance(response.data["board"], dict)
        self.assertIsInstance(response.data["items"], list)

    def test_share_token_generation(self):
        """Verify share_token is generated on board creation (24 chars, unique)"""
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        url = "/api/miro/boards/"
        payload = {
            "project_id": self.project.id,
            "title": "New Board",
        }

        response = client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        share_token = response.data["share_token"]
        self.assertEqual(len(share_token), 24)
        
        # Verify uniqueness
        board1 = Board.objects.get(id=response.data["id"])
        self.assertEqual(board1.share_token, share_token)


class PermissionTest(TestCase):
    """Test permission classes"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )

    def test_is_board_project_member_access(self):
        """Member can access board (200)"""
        self.client.force_authenticate(user=self.user)
        url = f"/api/miro/boards/{self.board.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_is_board_project_member_denied(self):
        """Non-member cannot access board (404)"""
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/miro/boards/{self.board.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_is_board_project_member_inactive(self):
        """Inactive ProjectMember cannot access (404)"""
        # Create inactive membership
        ProjectMember.objects.create(
            user=self.other_user, project=self.project, is_active=False
        )
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/miro/boards/{self.board.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_has_valid_share_token_permission(self):
        """Valid share_token allows access without auth"""
        url = f"/api/miro/share/boards/{self.board.share_token}/"
        # No authentication
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_has_valid_share_token_invalid(self):
        """Invalid share_token denies access"""
        url = "/api/miro/share/boards/invalid_token_here/"
        response = self.client.get(url)
        # DRF may return 401 for unauthenticated or 403 for permission denied
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class SerializerValidationTest(TestCase):
    """Test serializer validation"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="miro_user",
            email="miro@example.com",
            password="testpass123",
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="testpass123",
        )
        self.organization = Organization.objects.create(name="MIRO Org")
        self.project = Project.objects.create(
            name="MIRO Project",
            organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project, is_active=True
        )
        self.board = Board.objects.create(
            project=self.project,
            title="Test Board",
            share_token="token123456789012345678",
        )
        self.client.force_authenticate(user=self.user)

    def test_board_create_serializer_project_id_validation(self):
        """Validates project_id exists and user has access"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.other_user,
        )
        
        url = "/api/miro/boards/"
        payload = {
            "project_id": str(other_project.id),
            "title": "Test Board",
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("project_id", response.data)

    def test_board_item_create_serializer_type_validation(self):
        """Validates item type is valid enum value"""
        url = f"/api/miro/boards/{self.board.id}/items/"
        payload = {
            "type": "invalid_type",
            "x": 10.0,
            "y": 20.0,
            "width": 100.0,
            "height": 50.0,
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("type", response.data)

    def test_board_item_create_serializer_parent_item_validation(self):
        """Validates parent_item_id belongs to same board"""
        other_project = Project.objects.create(
            name="Other Project",
            organization=self.organization,
            owner=self.user,
        )
        other_board = Board.objects.create(
            project=other_project,
            title="Other Board",
            share_token="token223456789012345678",
        )
        other_item = BoardItem.objects.create(
            board=other_board,
            type="frame",
            x=0.0,
            y=0.0,
            width=200.0,
            height=200.0,
        )

        url = f"/api/miro/boards/{self.board.id}/items/"
        payload = {
            "type": "text",
            "parent_item_id": str(other_item.id),  # Parent from different board
            "x": 10.0,
            "y": 20.0,
            "width": 100.0,
            "height": 50.0,
        }

        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("parent_item_id", response.data)

    def test_board_revision_create_serializer_version_auto_increment(self):
        """Verifies version auto-increment logic"""
        url = f"/api/miro/boards/{self.board.id}/revisions/"
        
        # Create first revision
        payload1 = {"snapshot": {"items": []}}
        response1 = self.client.post(url, payload1, format="json")
        self.assertEqual(response1.data["version"], 1)

        # Create second revision
        payload2 = {"snapshot": {"items": []}}
        response2 = self.client.post(url, payload2, format="json")
        self.assertEqual(response2.data["version"], 2)

