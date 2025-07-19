from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from access_control.models import Organization
User = get_user_model()

class CustomUserModelTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name="TestOrg")

    def test_create_user_success(self):
        user = User.objects.create_user(
            email="modeluser@example.com",
            password="securepass",
            username="modeluser",
            organization=self.org
        )
        self.assertEqual(user.email, "modeluser@example.com")
        self.assertTrue(user.check_password("securepass"))
        self.assertEqual(user.organization, self.org)
        self.assertTrue(user.is_active)

    def test_email_uniqueness(self):
        User.objects.create_user(
            email="unique@example.com",
            password="securepass",
            username="user1"
        )
        with self.assertRaises(IntegrityError):
            User.objects.create_user(
                email="unique@example.com",
                password="securepass",
                username="user2"
            )

    def test_required_email(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email=None,
                password="securepass",
                username="nouser"
            )

    def test_str_method(self):
        user = User.objects.create_user(
            email="struser@example.com",
            password="securepass",
            username="struser"
        )
        self.assertEqual(str(user), "struser@example.com")

    def test_default_is_active(self):
        user = User.objects.create_user(
            email="activeuser@example.com",
            password="securepass",
            username="activeuser"
        )
        self.assertTrue(user.is_active) 