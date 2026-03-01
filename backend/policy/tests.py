from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status

from core.models import Organization, Project, ProjectMember
from task.models import Task
from policy.models import (
    PlatformPolicyUpdate, Platform, PolicyChangeType, MitigationStatus,
)

User = get_user_model()

LIST_URL = '/api/policy/platform-policy-updates/'
CHOICES_URL = '/api/policy/policy-choices/'


def detail_url(pk):
    return f'{LIST_URL}{pk}/'


def action_url(pk, action):
    return f'{LIST_URL}{pk}/{action}/'


class _BaseSetup(APITestCase):
    """Shared setUp: org → user → project → membership, authenticated client."""

    def setUp(self):
        self.organization = Organization.objects.create(
            name='Test Org', email_domain='test.com',
        )
        self.user = User.objects.create_user(
            username='testuser', email='test@test.com',
            password='testpass123', organization=self.organization,
        )
        self.project = Project.objects.create(
            name='Test Project', organization=self.organization,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user, project=self.project,
            role='member', is_active=True,
        )
        self.task = Task.objects.create(
            summary='Policy task', type='platform_policy_update',
            project=self.project, owner=self.user,
        )
        self.client.force_authenticate(user=self.user)

    def _make_payload(self, **overrides):
        defaults = {
            'platform': 'meta',
            'policy_change_type': 'targeting_rules',
            'policy_description': 'New targeting restrictions',
            'immediate_actions_required': 'Review affected campaigns',
            'task_id': self.task.id,
        }
        defaults.update(overrides)
        return defaults

    def _create_ppu(self, **overrides):
        """Create a PlatformPolicyUpdate directly in the DB."""
        defaults = {
            'platform': Platform.META,
            'policy_change_type': PolicyChangeType.TARGETING_RULES,
            'policy_description': 'Test policy change',
            'immediate_actions_required': 'Take action',
            'task': self.task,
            'created_by': self.user,
        }
        defaults.update(overrides)
        return PlatformPolicyUpdate.objects.create(**defaults)


# ---------------------------------------------------------------------------
# 1. Model tests
# ---------------------------------------------------------------------------
class TestModelBasic(_BaseSetup):

    def test_create_minimal_object(self):
        ppu = self._create_ppu()
        self.assertIsNotNone(ppu.id)
        self.assertEqual(ppu.platform, 'meta')
        self.assertEqual(ppu.mitigation_status, MitigationStatus.NOT_STARTED)

    def test_str_representation(self):
        ppu = self._create_ppu()
        self.assertIn(str(ppu.id), str(ppu))
        self.assertIn(str(self.task.id), str(ppu))

    def test_default_json_fields_are_empty_lists(self):
        ppu = self._create_ppu()
        for field in ('affected_campaigns', 'affected_ad_sets',
                      'affected_assets', 'mitigation_steps',
                      'related_references'):
            self.assertEqual(getattr(ppu, field), [])

    def test_valid_mitigation_steps_accepted(self):
        steps = [
            {'step': 'Pause campaigns', 'status': 'pending'},
            {'step': 'Notify client', 'status': 'in_progress'},
            {'step': 'Update assets', 'status': 'completed'},
        ]
        ppu = self._create_ppu(mitigation_steps=steps)
        self.assertEqual(len(ppu.mitigation_steps), 3)

    def test_mitigation_steps_not_a_list_rejected(self):
        with self.assertRaises(ValidationError) as ctx:
            self._create_ppu(mitigation_steps='not a list')
        self.assertIn('mitigation_steps', ctx.exception.message_dict)

    def test_mitigation_steps_item_not_dict_rejected(self):
        with self.assertRaises(ValidationError):
            self._create_ppu(mitigation_steps=['bad'])

    def test_mitigation_steps_missing_keys_rejected(self):
        with self.assertRaises(ValidationError):
            self._create_ppu(mitigation_steps=[{'step': 'x'}])

    def test_mitigation_steps_invalid_status_rejected(self):
        with self.assertRaises(ValidationError):
            self._create_ppu(
                mitigation_steps=[{'step': 'x', 'status': 'unknown'}],
            )

    def test_mark_mitigation_completed(self):
        ppu = self._create_ppu()
        ppu.mark_mitigation_completed()
        ppu.refresh_from_db()
        self.assertEqual(ppu.mitigation_status, MitigationStatus.COMPLETED)
        self.assertIsNotNone(ppu.mitigation_completed_at)

    def test_mark_reviewed(self):
        ppu = self._create_ppu()
        ppu.mark_mitigation_completed()
        reviewer = User.objects.create_user(
            username='reviewer', email='r@test.com',
            password='pass123', organization=self.organization,
        )
        ppu.mark_reviewed(user=reviewer)
        ppu.refresh_from_db()
        self.assertEqual(ppu.mitigation_status, MitigationStatus.REVIEWED)
        self.assertEqual(ppu.reviewed_by, reviewer)
        self.assertIsNotNone(ppu.review_completed_at)


