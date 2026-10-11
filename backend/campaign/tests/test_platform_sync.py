"""MED-242: Meta sync failures surface on campaigns in the organization schema."""

from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import pytest
import requests
from django.contrib.auth import get_user_model
from django.db import connection
from django.utils import timezone
from rest_framework.test import APIClient

from campaign.models import Campaign, CampaignPlatformIntegration
from campaign.services import CampaignPlatformIntegrationService
from core.models import Organization, OrganizationMembership, Project, ProjectMember
from core.services.auth_tokens import build_user_refresh_token
from core.services.tenant import slug_to_schema_name
from core.tenant_context import tenant_schema_context
from facebook_integration.models import FacebookConnection, MetaAdAccount
from meta_ads.meta_client import MetaApiError
from meta_ads.services import sync_ad_account
from meta_ads.tasks import sync_all_meta_connections, sync_single_ad_account
from notifications.models import Notification

pytestmark = pytest.mark.django_db

EXPIRED = MetaApiError('access_token=secret expired', 400, {'error': {'code': 190, 'type': 'OAuthException'}})


def make_tenant(project_id=None):
    org = Organization.objects.create(name=f'MED-242 {uuid4().hex[:8]}')
    user = get_user_model().objects.create_user(
        username=f'med242-{uuid4().hex[:8]}', email=f'{uuid4().hex}@example.com',
        password='x', organization=org, current_organization=org, is_verified=True,
    )
    OrganizationMembership.objects.create(user=user, organization=org)
    schema = slug_to_schema_name(org.slug)
    with tenant_schema_context(schema):
        project = Project.objects.create(
            name='Sync project', organization=org, owner=user,
            **({'id': project_id} if project_id else {}),
        )
        ProjectMember.objects.create(project=project, user=user, role='owner')
        campaign = Campaign.objects.create(
            name='Sync campaign', project=project, owner=user, creator=user,
            objective=Campaign.Objective.CONVERSION, platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
        )
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {build_user_refresh_token(user).access_token}')
    return SimpleNamespace(org=org, user=user, schema=schema, project=project, campaign=campaign, client=client)


@pytest.fixture(autouse=True)
def isolate_notification_channels():
    with patch('notifications.services.maybe_dispatch_external_channels'), patch(
        'notifications.services._push_notification_to_redis',
    ):
        yield


@pytest.fixture
def tenant():
    return make_tenant()


@pytest.fixture
def account(tenant):
    connection_ = FacebookConnection.objects.create(user=tenant.user, fb_user_id=f'fb-{uuid4().hex[:8]}')
    return MetaAdAccount.objects.create(
        connection=connection_, meta_account_id=uuid4().hex[:10], name='Test ad account',
        project_id=tenant.project.pk,
    )


def integration_for(tenant, account):
    with tenant_schema_context(tenant.schema):
        return CampaignPlatformIntegration.objects.get(campaign=tenant.campaign, ad_account=account)


def sync_failing_with(account, error):
    with patch('meta_ads.services.sync_campaigns', side_effect=error):
        return sync_ad_account(account, 'token')


def sync_successfully(account):
    with patch('meta_ads.services.graph_paged', return_value=[]):
        return sync_ad_account(account, 'token')


@pytest.mark.parametrize('error, expected', [
    (EXPIRED, 'auth'),
    (MetaApiError('invalid session', 400, {'error': {'code': '102'}}), 'auth'),
    (MetaApiError('unauthorized', 401), 'auth'),
    (MetaApiError('throttled', 400, {'error': {'code': 4, 'type': 'OAuthException'}}), 'transient'),
    (MetaApiError('throttled', 429), 'transient'),
    (MetaApiError('unavailable', 503), 'transient'),
    (MetaApiError('bad request', 400, 'not json'), 'transient'),
    (requests.Timeout('timeout'), 'transient'),
    (ValueError('unexpected'), 'transient'),
])
def test_classify_sync_error(error, expected):
    assert CampaignPlatformIntegrationService.classify_sync_error(error) == expected


def test_auth_error_sets_last_sync_error_and_notifies_owner_once(tenant, account):
    for _ in range(2):
        assert sync_failing_with(account, EXPIRED).status == 'error'

    integration = integration_for(tenant, account)
    assert integration.last_sync_error == 'auth'
    assert integration.last_sync_attempted_at is not None
    assert integration.last_synced_at is None
    notification = Notification.objects.get()
    assert notification.recipient_id == tenant.user.pk
    assert notification.category == 'INTEGRATIONS'
    assert notification.metadata['action'] == 'campaign_platform_auth_error'
    assert notification.action_url == f'/{tenant.org.slug}/{tenant.project.slug}/campaigns/{tenant.campaign.slug}'
    assert 'secret' not in notification.body


def test_transient_error_is_recorded_without_notification(tenant, account):
    sync_failing_with(account, requests.Timeout())
    assert integration_for(tenant, account).last_sync_error == 'transient'
    assert not Notification.objects.exists()


