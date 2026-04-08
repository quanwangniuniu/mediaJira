from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch, MagicMock
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from .models import ZoomCredential
from .services import (
    get_authorization_url,
    exchange_code_for_token,
    refresh_access_token,
    get_valid_credential,
    save_token_for_user,
    create_zoom_meeting,
)

User = get_user_model()


# ─────────────────────────────────────────────
# Helper function: quickly create a test ZoomCredential
# ─────────────────────────────────────────────
def make_credential(user, expired=False):
    """
    Helper function: create a ZoomCredential for the test user
    expired=True  → token expired (for testing refresh logic)
    expired=False → token valid (default)
    """
    expires_at = timezone.now() + timedelta(hours=1)   # default 1 hour later
    if expired:
        expires_at = timezone.now() - timedelta(hours=1)  # set to 1 hour ago, expired

    return ZoomCredential.objects.create(
        user=user,
        access_token="test_access_token",
        refresh_token="test_refresh_token",
        token_expires_at=expires_at,
    )


# ─────────────────────────────────────────────
# 1. Model tests
# ─────────────────────────────────────────────
class ZoomCredentialModelTest(TestCase):

    def setUp(self):
        # create a clean test user for each test method
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_create_credential(self):
        """test if ZoomCredential can be created normally"""
        credential = make_credential(self.user)
        self.assertEqual(credential.user, self.user)
        self.assertEqual(credential.access_token, "test_access_token")
        self.assertEqual(credential.refresh_token, "test_refresh_token")

    def test_one_to_one_constraint(self):
        """
        test OneToOne constraint: a user cannot have two ZoomCredential
        second creation should raise an exception
        """
        make_credential(self.user)
        with self.assertRaises(Exception):
            make_credential(self.user)  # duplicate creation, should raise an exception

    def test_str_representation(self):
        """test if __str__ method returns the correct string"""
        credential = make_credential(self.user)
        self.assertIn("test@example.com", str(credential))