# ---------------------------------------------------------------------------
# 2. Model constraint: task type enforcement
# ---------------------------------------------------------------------------
class TestModelTaskTypeConstraint(_BaseSetup):

    def test_wrong_task_type_rejected(self):
        bad_task = Task.objects.create(
            summary='Budget task', type='budget',
            project=self.project, owner=self.user,
        )
        with self.assertRaises(ValidationError) as ctx:
            self._create_ppu(task=bad_task)
        self.assertIn('task', ctx.exception.message_dict)

    def test_correct_task_type_accepted(self):
        ppu = self._create_ppu(task=self.task)
        self.assertEqual(ppu.task, self.task)

    def test_null_task_accepted(self):
        ppu = self._create_ppu(task=None)
        self.assertIsNone(ppu.task)


# ---------------------------------------------------------------------------
# 3. API CRUD
# ---------------------------------------------------------------------------
class TestAPICrud(_BaseSetup):

    def test_list_returns_200(self):
        self._create_ppu()
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 1)

    def test_create_returns_201(self):
        resp = self.client.post(LIST_URL, self._make_payload(), format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['platform'], 'meta')
        # created_by auto-set to request user
        self.assertEqual(resp.data['created_by']['id'], self.user.id)

    def test_create_without_task_returns_201(self):
        resp = self.client.post(
            LIST_URL,
            self._make_payload(task_id=None),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data['task'])

    def test_retrieve_returns_200(self):
        ppu = self._create_ppu()
        resp = self.client.get(detail_url(ppu.id))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['id'], ppu.id)

    def test_partial_update_returns_200(self):
        ppu = self._create_ppu()
        resp = self.client.patch(
            detail_url(ppu.id),
            {'policy_description': 'Updated'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['policy_description'], 'Updated')

    def test_delete_returns_204(self):
        ppu = self._create_ppu()
        resp = self.client.delete(detail_url(ppu.id))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(
            PlatformPolicyUpdate.objects.filter(id=ppu.id).exists()
        )

    def test_create_with_assigned_to(self):
        other = User.objects.create_user(
            username='other', email='o@test.com',
            password='pass123', organization=self.organization,
        )
        resp = self.client.post(
            LIST_URL,
            self._make_payload(assigned_to_id=other.id),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['assigned_to']['id'], other.id)

    def test_update_assigned_to_via_patch(self):
        ppu = self._create_ppu()
        other = User.objects.create_user(
            username='other2', email='o2@test.com',
            password='pass123', organization=self.organization,
        )
        resp = self.client.patch(
            detail_url(ppu.id),
            {'assigned_to_id': other.id},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['assigned_to']['id'], other.id)

    def test_read_only_fields_not_writable(self):
        resp = self.client.post(
            LIST_URL,
            self._make_payload(),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn('created_at', resp.data)
        self.assertIn('updated_at', resp.data)


# ---------------------------------------------------------------------------
# 4. API auth
# ---------------------------------------------------------------------------
class TestAPIAuth(_BaseSetup):

    def test_unauthenticated_list_rejected(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(LIST_URL)
        self.assertIn(resp.status_code, (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN,
        ))

    def test_unauthenticated_create_rejected(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(
            LIST_URL, self._make_payload(), format='json',
        )
        self.assertIn(resp.status_code, (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN,
        ))

    def test_unauthenticated_choices_rejected(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(CHOICES_URL)
        self.assertIn(resp.status_code, (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN,
        ))


# ---------------------------------------------------------------------------
# 5. Custom actions: mark-mitigation-completed, mark-reviewed
# ---------------------------------------------------------------------------
class TestActionMitigationCompleted(_BaseSetup):

    def test_mark_mitigation_completed_success(self):
        ppu = self._create_ppu(mitigation_status=MitigationStatus.IN_PROGRESS)
        resp = self.client.post(
            action_url(ppu.id, 'mark-mitigation-completed'),
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['mitigation_status'], 'completed')
        self.assertIsNotNone(resp.data['mitigation_completed_at'])

    def test_mark_completed_rejected_when_already_completed(self):
        ppu = self._create_ppu(mitigation_status=MitigationStatus.COMPLETED)
        resp = self.client.post(
            action_url(ppu.id, 'mark-mitigation-completed'),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)

    def test_mark_completed_rejected_when_already_reviewed(self):
        ppu = self._create_ppu(mitigation_status=MitigationStatus.REVIEWED)
        resp = self.client.post(
            action_url(ppu.id, 'mark-mitigation-completed'),
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class TestActionMarkReviewed(_BaseSetup):

    def test_mark_reviewed_success(self):
        ppu = self._create_ppu(mitigation_status=MitigationStatus.COMPLETED)
        resp = self.client.post(action_url(ppu.id, 'mark-reviewed'))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['mitigation_status'], 'reviewed')
        self.assertEqual(resp.data['reviewed_by']['id'], self.user.id)

    def test_mark_reviewed_rejected_when_not_completed(self):
        ppu = self._create_ppu(mitigation_status=MitigationStatus.IN_PROGRESS)
        resp = self.client.post(action_url(ppu.id, 'mark-reviewed'))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', resp.data)

    def test_mark_reviewed_rejected_when_not_started(self):
        ppu = self._create_ppu(mitigation_status=MitigationStatus.NOT_STARTED)
        resp = self.client.post(action_url(ppu.id, 'mark-reviewed'))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# 6. get_policy_choices endpoint
# ---------------------------------------------------------------------------
class TestPolicyChoices(_BaseSetup):

    def test_returns_200_with_all_keys(self):
        resp = self.client.get(CHOICES_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('platforms', resp.data)
        self.assertIn('policy_change_types', resp.data)
        self.assertIn('mitigation_statuses', resp.data)

    def test_platforms_count_matches_enum(self):
        resp = self.client.get(CHOICES_URL)
        self.assertEqual(len(resp.data['platforms']), len(Platform.choices))

    def test_policy_change_types_count(self):
        resp = self.client.get(CHOICES_URL)
        self.assertEqual(
            len(resp.data['policy_change_types']),
            len(PolicyChangeType.choices),
        )

    def test_mitigation_statuses_count(self):
        resp = self.client.get(CHOICES_URL)
        self.assertEqual(
            len(resp.data['mitigation_statuses']),
            len(MitigationStatus.choices),
        )

    def test_choice_structure_has_value_and_label(self):
        resp = self.client.get(CHOICES_URL)
        first_platform = resp.data['platforms'][0]
        self.assertIn('value', first_platform)
        self.assertIn('label', first_platform)


# ---------------------------------------------------------------------------
# 7. Query-param filters
# ---------------------------------------------------------------------------
class TestQueryParamFilter(_BaseSetup):

    def test_filter_by_platform(self):
        self._create_ppu(platform=Platform.META)
        task2 = Task.objects.create(
            summary='T2', type='platform_policy_update',
            project=self.project, owner=self.user,
        )
        self._create_ppu(platform=Platform.GOOGLE_ADS, task=task2)

        resp = self.client.get(LIST_URL, {'platform': 'meta'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['platform'], 'meta')

    def test_filter_by_mitigation_status(self):
        self._create_ppu(mitigation_status=MitigationStatus.IN_PROGRESS)
        task2 = Task.objects.create(
            summary='T2', type='platform_policy_update',
            project=self.project, owner=self.user,
        )
        self._create_ppu(
            mitigation_status=MitigationStatus.COMPLETED, task=task2,
        )

        resp = self.client.get(LIST_URL, {'mitigation_status': 'in_progress'})
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['mitigation_status'], 'in_progress')

    def test_filter_by_policy_change_type(self):
        self._create_ppu(policy_change_type=PolicyChangeType.PRIVACY_POLICY)
        resp = self.client.get(
            LIST_URL, {'policy_change_type': 'privacy_policy'},
        )
        self.assertEqual(len(resp.data['results']), 1)

    def test_filter_by_assigned_to_id(self):
        other = User.objects.create_user(
            username='assigned', email='a@test.com',
            password='pass123', organization=self.organization,
        )
        self._create_ppu(assigned_to=other)
        resp = self.client.get(LIST_URL, {'assigned_to_id': other.id})
        self.assertEqual(len(resp.data['results']), 1)

    def test_filter_by_task_id(self):
        self._create_ppu()
        resp = self.client.get(LIST_URL, {'task_id': self.task.id})
        self.assertEqual(len(resp.data['results']), 1)

    def test_filter_no_match_returns_empty(self):
        self._create_ppu()
        resp = self.client.get(LIST_URL, {'platform': 'snapchat'})
        self.assertEqual(len(resp.data['results']), 0)


# ---------------------------------------------------------------------------
# 8. Serializer validation (tested through API)
# ---------------------------------------------------------------------------
class TestSerializerValidationViaAPI(_BaseSetup):

    def test_create_with_wrong_task_type_rejected(self):
        bad_task = Task.objects.create(
            summary='Budget task', type='budget',
            project=self.project, owner=self.user,
        )
        resp = self.client.post(
            LIST_URL,
            self._make_payload(task_id=bad_task.id),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_with_nonexistent_task_rejected(self):
        resp = self.client.post(
            LIST_URL,
            self._make_payload(task_id=99999),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_task_id_rejected(self):
        ppu = self._create_ppu()
        task2 = Task.objects.create(
            summary='T2', type='platform_policy_update',
            project=self.project, owner=self.user,
        )
        resp = self.client.patch(
            detail_url(ppu.id),
            {'task_id': task2.id},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_mitigation_steps_via_api(self):
        resp = self.client.post(
            LIST_URL,
            self._make_payload(mitigation_steps=[{'bad': 'data'}]),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_mitigation_steps_via_api(self):
        steps = [{'step': 'Pause ads', 'status': 'pending'}]
        resp = self.client.post(
            LIST_URL,
            self._make_payload(mitigation_steps=steps),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['mitigation_steps'], steps)


# ---------------------------------------------------------------------------
# 9. Access control: project scoping
# ---------------------------------------------------------------------------
class TestProjectScoping(_BaseSetup):

    def test_user_without_membership_sees_nothing(self):
        self._create_ppu()
        other_user = User.objects.create_user(
            username='outsider', email='out@test.com',
            password='pass123', organization=self.organization,
        )
        self.client.force_authenticate(user=other_user)
        resp = self.client.get(LIST_URL)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data['results']), 0)

    def test_taskless_ppu_visible_to_creator(self):
        """PPU with task=None should be visible to the user who created it."""
        resp = self.client.post(
            LIST_URL,
            self._make_payload(task_id=None),
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        list_resp = self.client.get(LIST_URL)
        self.assertEqual(len(list_resp.data['results']), 1)
