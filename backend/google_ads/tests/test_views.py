"""
Test cases for google_ads API views
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
import secrets

from google_ads.models import (
    Ad, CustomerAccount, AdImageAsset, AdTextAsset, AdVideoAsset,
    VideoResponsiveAdInfo, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo,
    AdPreview
)

User = get_user_model()


# ========== Helper Functions ==========

def create_test_user(username='testuser', email='test@example.com'):
    """Helper to create test user"""
    return User.objects.create_user(
        username=username,
        email=email,
        password='testpass123'
    )


def create_test_customer_account(user, customer_id='1234567890', name='Test Customer'):
    """Helper to create test customer account"""
    return CustomerAccount.objects.create(
        customer_id=customer_id,
        descriptive_name=name,
        created_by=user
    )


def create_test_responsive_search_ad():
    """Helper to create valid ResponsiveSearchAdInfo"""
    search_ad = ResponsiveSearchAdInfo.objects.create(path1='products', path2='sale')
    
    # Create headlines (3 required)
    for i in range(1, 4):
        headline = AdTextAsset.objects.create(text=f'Headline {i}')
        search_ad.headlines.add(headline)
    
    # Create descriptions (2 required)
    for i in range(1, 3):
        description = AdTextAsset.objects.create(text=f'Description {i}')
        search_ad.descriptions.add(description)
    
    return search_ad


def create_test_ad(user, customer_account, ad_type='RESPONSIVE_SEARCH_AD', **kwargs):
    """Helper to create test ad with proper ad type info"""
    import random
    
    ad_type_map = {
        'RESPONSIVE_SEARCH_AD': create_test_responsive_search_ad(),
    }
    
    ad_type_info = ad_type_map.get(ad_type)
    
    # Extract ad-specific fields
    name = kwargs.pop('name', 'Test Ad')
    ad_status = kwargs.pop('status', 'DRAFT')
    
    # Generate unique resource_name (must be numeric for ad_id)
    unique_id = str(random.randint(1000000, 9999999))
    resource_name = kwargs.pop('resource_name', f'customers/{customer_account.customer_id}/ads/{unique_id}')
    
    # Set ad type
    if ad_type == 'RESPONSIVE_SEARCH_AD':
        kwargs['responsive_search_ad'] = ad_type_info
    
    return Ad.objects.create(
        resource_name=resource_name,
        name=name,
        type=ad_type,
        status=ad_status,
        customer_account=customer_account,
        created_by=user,
        **kwargs
    )


# ========== View Tests ==========

class AdsByAccountViewTest(TestCase):
    """Test cases for AdsByAccountView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create test ads
        self.ad1 = create_test_ad(self.user, self.customer_account, name='Ad 1')
        self.ad2 = create_test_ad(self.user, self.customer_account, name='Ad 2')
    
    def test_list_ads_success(self):
        """Test successful ad list retrieval"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_list_ads_only_shows_own_ads(self):
        """Test that only ads from the specified account are shown"""
        # Create another user and account
        other_user = create_test_user(username='otheruser', email='other@example.com')
        other_account = create_test_customer_account(other_user, customer_id='9876543210')
        create_test_ad(other_user, other_account, name='Other Ad')
        
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        # Verify all returned ads belong to the requested account
        for ad_data in response.data['results']:
            self.assertEqual(ad_data['customer_account']['customer_id'], self.customer_account.customer_id)
    
    
    def test_create_ad_success(self):
        """Test successful ad creation"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/'
        
        # Create text assets first
        headline1 = AdTextAsset.objects.create(text='New Headline 1')
        headline2 = AdTextAsset.objects.create(text='New Headline 2')
        headline3 = AdTextAsset.objects.create(text='New Headline 3')
        description1 = AdTextAsset.objects.create(text='New Description 1')
        description2 = AdTextAsset.objects.create(text='New Description 2')
        
        data = {
            'resource_name': f'customers/{self.customer_account.customer_id}/ads/1234567890',
            'name': 'New Ad',
            'type': 'RESPONSIVE_SEARCH_AD',
            'status': 'DRAFT',
            'customer_account_id': self.customer_account.id,
            'created_by_id': self.user.id,
            'responsive_search_ad': {
                'path1': 'products',
                'path2': 'sale',
                'headline_ids': [headline1.id, headline2.id, headline3.id],
                'description_ids': [description1.id, description2.id]
            }
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Ad')
        self.assertEqual(response.data['type'], 'RESPONSIVE_SEARCH_AD')
    
    def test_create_ad_with_invalid_data(self):
        """Test creating ad with invalid data (validation error)"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/'
        
        # Missing required fields
        data = {
            'name': 'Invalid Ad'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Validation error returns field-specific errors
        self.assertIn('resource_name', response.data)
    
    def test_create_ad_customer_account_not_found(self):
        """Test creating ad with non-existent customer account"""
        url = '/api/google_ads/act_9999999999/ads/'
        
        data = {
            'resource_name': 'customers/9999999999/ads/1234567890',
            'name': 'Test Ad',
            'type': 'RESPONSIVE_SEARCH_AD',
            'status': 'DRAFT',
            'customer_account_id': 99999,
            'created_by_id': self.user.id
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class AdByAccountViewTest(TestCase):
    """Test cases for AdByAccountView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad = create_test_ad(self.user, self.customer_account, name='Test Ad')
    
    def test_retrieve_ad_success(self):
        """Test successful ad retrieval"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{self.ad.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ad.id)
        self.assertEqual(response.data['name'], 'Test Ad')
    
    def test_retrieve_ad_not_found(self):
        """Test retrieving non-existent ad"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/99999/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_retrieve_ad_from_different_account(self):
        """Test that user cannot retrieve ad from different account"""
        other_user = create_test_user(username='otheruser', email='other@example.com')
        other_account = create_test_customer_account(other_user, customer_id='9876543210')
        other_ad = create_test_ad(other_user, other_account, name='Other Ad')
        
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{other_ad.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_ad_success(self):
        """Test successful ad update"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{self.ad.id}/'
        
        data = {
            'name': 'Updated Ad',
            'status': 'APPROVED',
            'customer_account_id': self.customer_account.id
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Ad')
        self.assertEqual(response.data['status'], 'APPROVED')
    
    def test_update_ad_not_found(self):
        """Test updating non-existent ad"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/99999/'
        
        data = {
            'name': 'Updated Ad'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_ad_with_invalid_data(self):
        """Test updating ad with invalid data (validation error)"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{self.ad.id}/'
        
        data = {
            'status': 'INVALID_STATUS'  # Invalid status value
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Validation error returns field-specific errors
        self.assertIn('status', response.data)
    
    def test_delete_ad_success(self):
        """Test successful ad deletion"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{self.ad.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Ad.objects.filter(id=self.ad.id).exists())
    
    def test_delete_ad_not_found(self):
        """Test deleting non-existent ad"""
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/99999/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_ad_authentication_required(self):
        """Test that authentication is required for update"""
        self.client.logout()
        
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{self.ad.id}/'
        response = self.client.patch(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_delete_ad_authentication_required(self):
        """Test that authentication is required for delete"""
        self.client.logout()
        
        url = f'/api/google_ads/act_{self.customer_account.customer_id}/ads/{self.ad.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class GetAdViewTest(TestCase):
    """Test cases for get_ad view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad = create_test_ad(self.user, self.customer_account, name='Test Ad')
    
    def test_get_ad_success(self):
        """Test successful ad retrieval"""
        url = f'/api/google_ads/{self.ad.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.ad.id)
        self.assertEqual(response.data['name'], 'Test Ad')
    
    def test_get_ad_not_found(self):
        """Test retrieving non-existent ad"""
        url = '/api/google_ads/99999/'
        response = self.client.get(url)
        
        # get_ad view returns 404 for not found
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_ad_from_different_account(self):
        """Test that user cannot retrieve ad from different account"""
        other_user = create_test_user(username='otheruser', email='other@example.com')
        other_account = create_test_customer_account(other_user, customer_id='9876543210')
        other_ad = create_test_ad(other_user, other_account, name='Other Ad')
        
        url = f'/api/google_ads/{other_ad.id}/'
        response = self.client.get(url)
        
        # get_ad view returns 404 for not found (different account)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_ad_authentication_required(self):
        """Test that authentication is required"""
        self.client.logout()
        
        url = f'/api/google_ads/{self.ad.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class CreatePreviewFromAdViewTest(TestCase):
    """Test cases for create_preview_from_ad view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad = create_test_ad(self.user, self.customer_account, name='Test Ad')
    
    def test_create_preview_success(self):
        """Test successful preview creation"""
        url = f'/api/google_ads/{self.ad.id}/create_preview/'
        
        data = {
            'device_type': 'DESKTOP'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertIn('preview_url', response.data)
        self.assertEqual(len(response.data['token']), 43)
    
    def test_create_preview_with_mobile_device(self):
        """Test creating preview with mobile device"""
        url = f'/api/google_ads/{self.ad.id}/create_preview/'
        
        data = {
            'device_type': 'MOBILE'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('device_type', response.data)
        self.assertEqual(response.data['device_type'], 'MOBILE')
    
    def test_create_preview_with_tablet_device(self):
        """Test creating preview with tablet device"""
        url = f'/api/google_ads/{self.ad.id}/create_preview/'
        
        data = {
            'device_type': 'TABLET'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['device_type'], 'TABLET')
    
    def test_create_preview_with_default_device(self):
        """Test creating preview with default device (DESKTOP)"""
        url = f'/api/google_ads/{self.ad.id}/create_preview/'
        
        data = {}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['device_type'], 'DESKTOP')
    
    def test_create_preview_for_non_existent_ad(self):
        """Test creating preview for non-existent ad"""
        url = '/api/google_ads/99999/create_preview/'
        
        data = {
            'device_type': 'DESKTOP'
        }
        
        response = self.client.post(url, data, format='json')
        
        # create_preview view returns 404 for non-existent ad
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_preview_authentication_required(self):
        """Test that authentication is required"""
        self.client.logout()
        
        url = f'/api/google_ads/{self.ad.id}/create_preview/'
        response = self.client.post(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_preview_from_different_account(self):
        """Test that user cannot create preview for ad from different account"""
        other_user = create_test_user(username='otheruser', email='other@example.com')
        other_account = create_test_customer_account(other_user, customer_id='9876543210')
        other_ad = create_test_ad(other_user, other_account, name='Other Ad')
        
        url = f'/api/google_ads/{other_ad.id}/create_preview/'
        
        data = {
            'device_type': 'DESKTOP'
        }
        
        response = self.client.post(url, data, format='json')
        
        # create_preview view returns 404 for ad from different account
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class GetPreviewDataViewTest(TestCase):
    """Test cases for get_preview_data view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.ad = create_test_ad(self.user, self.customer_account, name='Test Ad')
        
        # Create preview
        token = secrets.token_urlsafe(32)
        expiration_time = timezone.now() + timedelta(days=7)
        
        self.preview = AdPreview.objects.create(
            token=token,
            ad=self.ad,
            device_type='DESKTOP',
            preview_data={'test': 'data'},
            created_by=self.user,
            expiration_date_time=expiration_time
        )
    
    def test_get_preview_data_success(self):
        """Test successful preview data retrieval"""
        url = f'/api/google_ads/preview/{self.preview.token}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # get_preview_data returns nested structure
        self.assertIn('ad', response.data)
        self.assertIn('device_type', response.data)
        self.assertEqual(response.data['ad']['name'], 'Test Ad')
    
    def test_get_preview_data_with_invalid_token(self):
        """Test retrieving preview with invalid token"""
        url = '/api/google_ads/preview/invalid_token/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_preview_data_with_expired_token(self):
        """Test retrieving preview with expired token"""
        # Create expired preview
        expired_token = secrets.token_urlsafe(32)
        expired_time = timezone.now() - timedelta(days=1)
        
        expired_preview = AdPreview.objects.create(
            token=expired_token,
            ad=self.ad,
            device_type='DESKTOP',
            preview_data={'test': 'data'},
            created_by=self.user,
            expiration_date_time=expired_time
        )
        
        url = f'/api/google_ads/preview/{expired_preview.token}/'
        response = self.client.get(url)
        
        # get_preview_data returns 410 for expired token
        self.assertEqual(response.status_code, status.HTTP_410_GONE)
    
    def test_get_preview_data_no_authentication_required(self):
        """Test that authentication is not required for preview"""
        # Preview should be accessible without authentication
        url = f'/api/google_ads/preview/{self.preview.token}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class AdUpdateViewTest(TestCase):
    """Test cases for AdUpdateView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad = create_test_ad(self.user, self.customer_account, name='Test Ad')
    
    def test_update_ad_success(self):
        """Test successful ad update"""
        url = f'/api/google_ads/{self.ad.id}/update/'
        
        data = {
            'name': 'Updated Ad',
            'status': 'APPROVED',
            'customer_account_id': self.customer_account.id
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Ad')
        self.assertEqual(response.data['status'], 'APPROVED')
    
    def test_update_ad_not_found(self):
        """Test updating non-existent ad"""
        url = '/api/google_ads/99999/update/'
        
        data = {
            'name': 'Updated Ad'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_ad_with_invalid_data(self):
        """Test updating ad with invalid data (validation error)"""
        url = f'/api/google_ads/{self.ad.id}/update/'
        
        data = {
            'status': 'INVALID_STATUS'  # Invalid status value
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Validation error returns field-specific errors
        self.assertIn('status', response.data)
    
    def test_update_ad_authentication_required(self):
        """Test that authentication is required"""
        self.client.logout()
        
        url = f'/api/google_ads/{self.ad.id}/update/'
        response = self.client.patch(url, {})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdDeleteViewTest(TestCase):
    """Test cases for AdDeleteView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad = create_test_ad(self.user, self.customer_account, name='Test Ad')
    
    def test_delete_ad_success(self):
        """Test successful ad deletion"""
        url = f'/api/google_ads/{self.ad.id}/delete/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Ad.objects.filter(id=self.ad.id).exists())
    
    def test_delete_ad_not_found(self):
        """Test deleting non-existent ad"""
        url = '/api/google_ads/99999/delete/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_ad_authentication_required(self):
        """Test that authentication is required"""
        self.client.logout()
        
        url = f'/api/google_ads/{self.ad.id}/delete/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

