from django.test import TestCase
from django.contrib.auth import get_user_model
from django_fsm import TransitionNotAllowed
from task.models import Task, TaskAttachment
from core.models import Project, Organization
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


class TaskAttachmentModelTest(TestCase):
    """Test cases for TaskAttachment model"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='user@example.com',
            username='user',
            password='testpass123'
        )

        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )

        self.task = Task.objects.create(
            summary="Test Task",
            owner=self.user,
            project=self.project,
            type='asset'
        )

    def test_create_attachment(self):
        """Test creating a task attachment"""
        test_file = SimpleUploadedFile(
            "test.txt",
            b"test content",
            content_type="text/plain"
        )

        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"test content"),
            content_type="text/plain"
        )

        self.assertEqual(attachment.task, self.task)
        self.assertEqual(attachment.uploaded_by, self.user)
        self.assertEqual(attachment.original_filename, "test.txt")
        self.assertEqual(attachment.file_size, len(b"test content"))
        self.assertEqual(attachment.scan_status, TaskAttachment.PENDING)

    def test_checksum_computation(self):
        """Test that checksum is computed when file is saved"""
        test_file = SimpleUploadedFile(
            "test.txt",
            b"test content for checksum",
            content_type="text/plain"
        )

        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"test content for checksum"),
            content_type="text/plain"
        )

        # Checksum should be computed automatically
        self.assertIsNotNone(attachment.checksum)
        self.assertEqual(len(attachment.checksum), 64)  # SHA-256 hex string length

    def test_checksum_same_content(self):
        """Test that same file content produces same checksum"""
        test_file1 = SimpleUploadedFile(
            "test1.txt",
            b"same content",
            content_type="text/plain"
        )
        test_file2 = SimpleUploadedFile(
            "test2.txt",
            b"same content",
            content_type="text/plain"
        )

        attachment1 = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file1,
            original_filename="test1.txt",
            file_size=len(b"same content"),
            content_type="text/plain"
        )

        attachment2 = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file2,
            original_filename="test2.txt",
            file_size=len(b"same content"),
            content_type="text/plain"
        )

        # Same content should produce same checksum
        self.assertEqual(attachment1.checksum, attachment2.checksum)

    def test_start_scan_transition(self):
        """Test start_scan transition from PENDING to SCANNING"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        self.assertEqual(attachment.scan_status, TaskAttachment.PENDING)

        attachment.start_scan()
        attachment.refresh_from_db()

        self.assertEqual(attachment.scan_status, TaskAttachment.SCANNING)

    def test_mark_clean_transition(self):
        """Test mark_clean transition from SCANNING to CLEAN"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        attachment.start_scan()
        attachment.mark_clean()
        attachment.refresh_from_db()

        self.assertEqual(attachment.scan_status, TaskAttachment.CLEAN)

    def test_mark_infected_transition(self):
        """Test mark_infected transition from SCANNING to INFECTED"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        attachment.start_scan()
        attachment.mark_infected()
        attachment.refresh_from_db()

        self.assertEqual(attachment.scan_status, TaskAttachment.INFECTED)

    def test_mark_error_scanning_transition(self):
        """Test mark_error_scanning transition from SCANNING to ERROR_SCANNING"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        attachment.start_scan()
        attachment.mark_error_scanning()
        attachment.refresh_from_db()

        self.assertEqual(attachment.scan_status, TaskAttachment.ERROR_SCANNING)

    def test_invalid_transition_from_pending(self):
        """Test that invalid transitions from PENDING raise TransitionNotAllowed"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        self.assertEqual(attachment.scan_status, TaskAttachment.PENDING)

        # Cannot mark_clean directly from PENDING
        with self.assertRaises(TransitionNotAllowed):
            attachment.mark_clean()

        # Cannot mark_infected directly from PENDING
        with self.assertRaises(TransitionNotAllowed):
            attachment.mark_infected()

        # Cannot mark_error_scanning directly from PENDING
        with self.assertRaises(TransitionNotAllowed):
            attachment.mark_error_scanning()

    def test_invalid_transition_from_clean(self):
        """Test that invalid transitions from CLEAN raise TransitionNotAllowed"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        attachment.start_scan()
        attachment.mark_clean()

        # Cannot start_scan from CLEAN
        with self.assertRaises(TransitionNotAllowed):
            attachment.start_scan()

    def test_str_representation(self):
        """Test string representation of TaskAttachment"""
        test_file = SimpleUploadedFile("test.txt", b"content", content_type="text/plain")
        attachment = TaskAttachment.objects.create(
            task=self.task,
            uploaded_by=self.user,
            file=test_file,
            original_filename="test.txt",
            file_size=len(b"content"),
            content_type="text/plain"
        )

        expected_str = f"Attachment {attachment.id} for Task {self.task.id}: test.txt"
        self.assertEqual(str(attachment), expected_str)

