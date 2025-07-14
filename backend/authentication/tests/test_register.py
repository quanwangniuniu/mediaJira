import uuid
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from authentication.models import CustomUser

class RegisterViewTests(APITestCase):

    def setUp(self):
        self.register_url = reverse('register') 
        self.valid_data = {
            "email": "test@example.com",
            "password": "securepass",
            "name": "Test User",
            "org_code": "ORG123"
        }

    def test_successful_registration(self):
        response = self.client.post(self.register_url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)
        self.assertTrue(CustomUser.objects.filter(email="test@example.com").exists())

    def test_missing_fields(self):
        data = {
            "email": "test2@example.com",
            "password": "securepass"
            # missing name
        }
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_short_password(self):
        data = self.valid_data.copy()
        data["password"] = "short"
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_duplicate_email_within_same_org(self):
        # Create the first user
        CustomUser.objects.create_user(
            email="test@example.com",
            password="securepass",
            name="Existing User",
            org_code="ORG123",
            is_verified=False,
            verification_token=str(uuid.uuid4())
        )

        # Try to register again with the same email and org_code
        response = self.client.post(self.register_url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)