def test_transient_error_keeps_an_open_reconnect_warning(tenant, account):
    sync_failing_with(account, EXPIRED)
    sync_failing_with(account, requests.Timeout())
    assert integration_for(tenant, account).last_sync_error == 'auth'


def test_success_clears_the_error_and_a_new_expiry_notifies_again(tenant, account):
    sync_failing_with(account, EXPIRED)
    assert sync_successfully(account).status == 'ok'
    integration = integration_for(tenant, account)
    assert integration.last_sync_error == ''
    assert integration.last_synced_at is not None

    sync_failing_with(account, EXPIRED)
    assert Notification.objects.count() == 2


@pytest.mark.parametrize('run_task', [
    lambda account: sync_single_ad_account(account.pk),
    lambda account: sync_all_meta_connections(),
])
def test_missing_token_is_recorded_as_auth_error(tenant, account, run_task):
    with patch.object(FacebookConnection, 'get_access_token', return_value=None), patch(
        'meta_ads.services.sync_campaigns',
    ) as fetch:
        run_task(account)
    fetch.assert_not_called()
    assert integration_for(tenant, account).last_sync_error == 'auth'
    assert Notification.objects.count() == 1


def test_only_meta_campaigns_in_the_linked_project_get_sync_state(tenant, account):
    with tenant_schema_context(tenant.schema):
        other_project = Project.objects.create(name='Other', organization=tenant.org, owner=tenant.user)
        for project, platforms in [(other_project, ['META']), (tenant.project, ['GOOGLE_ADS'])]:
            Campaign.objects.create(
                name='Ignored', project=project, owner=tenant.user, creator=tenant.user,
                objective='CONVERSION', platforms=platforms, start_date=timezone.now().date(),
            )
    sync_failing_with(account, EXPIRED)
    with tenant_schema_context(tenant.schema):
        assert list(CampaignPlatformIntegration.objects.values_list('campaign_id', flat=True)) == [tenant.campaign.pk]


def test_same_project_id_in_two_of_the_connectors_organizations_is_skipped(tenant, account):
    other = make_tenant(project_id=tenant.project.pk)
    OrganizationMembership.objects.create(user=tenant.user, organization=other.org)
    sync_failing_with(account, EXPIRED)
    for schema in (tenant.schema, other.schema):
        with tenant_schema_context(schema):
            assert not CampaignPlatformIntegration.objects.exists()
    assert not Notification.objects.exists()


def test_campaign_detail_exposes_read_only_health(tenant, account):
    sync_failing_with(account, EXPIRED)
    url = f'/api/campaigns/{tenant.campaign.slug}/'
    response = tenant.client.get(url)
    assert response.status_code == 200, response.data
    health = response.data['platform_integrations'][0]
    assert health['last_sync_error'] == 'auth'
    assert health['account_name'] == 'Test ad account'
    assert health['can_reconnect'] is True
    assert 'token' not in str(health)

    assert tenant.client.patch(url, {'platform_integrations': []}, format='json').status_code == 200
    assert integration_for(tenant, account).last_sync_error == 'auth'


def test_only_the_original_connector_is_offered_reconnect(tenant, account):
    sync_failing_with(account, EXPIRED)
    teammate = get_user_model().objects.create_user(
        username=f'teammate-{uuid4().hex[:8]}', email=f'{uuid4().hex}@example.com', password='x',
        organization=tenant.org, current_organization=tenant.org, is_verified=True,
    )
    OrganizationMembership.objects.create(user=teammate, organization=tenant.org)
    with tenant_schema_context(tenant.schema):
        ProjectMember.objects.create(project=tenant.project, user=teammate, role='member')
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {build_user_refresh_token(teammate).access_token}')
    health = client.get(f'/api/campaigns/{tenant.campaign.slug}/').data['platform_integrations'][0]
    assert health['can_reconnect'] is False
    assert health['connector_name'] == tenant.user.username


def test_warning_is_hidden_after_the_account_is_unlinked(tenant, account):
    sync_failing_with(account, EXPIRED)
    MetaAdAccount.objects.filter(pk=account.pk).update(project=None)
    response = tenant.client.get(f'/api/campaigns/{tenant.campaign.slug}/')
    assert response.data['platform_integrations'] == []


def test_linking_an_organization_project_passes_database_constraints(tenant, account):
    MetaAdAccount.objects.filter(pk=account.pk).update(project=None)
    # Django defers FK checks to commit, which tests never reach; check now instead.
    with connection.cursor() as cursor:
        cursor.execute('SET CONSTRAINTS ALL IMMEDIATE')
    response = tenant.client.post(
        f'/api/facebook_integration/ad_accounts/{account.pk}/link_project/',
        {'project_id': tenant.project.pk}, format='json',
    )
    assert response.status_code == 200, response.data
    account.refresh_from_db()
    assert account.project_id == tenant.project.pk
