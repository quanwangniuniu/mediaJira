from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from task.models import Task, TaskAttachment
from core.models import Organization, Project, ProjectMember
from django.core.files.uploadedfile import SimpleUploadedFile
import os

User = get_user_model()


class TaskAttachmentAPITest(APITestCase):
    """Tests for task-level attachments API (/api/tasks/<task_id>/attachments/)."""

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
            role="Team Leader",
            is_active=True,
        )

        self.user.active_project = self.project
        self.user.save(update_fields=["active_project"])

        self.task = Task.objects.create(
            summary="Test Task",
            type="asset",
            project=self.project,
            owner=self.user,
        )

        # Authenticate as project member by default
        self.client.force_authenticate(user=self.user)

    def _get_attachments_url(self, task_id):
        return reverse("task-attachment-list", kwargs={"task_id": task_id})

    def _get_attachment_detail_url(self, task_id, attachment_id):
        return reverse("task-attachment-detail", kwargs={"task_id": task_id, "pk": attachment_id})

    def _get_attachment_download_url(self, task_id, attachment_id):
        return reverse("task-attachment-download", kwargs={"task_id": task_id, "pk": attachment_id})

    def _create_test_file(self, filename="test_file.txt", content=b"test file content"):
        """Helper method to create a test file"""
        return SimpleUploadedFile(filename, content, content_type="text/plain")

    def test_create_task_attachment_success(self):
        """Authenticated project member can create an attachment on a task."""
        url = self._get_attachments_url(self.task.id)
        test_file = self._create_test_file()
        data = {"file": test_file}

        response = self.client.post(url, data, format="multipart")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TaskAttachment.objects.count(), 1)

        attachment = TaskAttachment.objects.first()
        self.assertEqual(attachment.task, self.task)
        self.assertEqual(attachment.uploaded_by, self.user)
        self.assertEqual(attachment.original_filename, "test_file.txt")
        self.assertEqual(attachment.file_size, len(b"test file content"))
        self.assertEqual(attachment.scan_status, TaskAttachment.PENDING)
        self.assertIsNotNone(attachment.checksum)

        # Serializer should return nested user object
        self.assertIn("uploaded_by", response.data)
        self.assertEqual(response.data["uploaded_by"]["id"], self.user.id)
        self.assertEqual(response.data["original_filename"], "test_file.txt")

    def test_list_task_attachments_success(self):
        """Authenticated project member can list attachments for a task."""
        # Create two attachments
        file1 = self._create_test_file("file1.txt", b"content 1")
        file2 = self._create_test_file("file2.txt", b"content 2")
        
        attachment1 = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=file1,
            original_filename="file1.txt",
            file_size=len(b"content 1"),
            content_type="text/plain"
        )
        attachment2 = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=file2,
            original_filename="file2.txt",
            file_size=len(b"content 2"),
            content_type="text/plain"
        )

        url = self._get_attachments_url(self.task.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.data
        if isinstance(data, dict) and "results" in data:
            results = data["results"]
        else:
            results = data

        self.assertEqual(len(results), 2)
        filenames = {a["original_filename"] for a in results}
        self.assertIn("file1.txt", filenames)
        self.assertIn("file2.txt", filenames)

    def test_get_task_attachment_detail_success(self):
        """Authenticated project member can get attachment details."""
        test_file = self._create_test_file()
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test_file.txt",
            file_size=len(b"test file content"),
            content_type="text/plain"
        )

        url = self._get_attachment_detail_url(self.task.id, attachment.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], attachment.id)
        self.assertEqual(response.data["original_filename"], "test_file.txt")
        self.assertEqual(response.data["uploaded_by"]["id"], self.user.id)

    def test_delete_task_attachment_success(self):
        """Authenticated project member can delete an attachment."""
        test_file = self._create_test_file()
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test_file.txt",
            file_size=len(b"test file content"),
            content_type="text/plain"
        )

        url = self._get_attachment_detail_url(self.task.id, attachment.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(TaskAttachment.objects.count(), 0)

    def test_download_task_attachment_success(self):
        """Authenticated project member can download an attachment."""
        test_file = self._create_test_file()
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test_file.txt",
            file_size=len(b"test file content"),
            content_type="text/plain"
        )

        url = self._get_attachment_download_url(self.task.id, attachment.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["task_id"], self.task.id)
        self.assertEqual(response.data["attachment_id"], attachment.id)
        self.assertEqual(response.data["file_name"], "test_file.txt")
        self.assertIn("download_url", response.data)

    def test_create_attachment_requires_authentication(self):
        """Unauthenticated requests cannot create attachments."""
        self.client.force_authenticate(user=None)

        url = self._get_attachments_url(self.task.id)
        test_file = self._create_test_file()
        data = {"file": test_file}

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(TaskAttachment.objects.count(), 0)

    def test_list_attachments_requires_authentication(self):
        """Unauthenticated requests cannot list attachments."""
        self.client.force_authenticate(user=None)

        url = self._get_attachments_url(self.task.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_attachment_requires_project_membership_for_create(self):
        """Non-project member cannot create task attachments."""
        self.client.force_authenticate(user=self.other_user)

        url = self._get_attachments_url(self.task.id)
        test_file = self._create_test_file()
        data = {"file": test_file}

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(TaskAttachment.objects.count(), 0)

    def test_attachment_requires_project_membership_for_list(self):
        """Non-project member cannot list task attachments."""
        self.client.force_authenticate(user=self.other_user)

        url = self._get_attachments_url(self.task.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_attachment_requires_project_membership_for_detail(self):
        """Non-project member cannot get attachment details."""
        self.client.force_authenticate(user=self.other_user)

        test_file = self._create_test_file()
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test_file.txt",
            file_size=len(b"test file content"),
            content_type="text/plain"
        )

        url = self._get_attachment_detail_url(self.task.id, attachment.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_attachment_requires_project_membership_for_delete(self):
        """Non-project member cannot delete task attachments."""
        self.client.force_authenticate(user=self.other_user)

        test_file = self._create_test_file()
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test_file.txt",
            file_size=len(b"test file content"),
            content_type="text/plain"
        )

        url = self._get_attachment_detail_url(self.task.id, attachment.id)
        response = self.client.delete(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(TaskAttachment.objects.count(), 1)

    def test_attachment_requires_project_membership_for_download(self):
        """Non-project member cannot download task attachments."""
        self.client.force_authenticate(user=self.other_user)

        test_file = self._create_test_file()
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test_file.txt",
            file_size=len(b"test file content"),
            content_type="text/plain"
        )

        url = self._get_attachment_download_url(self.task.id, attachment.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_attachment_for_nonexistent_task(self):
        """Creating attachment for non-existent task returns 404."""
        url = self._get_attachments_url(999999)
        test_file = self._create_test_file()
        data = {"file": test_file}

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_attachments_for_nonexistent_task(self):
        """Listing attachments for non-existent task returns 404."""
        url = self._get_attachments_url(999999)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_attachment_detail_nonexistent_task(self):
        """Getting attachment detail for non-existent task returns 404."""
        url = self._get_attachment_detail_url(999999, 1)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_nonexistent_attachment(self):
        """Getting non-existent attachment returns 404."""
        url = self._get_attachment_detail_url(self.task.id, 999999)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_attachment_without_file(self):
        """Creating attachment without file should fail."""
        url = self._get_attachments_url(self.task.id)
        data = {}

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(TaskAttachment.objects.count(), 0)

    def test_download_attachment_without_file(self):
        """Downloading attachment without file returns 404."""
        # Create attachment without file
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            original_filename="test_file.txt",
            file_size=0,
            content_type="text/plain"
        )
        # Manually set file to None to simulate missing file
        attachment.file = None
        attachment.save()

        url = self._get_attachment_download_url(self.task.id, attachment.id)
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("No file available", str(response.data["detail"]))

    def test_attachment_checksum_computed(self):
        """Checksum should be computed when attachment is created."""
        url = self._get_attachments_url(self.task.id)
        test_file = self._create_test_file("test.txt", b"test content")
        data = {"file": test_file}

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        attachment = TaskAttachment.objects.first()
        self.assertIsNotNone(attachment.checksum)
        self.assertEqual(len(attachment.checksum), 64)  # SHA-256 hex string length

    def test_attachment_metadata_set_correctly(self):
        """Attachment metadata (filename, size, content_type) should be set correctly."""
        url = self._get_attachments_url(self.task.id)
        test_file = SimpleUploadedFile(
            "document.pdf",
            b"PDF content here",
            content_type="application/pdf"
        )
        data = {"file": test_file}

        response = self.client.post(url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        attachment = TaskAttachment.objects.first()
        self.assertEqual(attachment.original_filename, "document.pdf")
        self.assertEqual(attachment.file_size, len(b"PDF content here"))
        self.assertEqual(attachment.content_type, "application/pdf")

