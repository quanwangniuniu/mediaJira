from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from ..models import AdGroup, AdDraft, PublicPreview
from ..serializers import AdGroupSerializer, AdDraftSerializer, PublicPreviewSerializer

User = get_user_model()


class AdGroupSerializerTest(TestCase):
    """Test cases for AdGroupSerializer."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.factory = APIRequestFactory()

    def test_serialize_ad_group(self):
        """Test serializing an ad group."""
        ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )

        serializer = AdGroupSerializer(ad_group)
        data = serializer.data

        self.assertEqual(data['name'], 'Test Group')
        self.assertIn('id', data)
        self.assertIn('gid', data)
        self.assertIn('created_by_id', data)
        self.assertEqual(data['created_by_id'], self.user.id)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)

    def test_deserialize_ad_group_create(self):
        """Test deserializing and creating an ad group."""
        data = {
            'name': 'New Group'
        }

        request = self.factory.post('/fake-url')
        request.user = self.user

        serializer = AdGroupSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        ad_group = serializer.save()

        self.assertEqual(ad_group.name, 'New Group')
        self.assertEqual(ad_group.created_by, self.user)
        self.assertIsNotNone(ad_group.gid)

    def test_required_fields(self):
        """Test that name is required."""
        data = {}

        serializer = AdGroupSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('name', serializer.errors)

    def test_read_only_fields(self):
        """Test that certain fields are read-only."""
        ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )

        data = {
            'name': 'Updated Group',
            'gid': 'FAKE-GID',  # Should be ignored
            'created_by_id': 999  # Should be ignored
        }

        serializer = AdGroupSerializer(ad_group, data=data, partial=True)
        self.assertTrue(serializer.is_valid())

        updated_group = serializer.save()

        # name should be updated
        self.assertEqual(updated_group.name, 'Updated Group')
        # gid and created_by should NOT be changed
        self.assertNotEqual(updated_group.gid, 'FAKE-GID')
        self.assertEqual(updated_group.created_by, self.user)


class AdDraftSerializerTest(TestCase):
    """Test cases for AdDraftSerializer."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        self.ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )
        self.factory = APIRequestFactory()

    def test_serialize_ad_draft(self):
        """Test serializing an ad draft."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            ad_text='Test ad text',
            call_to_action='',
            creative_type='SINGLE_VIDEO',
            assets={'primaryCreative': {'id': 1, 'type': 'video'}},
            ad_group=self.ad_group,
            created_by=self.user
        )

        serializer = AdDraftSerializer(ad_draft)
        data = serializer.data

        self.assertEqual(data['name'], 'Test Draft')
        self.assertEqual(data['ad_text'], 'Test ad text')
        self.assertIn('call_to_action', data)
        self.assertEqual(data['call_to_action'], '')
        self.assertEqual(data['creative_type'], 'SINGLE_VIDEO')
        self.assertIn('id', data)
        self.assertIn('aid', data)
        self.assertIn('created_by_id', data)
        self.assertEqual(data['created_by_id'], self.user.id)
        self.assertIn('ad_group_id', data)
        self.assertEqual(str(data['ad_group_id']), str(self.ad_group.id))

    def test_deserialize_ad_draft_create(self):
        """Test deserializing and creating an ad draft."""
        data = {
            'name': 'New Draft',
            'ad_text': 'New ad text',
            'creative_type': 'SINGLE_VIDEO',
            'ad_group': str(self.ad_group.id),
            'assets': {'primaryCreative': {'id': 1, 'type': 'video'}}
        }

        request = self.factory.post('/fake-url')
        request.user = self.user

        serializer = AdDraftSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        ad_draft = serializer.save()

        self.assertEqual(ad_draft.name, 'New Draft')
        self.assertEqual(ad_draft.ad_text, 'New ad text')
        self.assertEqual(ad_draft.creative_type, 'SINGLE_VIDEO')
        self.assertEqual(ad_draft.ad_group, self.ad_group)
        self.assertEqual(ad_draft.created_by, self.user)
        self.assertIsNotNone(ad_draft.aid)

    def test_deserialize_ad_draft_without_ad_group(self):
        """Test creating ad draft without ad group."""
        data = {
            'name': 'Draft without group',
            'ad_text': 'Test text'
        }

        request = self.factory.post('/fake-url')
        request.user = self.user

        serializer = AdDraftSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid(), serializer.errors)

        ad_draft = serializer.save()

        self.assertIsNone(ad_draft.ad_group)

    def test_update_ad_draft(self):
        """Test updating an ad draft."""
        ad_draft = AdDraft.objects.create(
            name='Original Name',
            ad_text='Original text',
            ad_group=self.ad_group,
            created_by=self.user
        )

        data = {
            'name': 'Updated Name',
            'ad_text': 'Updated text'
        }

        serializer = AdDraftSerializer(ad_draft, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        updated_draft = serializer.save()

        self.assertEqual(updated_draft.name, 'Updated Name')
        self.assertEqual(updated_draft.ad_text, 'Updated text')

    def test_read_only_fields(self):
        """Test that certain fields are read-only."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        data = {
            'name': 'Updated Draft',
            'aid': 'FAKE-AID',  # Should be ignored
            'created_by_id': 999  # Should be ignored
        }

        serializer = AdDraftSerializer(ad_draft, data=data, partial=True)
        self.assertTrue(serializer.is_valid())

        updated_draft = serializer.save()

        # name should be updated
        self.assertEqual(updated_draft.name, 'Updated Draft')
        # aid and created_by should NOT be changed
        self.assertNotEqual(updated_draft.aid, 'FAKE-AID')
        self.assertEqual(updated_draft.created_by, self.user)

    def test_validate_ad_group_belongs_to_user_on_create(self):
        """Test validation that ad_group belongs to user on create."""
        other_group = AdGroup.objects.create(
            name='Other Group',
            created_by=self.other_user
        )

        data = {
            'name': 'Test Draft',
            'ad_group': str(other_group.id)
        }

        request = self.factory.post('/fake-url')
        request.user = self.user

        serializer = AdDraftSerializer(data=data, context={'request': request})
        self.assertTrue(serializer.is_valid())

        # Should raise validation error when saving
        with self.assertRaises(Exception):  # ValidationError
            serializer.save()

    def test_validate_ad_group_belongs_to_user_on_update(self):
        """Test validation that ad_group belongs to user on update."""
        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            created_by=self.user
        )

        other_group = AdGroup.objects.create(
            name='Other Group',
            created_by=self.other_user
        )

        data = {
            'ad_group': str(other_group.id)
        }

        serializer = AdDraftSerializer(ad_draft, data=data, partial=True)
        self.assertTrue(serializer.is_valid())

        # Should raise validation error when saving
        with self.assertRaises(Exception):  # ValidationError
            serializer.save()

    def test_assets_json_field(self):
        """Test that assets JSON field is properly serialized."""
        assets_data = {
            'primaryCreative': {'id': 1, 'type': 'video'},
            'images': [{'id': 2, 'type': 'image'}]
        }

        ad_draft = AdDraft.objects.create(
            name='Test Draft',
            assets=assets_data,
            created_by=self.user
        )

        serializer = AdDraftSerializer(ad_draft)
        data = serializer.data

        self.assertEqual(data['assets'], assets_data)

    def test_creative_type_choices(self):
        """Test that creative_type is validated against choices."""
        data = {
            'name': 'Test Draft',
            'creative_type': 'INVALID_TYPE'
        }

        request = self.factory.post('/fake-url')
        request.user = self.user

        serializer = AdDraftSerializer(data=data, context={'request': request})
        # Should be invalid due to invalid creative_type
        self.assertFalse(serializer.is_valid())
        self.assertIn('creative_type', serializer.errors)

    def test_call_to_action_field(self):
        """Test unified call_to_action field pass-through."""
        request = self.factory.post('/fake-url')
        request.user = self.user

        # Off
        s1 = AdDraftSerializer(data={'name': 'n1', 'call_to_action': None}, context={'request': request})
        self.assertTrue(s1.is_valid(), s1.errors)
        d1 = s1.save()
        self.assertIsNone(d1.call_to_action)

        # Dynamic
        s2 = AdDraftSerializer(data={'name': 'n2', 'call_to_action': ''}, context={'request': request})
        self.assertTrue(s2.is_valid(), s2.errors)
        d2 = s2.save()
        self.assertEqual(d2.call_to_action, '')

        # Standard label
        s3 = AdDraftSerializer(data={'name': 'n3', 'call_to_action': 'Sign up'}, context={'request': request})
        self.assertTrue(s3.is_valid(), s3.errors)
        d3 = s3.save()
        self.assertEqual(d3.call_to_action, 'Sign up')

    def test_public_preview_serializer(self):
        draft = AdDraft.objects.create(name='D', created_by=self.user)
        pp = PublicPreview.objects.create(slug='slug-x', ad_draft=draft, version_id='v', snapshot_json={'k': 'v'})
        ser = PublicPreviewSerializer(pp)
        self.assertEqual(ser.data['slug'], 'slug-x')
        self.assertEqual(ser.data['version_id'], 'v')
        self.assertEqual(ser.data['snapshot_json']['k'], 'v')

    def test_optional_fields(self):
        """Test that most fields are optional."""
        data = {}  # Empty data

        request = self.factory.post('/fake-url')
        request.user = self.user

        serializer = AdDraftSerializer(data=data, context={'request': request})
        # Should be valid even with empty data (all fields optional)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        ad_draft = serializer.save()
        self.assertIsNotNone(ad_draft)

    def test_ad_group_id_read_only(self):
        """Test that ad_group_id is read-only and ad_group is write-only."""
        serializer = AdDraftSerializer()

        # Check that ad_group_id is in fields but marked as read-only
        self.assertIn('ad_group_id', serializer.fields)

        # Check that ad_group is write-only
        self.assertIn('ad_group', serializer.fields)
        self.assertTrue(serializer.fields['ad_group'].write_only)
