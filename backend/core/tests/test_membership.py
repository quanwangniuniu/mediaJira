"""
MODULE 1 — Project Membership Check Tests

Tests for:
- CheckProjectMembershipView
- CheckProjectAccessMiddleware
"""
import json
import pytest
from django.urls import reverse
from rest_framework import status
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from core.middleware.project_access import CheckProjectAccessMiddleware
from core.models import Project, ProjectMember


@pytest.mark.django_db
class TestCheckProjectMembershipView:
    """Tests for CheckProjectMembershipView"""

    def test_user_without_projects_returns_false(self, authenticated_client):
        """User without projects should return has_project=false"""
        url = reverse('check-project-membership')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['has_project'] is False
        assert response.data['project_count'] == 0
        assert response.data['active_project_id'] is None

    def test_user_with_projects_returns_active_project_id(self, authenticated_client, project, user):
        """User with projects should return active_project_id"""
        # Set active project
        user.active_project = project
        user.save()

        url = reverse('check-project-membership')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['has_project'] is True
        assert response.data['project_count'] == 1
        assert response.data['active_project_id'] == project.id

    def test_user_with_multiple_projects_returns_count(self, authenticated_client, project, project2, user):
        """User with multiple projects should return correct count"""
        # Set active project
        user.active_project = project
        user.save()

        url = reverse('check-project-membership')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['has_project'] is True
        assert response.data['project_count'] == 2
        assert response.data['active_project_id'] == project.id

    def test_user_with_inactive_membership_not_counted(self, authenticated_client, project, user):
        """Inactive memberships should not be counted"""
        # Deactivate membership
        membership = ProjectMember.objects.get(user=user, project=project)
        membership.is_active = False
        membership.save()

        url = reverse('check-project-membership')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['has_project'] is False
        assert response.data['project_count'] == 0


@pytest.mark.django_db
class TestCheckProjectAccessMiddleware:
    """Tests for CheckProjectAccessMiddleware"""

    def test_middleware_blocks_tasks_without_project(self, user):
        """Middleware should block /api/tasks/ when user has no active project"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        request = factory.post('/api/tasks/')
        request.user = user  # User is authenticated by default (not AnonymousUser)

        response = middleware.process_request(request)

        assert response is not None
        assert response.status_code == 403
        response_data = json.loads(response.content)
        assert 'requires_onboarding' in response_data

    def test_middleware_blocks_tasks_without_active_project(self, user, project):
        """Middleware should block /api/tasks/ when user has membership but no active project"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        # User has membership but no active project
        ProjectMember.objects.get_or_create(
            user=user, 
            project=project, 
            defaults={'is_active': True, 'role': 'member'}
        )
        user.active_project = None
        user.save()

        request = factory.post('/api/tasks/')
        request.user = user  # User is authenticated by default

        response = middleware.process_request(request)

        assert response is not None
        assert response.status_code == 403
        response_data = json.loads(response.content)
        assert 'requires_active_project' in response_data

    def test_middleware_allows_tasks_with_active_project(self, user, project):
        """Middleware should allow /api/tasks/ when user has active project"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        # User has active project
        ProjectMember.objects.get_or_create(
            user=user, 
            project=project, 
            defaults={'is_active': True, 'role': 'member'}
        )
        user.active_project = project
        user.save()

        request = factory.post('/api/tasks/')
        request.user = user  # User is authenticated by default

        response = middleware.process_request(request)

        assert response is None  # Middleware allows request to proceed

    def test_middleware_allows_onboarding_endpoints(self, user):
        """Middleware should allow onboarding endpoints"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        request = factory.post('/api/core/projects/onboarding/')
        request.user = user  # User is authenticated by default

        response = middleware.process_request(request)

        assert response is None  # Middleware allows request to proceed

    def test_middleware_allows_check_membership_endpoint(self, user):
        """Middleware should allow check-project-membership endpoint"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        request = factory.get('/api/core/check-project-membership/')
        request.user = user  # User is authenticated by default

        response = middleware.process_request(request)

        assert response is None  # Middleware allows request to proceed

    def test_middleware_allows_authentication_endpoints(self):
        """Middleware should allow authentication endpoints"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        request = factory.post('/api/authentication/login/')
        request.user = AnonymousUser()  # Not authenticated

        response = middleware.process_request(request)

        assert response is None  # Middleware allows request to proceed

    def test_middleware_allows_non_task_endpoints(self, user):
        """Middleware should allow non-task endpoints"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        request = factory.get('/api/core/projects/')
        request.user = user  # User is authenticated by default

        response = middleware.process_request(request)

        assert response is None  # Middleware allows request to proceed

    def test_middleware_skips_unauthenticated_users(self):
        """Middleware should skip unauthenticated users"""
        factory = RequestFactory()
        middleware = CheckProjectAccessMiddleware(lambda req: None)

        request = factory.post('/api/tasks/')
        # No user attribute

        response = middleware.process_request(request)

        assert response is None  # Middleware skips unauthenticated users

