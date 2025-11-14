from django.test import TestCase
from google_ads.serializers import AdSerializer
from google_ads.models import Ad, CustomerAccount
from django.contrib.auth import get_user_model

User = get_user_model()

class AdSerializerTest(TestCase):
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.customer_account = CustomerAccount.objects.create(
            customer_id='1234567890',
            descriptive_name='Test Account',
            status='ACTIVE',
            created_by=self.user
        )
    
    def test_ad_creation_without_resource_name(self):
        """Test that ad can be created without providing resource_name"""
        test_data = {
            "name": "Test Ad",
            "type": "RESPONSIVE_SEARCH_AD",
            "status": "DRAFT",
            "final_urls": ["https://example.com"],
            "customer_account_id": self.customer_account.id,
            "created_by_id": self.user.id
        }
        
        serializer = AdSerializer(data=test_data)
        
        # Should be valid
        self.assertTrue(serializer.is_valid(), f"Validation errors: {serializer.errors}")
        
        # Should create ad successfully
        ad = serializer.save()
        
        # Check that ad was created with proper resource_name
        self.assertIsNotNone(ad.id)
        self.assertEqual(ad.name, "Test Ad")
        self.assertEqual(ad.type, "RESPONSIVE_SEARCH_AD")
        self.assertEqual(ad.status, "DRAFT")
        self.assertIsNotNone(ad.resource_name)
        self.assertTrue(ad.resource_name.startswith("customers/"))
        self.assertTrue(ad.resource_name.endswith(f"/ads/{ad.id}"))
        
        print(f"SUCCESS: Ad created with ID {ad.id} and resource_name {ad.resource_name}")
