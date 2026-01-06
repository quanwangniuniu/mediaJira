from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from klaviyo.models import EmailDraft, Workflow, KlaviyoImage

User = get_user_model()


class ModelRelationshipTests(TestCase):

    def test_workflow_draft_relationship(self):
        draft = EmailDraft.objects.create(
            name="Test",
            subject="Hello",
            status=getattr(EmailDraft, "STATUS_DRAFT", "draft")
        )

        workflow = Workflow.objects.create(
            name="WF",
            trigger_draft_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=True,
        )

        workflow.email_drafts.add(draft)

        # Assertion
        self.assertIn(draft, workflow.email_drafts.all())


class KlaviyoImageModelTest(TestCase):
    """Test cases for KlaviyoImage model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_klaviyo_image(self):
        """Test creating a KlaviyoImage instance."""
        image = KlaviyoImage.objects.create(
            name='Test Image',
            storage_path='klaviyo/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=512000,
            width=1200,
            height=628,
            md5='abc123def456',
            preview_url='https://example.com/preview.jpg',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(image.name, 'Test Image')
        self.assertEqual(image.original_filename, 'test.jpg')
        self.assertEqual(image.uploaded_by, self.user)
        self.assertEqual(image.scan_status, KlaviyoImage.INCOMING)
        self.assertEqual(image.width, 1200)
        self.assertEqual(image.height, 628)
        self.assertIsNotNone(image.created_at)
        self.assertIsNotNone(image.updated_at)
    
    def test_scan_status_transitions(self):
        """Test scan status transitions."""
        image = KlaviyoImage.objects.create(
            name='Test Image',
            storage_path='klaviyo/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=640,
            height=640,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        
        # Test status transitions - FSM transitions update in-memory state
        image.start_scan()
        self.assertEqual(image.scan_status, KlaviyoImage.SCANNING)
        
        image.mark_ready()
        self.assertEqual(image.scan_status, KlaviyoImage.READY)
        
        # Test infected path - create a new image and transition to SCANNING first
        image2 = KlaviyoImage.objects.create(
            name='Test Image 2',
            storage_path='klaviyo/images/test2.jpg',
            original_filename='test2.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=640,
            height=640,
            md5='test456',
            preview_url='https://example.com/test2',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        image2.start_scan()
        self.assertEqual(image2.scan_status, KlaviyoImage.SCANNING)
        
        image2.mark_infected()
        self.assertEqual(image2.scan_status, KlaviyoImage.INFECTED)
        
        # Test error path - can transition from INCOMING
        image3 = KlaviyoImage.objects.create(
            name='Test Image 3',
            storage_path='klaviyo/images/test3.jpg',
            original_filename='test3.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=640,
            height=640,
            md5='test789',
            preview_url='https://example.com/test3',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        image3.mark_error()
        self.assertEqual(image3.scan_status, KlaviyoImage.ERROR_SCANNING)
    
    def test_md5_uniqueness(self):
        """Test that MD5 hash must be unique."""
        # Create first image
        KlaviyoImage.objects.create(
            name='First Image',
            storage_path='klaviyo/images/first.jpg',
            original_filename='first.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=640,
            height=640,
            md5='unique123',
            preview_url='https://example.com/first',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        
        # Try to create second image with same MD5
        with self.assertRaises(IntegrityError):
            KlaviyoImage.objects.create(
                name='Second Image',
                storage_path='klaviyo/images/second.jpg',
                original_filename='second.jpg',
                mime_type='image/jpeg',
                size_bytes=2000,
                width=640,
                height=640,
                md5='unique123',  # Same MD5
                preview_url='https://example.com/second',
                scan_status=KlaviyoImage.INCOMING,
                uploaded_by=self.user
            )
    
    def test_string_representation(self):
        """Test string representation of the model."""
        image = KlaviyoImage.objects.create(
            name='Test Image',
            storage_path='klaviyo/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=640,
            height=640,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(str(image), 'Test Image (test.jpg)')
    
    def test_uploaded_by_relationship(self):
        """Test uploaded_by foreign key relationship."""
        image = KlaviyoImage.objects.create(
            name='Test Image',
            storage_path='klaviyo/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=640,
            height=640,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(image.uploaded_by, self.user)
        self.assertIn(image, self.user.uploaded_klaviyo_images.all())
    
    def test_optional_dimensions(self):
        """Test that width and height can be None."""
        image = KlaviyoImage.objects.create(
            name='Test Image',
            storage_path='klaviyo/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=None,
            height=None,
            md5='test456',
            preview_url='https://example.com/test',
            scan_status=KlaviyoImage.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertIsNone(image.width)
        self.assertIsNone(image.height)
    
    def test_scan_status_choices(self):
        """Test scan status choices."""
        status_choices = [choice[0] for choice in KlaviyoImage.STATUS_CHOICES]
        expected_statuses = [
            KlaviyoImage.INCOMING,
            KlaviyoImage.SCANNING,
            KlaviyoImage.READY,
            KlaviyoImage.INFECTED,
            KlaviyoImage.MISSING,
            KlaviyoImage.ERROR_SCANNING,
        ]
        
        for status in expected_statuses:
            self.assertIn(status, status_choices)