# ─────────────────────────────────────────────
# 2. Services tests
# ─────────────────────────────────────────────
class ZoomServiceTest(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )

    def test_get_authorization_url_contains_client_id(self):
        """
        test if the generated authorization URL contains the correct parameters
        patch to temporarily replace settings.ZOOM_CLIENT_ID, do not rely on real environment variables
        """
        with patch("zoom_integration.services.settings") as mock_settings:
            mock_settings.ZOOM_CLIENT_ID = "test_client_id"
            mock_settings.ZOOM_REDIRECT_URI = "http://localhost/api/v1/zoom/callback/"

            url = get_authorization_url("random_state_123")

            self.assertIn("test_client_id", url)
            self.assertIn("random_state_123", url)
            self.assertIn("zoom.us/oauth/authorize", url)

    @patch("zoom_integration.services.requests.post")
    def test_exchange_code_for_token_success(self, mock_post):
        """
        test if the token can be successfully exchanged for the authorization code
        mock requests.post, avoid sending real HTTP requests
        """
        # mock the token data returned by Zoom
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "new_access_token",
            "refresh_token": "new_refresh_token",
            "expires_in": 3600,
        }
        mock_post.return_value = mock_response

        with patch("zoom_integration.services.settings") as mock_settings:
            mock_settings.ZOOM_CLIENT_ID = "test_client_id"
            mock_settings.ZOOM_CLIENT_SECRET = "test_secret"
            mock_settings.ZOOM_REDIRECT_URI = "http://localhost/callback/"

            result = exchange_code_for_token("auth_code_123")

        self.assertEqual(result["access_token"], "new_access_token")
        self.assertEqual(result["refresh_token"], "new_refresh_token")

    @patch("zoom_integration.services.requests.post")
    def test_refresh_access_token(self, mock_post):
        """
        test if the refresh_token can successfully refresh the access_token
        """
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "access_token": "refreshed_access_token",
            "refresh_token": "refreshed_refresh_token",
            "expires_in": 3600,
        }
        mock_post.return_value = mock_response

        credential = make_credential(self.user, expired=True)

        with patch("zoom_integration.services.settings") as mock_settings:
            mock_settings.ZOOM_CLIENT_ID = "id"
            mock_settings.ZOOM_CLIENT_SECRET = "secret"

            updated = refresh_access_token(credential)

        # verify if the token in the database has been updated
        self.assertEqual(updated.access_token, "refreshed_access_token")
        self.assertEqual(updated.refresh_token, "refreshed_refresh_token")

    def test_get_valid_credential_raises_if_not_connected(self):
        """
        test if get_valid_credential should raise ValueError when user is not connected to Zoom
        """
        with self.assertRaises(ValueError) as ctx:
            get_valid_credential(self.user)

        self.assertIn("not connected to Zoom", str(ctx.exception))

    @patch("zoom_integration.services.refresh_access_token")
    def test_get_valid_credential_refreshes_when_expired(self, mock_refresh):
        """
        test if get_valid_credential should automatically call refresh_access_token when token is expired
        """
        credential = make_credential(self.user, expired=True)
        mock_refresh.return_value = credential  # return the same object after refresh

        get_valid_credential(self.user)

        # verify if refresh function is called once
        mock_refresh.assert_called_once_with(credential)

    def test_get_valid_credential_no_refresh_when_valid(self):
        """
        test if get_valid_credential should not trigger refresh when token is valid
        """
        make_credential(self.user, expired=False)

        with patch("zoom_integration.services.refresh_access_token") as mock_refresh:
            get_valid_credential(self.user)
            mock_refresh.assert_not_called()  # verify if refresh function is not called

    def test_save_token_for_user_creates_new(self):
        """test if save_token_for_user should create a new credential when user does not have one"""
        token_data = {
            "access_token": "acc_token",
            "refresh_token": "ref_token",
            "expires_in": 3600,
        }
        credential = save_token_for_user(self.user, token_data)

        self.assertEqual(credential.access_token, "acc_token")
        self.assertEqual(ZoomCredential.objects.filter(user=self.user).count(), 1)

    def test_save_token_for_user_updates_existing(self):
        """test if save_token_for_user should update the existing credential when user already has one"""
        make_credential(self.user)  # create one first

        token_data = {
            "access_token": "updated_token",
            "refresh_token": "updated_refresh",
            "expires_in": 3600,
        }
        save_token_for_user(self.user, token_data)

        # verify if there is only one credential in the database, and the content has been updated
        self.assertEqual(ZoomCredential.objects.filter(user=self.user).count(), 1)
        self.assertEqual(
            ZoomCredential.objects.get(user=self.user).access_token,
            "updated_token"
        )

    @patch("zoom_integration.services.requests.post")
    @patch("zoom_integration.services.get_valid_credential")
    def test_create_zoom_meeting_success(self, mock_get_cred, mock_post):
        """
        test if create_zoom_meeting should return the correct data
        """
        # mock a valid credential
        mock_credential = MagicMock()
        mock_credential.access_token = "valid_token"
        mock_get_cred.return_value = mock_credential

        # mock the meeting data returned by Zoom
        mock_response = MagicMock()
        mock_response.status_code = 201
        mock_response.json.return_value = {
            "id": "123456789",
            "topic": "Test Meeting",
            "join_url": "https://zoom.us/j/123456789",
            "start_url": "https://zoom.us/s/123456789",
            "start_time": "2026-04-10T10:00:00Z",
            "duration": 60,
        }
        mock_post.return_value = mock_response

        result = create_zoom_meeting(
            user=self.user,
            topic="Test Meeting",
            start_time="2026-04-10T10:00:00Z",
            duration=60,
        )

        self.assertEqual(result["join_url"], "https://zoom.us/j/123456789")
        self.assertEqual(result["topic"], "Test Meeting")

    @patch("zoom_integration.services.requests.post")
    @patch("zoom_integration.services.get_valid_credential")
    def test_create_zoom_meeting_401_raises_permission_error(self, mock_get_cred, mock_post):
        """
        test if create_zoom_meeting should raise PermissionError when Zoom API returns 401
        """
        mock_credential = MagicMock()
        mock_credential.access_token = "expired_token"
        mock_get_cred.return_value = mock_credential

        mock_response = MagicMock()
        mock_response.status_code = 401  # mock token expired
        mock_post.return_value = mock_response

        with self.assertRaises(PermissionError):
            create_zoom_meeting(
                user=self.user,
                topic="Test",
                start_time="2026-04-10T10:00:00Z",
            )


