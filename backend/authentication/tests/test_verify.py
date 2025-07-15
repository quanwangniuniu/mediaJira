from django.test import TestCase
from django.urls import reverse
from authentication.models import CustomUser
import uuid

class EmailVerificationTests(TestCase):
    def setUp(self):
        self.token = str(uuid.uuid4())
        self.user = CustomUser.objects.create_user(
            email="verifyme@example.com",
            password="password123",
            name="Verify Me",
            verification_token=self.token,
            is_verified=False
        )
        self.verify_url = reverse("verify")

    def test_valid_token_verifies_user(self):
        response = self.client.get(f"{self.verify_url}?token={self.token}")
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_verified)
        self.assertIsNone(self.user.verification_token)

    def test_invalid_token(self):
        response = self.client.get(f"{self.verify_url}?token=invalidtoken")
        self.assertEqual(response.status_code, 400)

    def test_already_verified(self):
        self.user.is_verified = True
        self.user.save()
        response = self.client.get(f"{self.verify_url}?token={self.token}")
        self.assertEqual(response.status_code, 200)
        self.assertIn("already verified", response.data["message"].lower())