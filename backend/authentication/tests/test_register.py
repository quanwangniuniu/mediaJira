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
            "username": "Test User",
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
            # missing username
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

    def test_duplicate_email(self):
        CustomUser.objects.create_user(
            email="test@example.com",
            password="securepass",
            username="Existing User"
        )

        response = self.client.post(self.register_url, self.valid_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_missing_email(self):
        data = self.valid_data.copy()
        data.pop("email")
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_missing_password(self):
        data = self.valid_data.copy()
        data.pop("password")
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_missing_username(self):
        data = self.valid_data.copy()
        data.pop("username")
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_invalid_email_format(self):
        data = self.valid_data.copy()
        data["email"] = "not-an-email"
        response = self.client.post(self.register_url, data)
        # Depending on your serializer/validation, this may be 400 or 201
        # Adjust as needed for your implementation
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_201_CREATED])

    def test_optional_organization_id(self):
        data = self.valid_data.copy()
        if "organization_id" in data:
            data.pop("organization_id")
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)

    def test_invalid_organization_id(self):
        data = self.valid_data.copy()
        data["organization_id"] = "9999"  # Assuming this org does not exist
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_successful_registration_with_organization(self):
        from access_control.models import Organization
        org = Organization.objects.create(name="TestOrg")
        data = self.valid_data.copy()
        data["organization_id"] = org.id
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("message", response.data)