# ─────────────────────────────────────────────
# 3. API Views tests
# ─────────────────────────────────────────────
class ZoomAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
        )
        # force authentication, skip token validation, focus on testing business logic
        self.client.force_authenticate(user=self.user)

    # ── Status API ──
    def test_status_not_connected(self):
        """test if status should return connected=false when user is not connected to Zoom"""
        response = self.client.get("/api/v1/zoom/status/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["connected"])

    def test_status_connected(self):
        """test if status should return connected=true when user is connected to Zoom"""
        make_credential(self.user)
        response = self.client.get("/api/v1/zoom/status/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["connected"])

    def test_status_requires_authentication(self):
        """test if status should return 401 when user is not authenticated"""
        self.client.force_authenticate(user=None)  # un-authenticate
        response = self.client.get("/api/v1/zoom/status/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Connect API ──
    def test_connect_returns_auth_url(self):
        """test if connect should return the correct auth_url"""
        with patch("zoom_integration.services.settings") as mock_settings:
            mock_settings.ZOOM_CLIENT_ID = "test_id"
            mock_settings.ZOOM_REDIRECT_URI = "http://localhost/callback/"

            response = self.client.get("/api/v1/zoom/connect/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("auth_url", response.data)
        self.assertIn("zoom.us", response.data["auth_url"])

    # ── Disconnect API ──
    def test_disconnect_removes_credential(self):
        """test if disconnect should remove the user's ZoomCredential"""
        make_credential(self.user)
        response = self.client.delete("/api/v1/zoom/disconnect/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(ZoomCredential.objects.filter(user=self.user).exists())

    def test_disconnect_when_not_connected(self):
        """test if disconnect should return 200 when user is not connected to Zoom"""
        response = self.client.delete("/api/v1/zoom/disconnect/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # ── Create Meeting API ──
    @patch("zoom_integration.views.create_zoom_meeting")
    def test_create_meeting_success(self, mock_create):
        """test if create_meeting should return the correct data"""
        mock_create.return_value = {
            "id": "123456789",
            "topic": "Sprint Review",
            "join_url": "https://zoom.us/j/123456789",
            "start_url": "https://zoom.us/s/123456789",
            "start_time": "2026-04-10T10:00:00Z",
            "duration": 60,
        }

        response = self.client.post("/api/v1/zoom/meetings/", {
            "topic": "Sprint Review",
            "start_time": "2026-04-10T10:00:00Z",
            "duration": 60,
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("join_url", response.data)
        self.assertEqual(response.data["topic"], "Sprint Review")

    def test_create_meeting_missing_topic(self):
        """test if create_meeting should return 400 when missing required field topic"""
        response = self.client.post("/api/v1/zoom/meetings/", {
            "start_time": "2026-04-10T10:00:00Z",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_meeting_invalid_time_format(self):
        """test if create_meeting should return 400 when time format is invalid"""
        response = self.client.post("/api/v1/zoom/meetings/", {
            "topic": "Test",
            "start_time": "not-a-date",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("zoom_integration.views.create_zoom_meeting")
    def test_create_meeting_user_not_connected(self, mock_create):
        """test if create_meeting should return 403 when user is not connected to Zoom"""
        mock_create.side_effect = ValueError("user is not connected to Zoom")

        response = self.client.post("/api/v1/zoom/meetings/", {
            "topic": "Test",
            "start_time": "2026-04-10T10:00:00Z",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch("zoom_integration.views.create_zoom_meeting")
    def test_create_meeting_token_expired(self, mock_create):
        """test if create_meeting should return 401 when token is expired"""
        mock_create.side_effect = PermissionError("Zoom authorization has expired")

        response = self.client.post("/api/v1/zoom/meetings/", {
            "topic": "Test",
            "start_time": "2026-04-10T10:00:00Z",
        }, format="json")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Callback API ──
    @patch("zoom_integration.views.exchange_code_for_token")
    @patch("zoom_integration.views.save_token_for_user")
    def test_callback_success(self, mock_save, mock_exchange):
        """test if callback should redirect to frontend success page when OAuth callback is successful"""
        mock_exchange.return_value = {
            "access_token": "token",
            "refresh_token": "refresh",
            "expires_in": 3600,
        }
        mock_save.return_value = MagicMock()

        # set the state and user_id in the session (simulate the state set in the connect process)
        session = self.client.session
        session["zoom_oauth_state"] = "valid_state"
        session["zoom_oauth_user_id"] = self.user.id
        session.save()

        response = self.client.get(
            "/api/v1/zoom/callback/",
            {"code": "auth_code_123", "state": "valid_state"}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("zoom_connected=true", response["Location"])

    def test_callback_invalid_state(self):
        """test if callback should redirect to error page when state is invalid"""
        session = self.client.session
        session["zoom_oauth_state"] = "correct_state"
        session["zoom_oauth_user_id"] = self.user.id
        session.save()

        response = self.client.get(
            "/api/v1/zoom/callback/",
            {"code": "some_code", "state": "wrong_state"}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("zoom_error=invalid_state", response["Location"])

    def test_callback_user_denied(self):
        """test if callback should redirect to error page when user denies authorization"""
        session = self.client.session
        session["zoom_oauth_state"] = "valid_state"
        session["zoom_oauth_user_id"] = self.user.id
        session.save()

        response = self.client.get(
            "/api/v1/zoom/callback/",
            {"error": "access_denied", "state": "valid_state"}
        )

        self.assertEqual(response.status_code, status.HTTP_302_FOUND)
        self.assertIn("zoom_error=access_denied", response["Location"])