from django.test import TestCase
from django.contrib.auth import get_user_model
from asset.models import Task, Asset, AssetComment
from core.models import Organization, Team

User = get_user_model()


class AssetCommentModelTest(TestCase):
    """Test cases for AssetComment model"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED
        )
    
    def test_asset_comment_creation(self):
        """Test basic asset comment creation"""
        comment = AssetComment.objects.create(
            asset=self.asset,
            user=self.user,
            body="Test comment body"
        )
        
        self.assertEqual(comment.asset, self.asset)
        self.assertEqual(comment.user, self.user)
        self.assertEqual(comment.body, "Test comment body")
        self.assertIsNotNone(comment.created_at)
    
    def test_asset_comment_string_representation(self):
        """Test asset comment string representation"""
        comment = AssetComment.objects.create(
            asset=self.asset,
            user=self.user,
            body="Test comment body"
        )
        expected = f"Comment by {self.user.username} on Asset {self.asset.id}"
        self.assertEqual(str(comment), expected)
    
    def test_asset_comment_table_name(self):
        """Test asset comment table name"""
        comment = AssetComment.objects.create(
            asset=self.asset,
            user=self.user,
            body="Test comment body"
        )
        self.assertEqual(comment._meta.db_table, 'asset_comments') 