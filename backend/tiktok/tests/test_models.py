from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from ..models import TikTokCreative, AdGroup, AdDraft
from django.utils import timezone

User = get_user_model()


class TikTokCreativeModelTest(TestCase):
    """Test cases for TikTokCreative model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_tiktok_creative(self):
        """Test creating a TikTok creative instance."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1024000,
            width=1920,
            height=1080,
            duration_sec=30.5,
            md5='abc123def456',
            preview_url='https://example.com/preview.mp4',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(creative.type, 'video')
        self.assertEqual(creative.name, 'Test Video')
        self.assertEqual(creative.uploaded_by, self.user)
        self.assertEqual(creative.scan_status, TikTokCreative.INCOMING)
        self.assertIsNotNone(creative.created_at)
        self.assertIsNotNone(creative.updated_at)
    
    def test_create_image_creative(self):
        """Test creating an image creative."""
        creative = TikTokCreative.objects.create(
            type='image',
            name='Test Image',
            storage_path='tiktok/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=512000,
            width=1200,
            height=628,
            duration_sec=None,  # Images don't have duration
            md5='def456ghi789',
            preview_url='https://example.com/preview.jpg',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(creative.type, 'image')
        self.assertIsNone(creative.duration_sec)
    
    def test_creative_type_choices(self):
        """Test creative type choices."""
        # Valid types
        for creative_type in ['image', 'video', 'music']:
            creative = TikTokCreative.objects.create(
                type=creative_type,
                name=f'Test {creative_type}',
                storage_path=f'tiktok/{creative_type}s/test',
                original_filename=f'test.{creative_type}',
                mime_type=f'{creative_type}/test',
                size_bytes=1000,
                md5=f'test{creative_type}123',
                preview_url='https://example.com/test',
                scan_status=TikTokCreative.INCOMING,
                uploaded_by=self.user
            )
            self.assertEqual(creative.type, creative_type)
    
    def test_scan_status_choices(self):
        """Test scan status choices."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Test status transitions
        creative.start_scan()
        self.assertEqual(creative.scan_status, TikTokCreative.SCANNING)
        
        creative.mark_clean()
        self.assertEqual(creative.scan_status, TikTokCreative.READY)
    
    def test_md5_uniqueness(self):
        """Test that MD5 hash must be unique."""
        # Create first creative
        TikTokCreative.objects.create(
            type='video',
            name='First Video',
            storage_path='tiktok/videos/first.mp4',
            original_filename='first.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='unique123',
            preview_url='https://example.com/first',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Try to create second creative with same MD5
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TikTokCreative.objects.create(
                type='video',
                name='Second Video',
                storage_path='tiktok/videos/second.mp4',
                original_filename='second.mp4',
                mime_type='video/mp4',
                size_bytes=2000,
                md5='unique123',  # Same MD5
                preview_url='https://example.com/second',
                scan_status=TikTokCreative.INCOMING,
                uploaded_by=self.user
            )
    
    def test_string_representation(self):
        """Test string representation of the model."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        expected = "Test Video (video)"
        self.assertEqual(str(creative), expected)
    
    def test_model_meta(self):
        """Test model meta options."""
        self.assertEqual(TikTokCreative._meta.db_table, 'tiktok_creative')
        self.assertEqual(TikTokCreative._meta.verbose_name, 'TikTok Creative')
        self.assertEqual(TikTokCreative._meta.verbose_name_plural, 'TikTok Creatives')
    
    def test_ordering(self):
        """Test default ordering (newest first)."""
        # Create creatives with different timestamps
        creative1 = TikTokCreative.objects.create(
            type='video',
            name='First Video',
            storage_path='tiktok/videos/first.mp4',
            original_filename='first.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='first123',
            preview_url='https://example.com/first',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        creative2 = TikTokCreative.objects.create(
            type='video',
            name='Second Video',
            storage_path='tiktok/videos/second.mp4',
            original_filename='second.mp4',
            mime_type='video/mp4',
            size_bytes=2000,
            md5='second123',
            preview_url='https://example.com/second',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Get all creatives (should be ordered by -created_at)
        creatives = list(TikTokCreative.objects.all())
        self.assertEqual(creatives[0], creative2)  # Newest first
        self.assertEqual(creatives[1], creative1)


class AdGroupModelTest(TestCase):
    """Test cases for AdGroup model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_create_ad_group(self):
        """Test creating an ad group."""
        ad_group = AdGroup.objects.create(
            name='Test Ad Group',
            created_by=self.user
        )

        self.assertEqual(ad_group.name, 'Test Ad Group')
        self.assertEqual(ad_group.created_by, self.user)
        self.assertIsNotNone(ad_group.gid)
        self.assertIsNotNone(ad_group.created_at)
        self.assertIsNotNone(ad_group.updated_at)

    def test_auto_generate_gid(self):
        """Test that gid is automatically generated."""
        ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )

        # Check gid format: G-YYYY-NNNN
        self.assertIsNotNone(ad_group.gid)
        current_year = timezone.now().year
        self.assertTrue(ad_group.gid.startswith(f'G-{current_year}-'))

    def test_gid_uniqueness(self):
        """Test that gid is unique."""
        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        group2 = AdGroup.objects.create(name='Group 2', created_by=self.user)

        self.assertNotEqual(group1.gid, group2.gid)

    def test_gid_sequential_numbering(self):
        """Test that gid numbers are sequential."""
        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        group2 = AdGroup.objects.create(name='Group 2', created_by=self.user)
        group3 = AdGroup.objects.create(name='Group 3', created_by=self.user)

        # Extract sequence numbers
        import re
        current_year = timezone.now().year

        match1 = re.match(rf'G-{current_year}-(\d+)', group1.gid)
        match2 = re.match(rf'G-{current_year}-(\d+)', group2.gid)
        match3 = re.match(rf'G-{current_year}-(\d+)', group3.gid)

        self.assertIsNotNone(match1)
        self.assertIsNotNone(match2)
        self.assertIsNotNone(match3)

        seq1 = int(match1.group(1))
        seq2 = int(match2.group(1))
        seq3 = int(match3.group(1))

        # Should be sequential
        self.assertEqual(seq2, seq1 + 1)
        self.assertEqual(seq3, seq2 + 1)

    def test_generate_gid_method(self):
        """Test the generate_gid static method."""
        gid1 = AdGroup.generate_gid()
        gid2 = AdGroup.generate_gid()

        # Both should be valid gid format
        current_year = timezone.now().year
        self.assertTrue(gid1.startswith(f'G-{current_year}-'))
        self.assertTrue(gid2.startswith(f'G-{current_year}-'))

    def test_string_representation(self):
        """Test string representation of the model."""
        ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )

        expected = f"AdGroup: Test Group ({ad_group.gid})"
        self.assertEqual(str(ad_group), expected)

    def test_model_meta(self):
        """Test model meta options."""
        self.assertEqual(AdGroup._meta.db_table, 'tiktok_ad_group')
        self.assertEqual(AdGroup._meta.verbose_name, 'TikTok Ad Group')
        self.assertEqual(AdGroup._meta.verbose_name_plural, 'TikTok Ad Groups')

    def test_ordering(self):
        """Test default ordering (newest updated first)."""
        import time

        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        time.sleep(0.01)  # Ensure different timestamps
        group2 = AdGroup.objects.create(name='Group 2', created_by=self.user)

        groups = list(AdGroup.objects.all())
        self.assertEqual(groups[0], group2)  # Newest updated first
        self.assertEqual(groups[1], group1)

    def test_cascade_delete_with_user(self):
        """Test that ad groups are deleted when user is deleted."""
        ad_group = AdGroup.objects.create(name='Test Group', created_by=self.user)
        self.assertEqual(AdGroup.objects.count(), 1)

        # Delete user
        self.user.delete()

        # Ad group should be deleted
        self.assertEqual(AdGroup.objects.count(), 0)


class AdDraftModelTest(TestCase):
    """Test cases for AdDraft model."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )

    def test_create_ad_draft(self):
        """Test creating an ad draft."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            ad_text='Test ad text',
            call_to_action='',  # dynamic
            creative_type='SINGLE_VIDEO',
            ad_group=self.ad_group,
            created_by=self.user
        )

        self.assertEqual(ad_draft.name, 'Test Draft')
        self.assertEqual(ad_draft.ad_text, 'Test ad text')
        self.assertEqual(ad_draft.call_to_action, '')
        self.assertEqual(ad_draft.creative_type, 'SINGLE_VIDEO')
        self.assertEqual(ad_draft.ad_group, self.ad_group)
        self.assertEqual(ad_draft.created_by, self.user)
        self.assertIsNotNone(ad_draft.id)
        self.assertIsNotNone(ad_draft.aid)

    def test_auto_generate_aid(self):
        """Test that aid is automatically generated."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        # Check aid format: AD-YYYY-NNNNNN
        self.assertIsNotNone(ad_draft.aid)
        current_year = timezone.now().year
        self.assertTrue(ad_draft.aid.startswith(f'AD-{current_year}-'))

    def test_aid_uniqueness(self):
        """Test that aid is unique."""
        draft1 = AdDraft.objects.create(name='Draft 1', created_by=self.user)
        draft2 = AdDraft.objects.create(name='Draft 2', created_by=self.user)

        self.assertNotEqual(draft1.aid, draft2.aid)

    def test_aid_sequential_numbering(self):
        """Test that aid numbers are sequential."""
        draft1 = AdDraft.objects.create(name='Draft 1', created_by=self.user)
        draft2 = AdDraft.objects.create(name='Draft 2', created_by=self.user)
        draft3 = AdDraft.objects.create(name='Draft 3', created_by=self.user)

        # Extract sequence numbers
        import re
        current_year = timezone.now().year

        match1 = re.match(rf'AD-{current_year}-(\d+)', draft1.aid)
        match2 = re.match(rf'AD-{current_year}-(\d+)', draft2.aid)
        match3 = re.match(rf'AD-{current_year}-(\d+)', draft3.aid)

        self.assertIsNotNone(match1)
        self.assertIsNotNone(match2)
        self.assertIsNotNone(match3)

        seq1 = int(match1.group(1))
        seq2 = int(match2.group(1))
        seq3 = int(match3.group(1))

        # Should be sequential
        self.assertEqual(seq2, seq1 + 1)
        self.assertEqual(seq3, seq2 + 1)

    def test_generate_aid_method(self):
        """Test the generate_aid static method."""
        aid1 = AdDraft.generate_aid()
        aid2 = AdDraft.generate_aid()

        # Both should be valid aid format
        current_year = timezone.now().year
        self.assertTrue(aid1.startswith(f'AD-{current_year}-'))
        self.assertTrue(aid2.startswith(f'AD-{current_year}-'))

    def test_uuid_primary_key(self):
        """Test that id is a UUID."""
        import uuid

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        self.assertIsInstance(ad_draft.id, uuid.UUID)

    def test_ad_draft_without_ad_group(self):
        """Test creating ad draft without ad group (optional)."""
        ad_draft = AdDraft.objects.create(
            name='Draft without group',
            created_by=self.user
        )

        self.assertIsNone(ad_draft.ad_group)

    def test_creative_type_choices(self):
        """Test creative type choices."""
        for ctype in ['SINGLE_VIDEO', 'SINGLE_IMAGE', 'CAROUSEL_VIDEO', 'CAROUSEL_IMAGE']:
            draft = AdDraft.objects.create(
                name=f'Draft {ctype}',
                creative_type=ctype,
                created_by=self.user
            )
            self.assertEqual(draft.creative_type, ctype)

    def test_call_to_action_semantics(self):
        """Test unified CTA semantics: None(off), ''(dynamic), non-empty(standard label)."""
        d_off = AdDraft.objects.create(name='Off', call_to_action=None, created_by=self.user)
        d_dyn = AdDraft.objects.create(name='Dyn', call_to_action='', created_by=self.user)
        d_std = AdDraft.objects.create(name='Std', call_to_action='Sign up', created_by=self.user)

        self.assertIsNone(d_off.call_to_action)
        self.assertEqual(d_dyn.call_to_action, '')
        self.assertEqual(d_std.call_to_action, 'Sign up')

    def test_assets_json_field(self):
        """Test assets JSON field."""
        assets_data = {
            'primaryCreative': {'id': 1, 'type': 'video'},
            'images': [{'id': 2, 'type': 'image'}]
        }

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets=assets_data,
            created_by=self.user
        )

        self.assertEqual(ad_draft.assets, assets_data)
        self.assertEqual(ad_draft.assets['primaryCreative']['id'], 1)

    def test_default_assets_is_dict(self):
        """Test that assets defaults to empty dict."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        self.assertEqual(ad_draft.assets, {})

    def test_infer_creative_type_from_assets_single_video(self):
        """Test inferring SINGLE_VIDEO from assets."""
        assets = {
            'primaryCreative': {'id': 1, 'type': 'video'}
        }

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets=assets,
            created_by=self.user
        )

        inferred_type = ad_draft.infer_creative_type_from_assets()
        self.assertEqual(inferred_type, 'SINGLE_VIDEO')

    def test_infer_creative_type_from_assets_single_image(self):
        """Test inferring SINGLE_IMAGE from assets."""
        assets = {
            'primaryCreative': {'id': 1, 'type': 'image'}
        }

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets=assets,
            created_by=self.user
        )

        inferred_type = ad_draft.infer_creative_type_from_assets()
        self.assertEqual(inferred_type, 'SINGLE_IMAGE')

    def test_infer_creative_type_from_assets_carousel_video(self):
        """Test inferring CAROUSEL_VIDEO from assets."""
        assets = {
            'primaryCreative': {'id': 1, 'type': 'video'},
            'images': [{'id': 2, 'type': 'image'}]
        }

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets=assets,
            created_by=self.user
        )

        inferred_type = ad_draft.infer_creative_type_from_assets()
        self.assertEqual(inferred_type, 'CAROUSEL_VIDEO')

    def test_infer_creative_type_from_assets_carousel_image(self):
        """Test inferring CAROUSEL_IMAGE from assets."""
        assets = {
            'primaryCreative': {'id': 1, 'type': 'image'},
            'images': [{'id': 2, 'type': 'image'}, {'id': 3, 'type': 'image'}]
        }

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets=assets,
            created_by=self.user
        )

        inferred_type = ad_draft.infer_creative_type_from_assets()
        self.assertEqual(inferred_type, 'CAROUSEL_IMAGE')

    def test_infer_creative_type_from_assets_empty(self):
        """Test inferring creative type from empty assets."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets={},
            created_by=self.user
        )

        inferred_type = ad_draft.infer_creative_type_from_assets()
        self.assertIsNone(inferred_type)

    def test_opt_status_default(self):
        """Test that opt_status defaults to 0."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        self.assertEqual(ad_draft.opt_status, 0)

    def test_string_representation(self):
        """Test string representation of the model."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        expected = f"AdDraft: Test Draft ({ad_draft.aid})"
        self.assertEqual(str(ad_draft), expected)

    def test_string_representation_unnamed(self):
        """Test string representation without name."""
        ad_draft = AdDraft.objects.create(
            created_by=self.user
        )

        expected = f"AdDraft: Unnamed ({ad_draft.aid})"
        self.assertEqual(str(ad_draft), expected)

    def test_model_meta(self):
        """Test model meta options."""
        self.assertEqual(AdDraft._meta.db_table, 'tiktok_ad_draft')
        self.assertEqual(AdDraft._meta.verbose_name, 'TikTok Ad Draft')
        self.assertEqual(AdDraft._meta.verbose_name_plural, 'TikTok Ad Drafts')

    def test_ordering(self):
        """Test default ordering (newest updated first)."""
        import time

        draft1 = AdDraft.objects.create(name='Draft 1', created_by=self.user)
        time.sleep(0.01)
        draft2 = AdDraft.objects.create(name='Draft 2', created_by=self.user)

        drafts = list(AdDraft.objects.all())
        self.assertEqual(drafts[0], draft2)  # Newest updated first
        self.assertEqual(drafts[1], draft1)

    def test_cascade_delete_with_user(self):
        """Test that ad drafts are deleted when user is deleted."""
        ad_draft = AdDraft.objects.create(name='Test Draft', created_by=self.user)
        self.assertEqual(AdDraft.objects.count(), 1)

        # Delete user
        self.user.delete()

        # Ad draft should be deleted
        self.assertEqual(AdDraft.objects.count(), 0)

    def test_set_null_delete_with_ad_group(self):
        """Test that ad drafts are kept when ad group is deleted (SET_NULL)."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            ad_group=self.ad_group,
            created_by=self.user
        )

        self.assertEqual(ad_draft.ad_group, self.ad_group)

        # Delete ad group
        self.ad_group.delete()

        # Ad draft should still exist but ad_group should be None
        ad_draft.refresh_from_db()
        self.assertIsNone(ad_draft.ad_group)

    def test_related_name_ad_drafts(self):
        """Test the related_name for ad_group foreign key."""
        draft1 = AdDraft.objects.create(
            name='Draft 1',
            ad_group=self.ad_group,
            created_by=self.user
        )
        draft2 = AdDraft.objects.create(
            name='Draft 2',
            ad_group=self.ad_group,
            created_by=self.user
        )

        # Access drafts through ad_group
        drafts = list(self.ad_group.ad_drafts.all())
        self.assertEqual(len(drafts), 2)
        self.assertIn(draft1, drafts)
        self.assertIn(draft2, drafts)
