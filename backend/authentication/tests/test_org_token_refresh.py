import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient


User = get_user_model()


@pytest.mark.django_db
def test_refresh_org_token_success(authenticated_client):
    response = authenticated_client.post('/auth/organization-token/refresh/')

    assert response.status_code == status.HTTP_200_OK
    assert response.data.get('organization_access_token')


@pytest.mark.django_db
def test_refresh_org_token_requires_org():
    client = APIClient()
    user = User.objects.create_user(
        username="noorguser",
        email="noorg@example.com",
        password="TestPassword123!",
        is_verified=True,
        is_active=True,
    )
    client.force_authenticate(user=user)

    response = client.post('/auth/organization-token/refresh/')

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data.get('error')
