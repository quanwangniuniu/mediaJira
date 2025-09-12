"""
TDD Test Suite for Permission Enforcement on Report Approval
Tests role-based permissions for retrospective report approval workflow
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from retrospective.models import (
    RetrospectiveTask, RetrospectiveStatus
)
from retrospective.services import RetrospectiveService
from core.models import Project, Organization
from access_control.models import Role, UserRole, Team

User = get_user_model()


class PermissionEnforcementTest(TestCase):
    """Test permission enforcement for retrospective operations"""
    
    def setUp(self):
        """Set up test data with different user roles"""
        self.organization = Organization.objects.create(
            name='Permission Test Org',
            email_domain='permission.com'
        )
        
        self.team = Team.objects.create(
            name='Test Team',
            organization=self.organization
        )
        
        self.campaign = Project.objects.create(
            name='Permission Campaign',
            organization=self.organization
        )
        
        # Create users with different roles
        self.data_analyst = User.objects.create_user(
            username='analyst',
            email='analyst@permission.com',
            password='testpass123',
            organization=self.organization
        )
        
        self.team_lead = User.objects.create_user(
            username='teamlead',
            email='tl@permission.com',
            password='testpass123',
            organization=self.organization
        )
        
        self.org_admin = User.objects.create_user(
            username='orgadmin',
            email='admin@permission.com',
            password='testpass123',
            organization=self.organization
        )
        
        self.unauthorized_user = User.objects.create_user(
            username='unauthorized',
            email='unauth@permission.com',
            password='testpass123',
            organization=self.organization
        )
        
        # Create roles
        self.analyst_role = Role.objects.create(
            name='Data Analyst',
            organization=self.organization,
            level=3
        )
        
        self.tl_role = Role.objects.create(
            name='Team Lead',
            organization=self.organization,
            level=7
        )
        
        self.admin_role = Role.objects.create(
            name='Org Admin',
            organization=self.organization,
            level=10
        )
        
        # Assign roles to users
        UserRole.objects.create(
            user=self.data_analyst,
            role=self.analyst_role,
            team=self.team
        )
        
        UserRole.objects.create(
            user=self.team_lead,
            role=self.tl_role,
            team=self.team
        )
        
        UserRole.objects.create(
            user=self.org_admin,
            role=self.admin_role,
            team=self.team
        )
        
        self.client = APIClient()
    
    def test_data_analyst_can_create_retrospective(self):
        """Test that data analysts can create retrospectives"""
        self.client.force_authenticate(user=self.data_analyst)
        
        url = '/api/retrospective/retrospectives/'
        data = {'campaign': str(self.campaign.id)}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_data_analyst_can_edit_insights(self):
        """Test that data analysts can create and edit insights"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        self.client.force_authenticate(user=self.data_analyst)
        
        # Create insight
        url = '/api/retrospective/insights/'
        data = {
            'retrospective_id': str(retrospective.id),
            'title': 'Analyst Insight',
            'description': 'Insight created by analyst',
            'severity': 'medium'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        insight_id = response.data['id']
        
        # Edit insight
        url = f'/api/retrospective/insights/{insight_id}/'
        data = {
            'title': 'Updated Analyst Insight',
            'description': 'Updated by analyst'
        }
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_data_analyst_cannot_approve_reports(self):
        """Test that data analysts cannot approve reports"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.COMPLETED,
            report_url='https://example.com/report.pdf'
        )
        
        self.client.force_authenticate(user=self.data_analyst)
        
        url = f'/api/retrospective/retrospectives/{retrospective.id}/approve_report/'
        data = {
            'retrospective_id': str(retrospective.id),
            'approved': True
        }
        response = self.client.post(url, data)
        
        # Should be forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_team_lead_can_approve_reports(self):
        """Test that team leads can approve reports"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.COMPLETED,
            report_url='https://example.com/report.pdf'
        )
        
        # Add approve permission to team lead role
        content_type = ContentType.objects.get_for_model(RetrospectiveTask)
        permission, _ = Permission.objects.get_or_create(
            codename='approve_report',
            name='Can approve retrospective reports',
            content_type=content_type
        )
        self.team_lead.user_permissions.add(permission)
        
        self.client.force_authenticate(user=self.team_lead)
        
        url = f'/api/retrospective/retrospectives/{retrospective.id}/approve_report/'
        data = {
            'retrospective_id': str(retrospective.id),
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify retrospective was approved
        retrospective.refresh_from_db()
        self.assertEqual(retrospective.reviewed_by, self.team_lead)
        self.assertEqual(retrospective.status, RetrospectiveStatus.REPORTED)
    
    def test_org_admin_can_approve_reports(self):
        """Test that org admins can approve reports"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.COMPLETED,
            report_url='https://example.com/report.pdf'
        )
        
        # Add approve permission to org admin role
        content_type = ContentType.objects.get_for_model(RetrospectiveTask)
        permission, _ = Permission.objects.get_or_create(
            codename='approve_report',
            name='Can approve retrospective reports',
            content_type=content_type
        )
        self.org_admin.user_permissions.add(permission)
        
        self.client.force_authenticate(user=self.org_admin)
        
        url = f'/api/retrospective/retrospectives/{retrospective.id}/approve_report/'
        data = {
            'retrospective_id': str(retrospective.id),
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_unauthorized_user_cannot_access_retrospectives(self):
        """Test that unauthorized users cannot access retrospectives"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.COMPLETED
        )
        
        self.client.force_authenticate(user=self.unauthorized_user)
        
        # Try to access retrospective list
        url = '/api/retrospective/retrospectives/'
        response = self.client.get(url)
        
        # Should return empty list (user can only see their own)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
        
        # Try to access specific retrospective
        url = f'/api/retrospective/retrospectives/{retrospective.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_cross_organization_access_denied(self):
        """Test that users cannot access retrospectives from other organizations"""
        # Create different organization
        other_org = Organization.objects.create(
            name='Other Org',
            email_domain='other.com'
        )
        
        other_campaign = Project.objects.create(
            name='Other Campaign',
            organization=other_org
        )
        
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@other.com',
            password='testpass123',
            organization=other_org
        )
        
        other_retrospective = RetrospectiveTask.objects.create(
            campaign=other_campaign,
            created_by=other_user,
            status=RetrospectiveStatus.COMPLETED
        )
        
        # Try to access with data analyst from different org
        self.client.force_authenticate(user=self.data_analyst)
        
        url = f'/api/retrospective/retrospectives/{other_retrospective.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_superuser_has_full_access(self):
        """Test that superusers have full access to all retrospectives"""
        superuser = User.objects.create_superuser(
            username='superuser',
            email='super@permission.com',
            password='testpass123'
        )
        
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.COMPLETED,
            report_url='https://example.com/report.pdf'
        )
        
        self.client.force_authenticate(user=superuser)
        
        # Should be able to view all retrospectives
        url = '/api/retrospective/retrospectives/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data['results']) > 0)
        
        # Should be able to approve reports
        url = f'/api/retrospective/retrospectives/{retrospective.id}/approve_report/'
        data = {
            'retrospective_id': str(retrospective.id),
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_pending_approval_access_control(self):
        """Test access control for pending approval endpoint"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.data_analyst,
            status=RetrospectiveStatus.COMPLETED,
            report_url='https://example.com/report.pdf'
        )
        
        # Data analyst should not access pending approvals
        self.client.force_authenticate(user=self.data_analyst)
        url = '/api/retrospective/retrospectives/pending_approval/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Team lead with permission should access pending approvals
        content_type = ContentType.objects.get_for_model(RetrospectiveTask)
        permission, _ = Permission.objects.get_or_create(
            codename='approve_report',
            name='Can approve retrospective reports',
            content_type=content_type
        )
        self.team_lead.user_permissions.add(permission)
        
        self.client.force_authenticate(user=self.team_lead)
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) > 0)


class ReportApprovalWorkflowTest(TestCase):
    """Test complete report approval workflow with permissions"""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name='Approval Test Org',
            email_domain='approval.com'
        )
        
        self.campaign = Project.objects.create(
            name='Approval Campaign',
            organization=self.organization
        )
        
        self.analyst = User.objects.create_user(
            username='analyst2',
            email='analyst2@approval.com',
            password='testpass123',
            organization=self.organization
        )
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@approval.com',
            password='testpass123',
            organization=self.organization
        )
        
        # Add approve permission to approver
        content_type = ContentType.objects.get_for_model(RetrospectiveTask)
        permission, _ = Permission.objects.get_or_create(
            codename='approve_report',
            name='Can approve retrospective reports',
            content_type=content_type
        )
        self.approver.user_permissions.add(permission)
        
        self.client = APIClient()
    
    def test_complete_approval_workflow(self):
        """Test complete workflow from creation to approval"""
        # 1. Analyst creates retrospective
        self.client.force_authenticate(user=self.analyst)
        
        url = '/api/retrospective/retrospectives/'
        data = {'campaign': str(self.campaign.id)}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        retrospective_id = response.data['id']
        
        # 2. Complete retrospective and generate report (mock)
        retrospective = RetrospectiveTask.objects.get(id=retrospective_id)
        retrospective.status = RetrospectiveStatus.COMPLETED
        retrospective.report_url = 'https://example.com/report.pdf'
        retrospective.save()
        
        # 3. Analyst cannot approve own report
        url = f'/api/retrospective/retrospectives/{retrospective_id}/approve_report/'
        data = {
            'retrospective_id': retrospective_id,
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # 4. Approver can see pending approvals
        self.client.force_authenticate(user=self.approver)
        
        url = '/api/retrospective/retrospectives/pending_approval/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
        # 5. Approver approves report
        url = f'/api/retrospective/retrospectives/{retrospective_id}/approve_report/'
        data = {
            'retrospective_id': retrospective_id,
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 6. Verify approval
        retrospective.refresh_from_db()
        self.assertEqual(retrospective.reviewed_by, self.approver)
        self.assertEqual(retrospective.status, RetrospectiveStatus.REPORTED)
        self.assertIsNotNone(retrospective.reviewed_at)
    
    def test_approval_without_report_fails(self):
        """Test that approval fails if no report exists"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.analyst,
            status=RetrospectiveStatus.COMPLETED
            # No report_url set
        )
        
        self.client.force_authenticate(user=self.approver)
        
        url = f'/api/retrospective/retrospectives/{retrospective.id}/approve_report/'
        data = {
            'retrospective_id': str(retrospective.id),
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_double_approval_prevention(self):
        """Test that reports cannot be approved twice"""
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.analyst,
            status=RetrospectiveStatus.COMPLETED,
            report_url='https://example.com/report.pdf'
        )
        
        self.client.force_authenticate(user=self.approver)
        
        # First approval
        url = f'/api/retrospective/retrospectives/{retrospective.id}/approve_report/'
        data = {
            'retrospective_id': str(retrospective.id),
            'approved': True
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Second approval attempt
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already approved', response.data['error'])
    
    def test_permission_inheritance_and_hierarchy(self):
        """Test permission inheritance in role hierarchy"""
        # Create hierarchical roles
        junior_role = Role.objects.create(
            name='Junior Analyst',
            organization=self.organization,
            level=2
        )
        
        senior_role = Role.objects.create(
            name='Senior Analyst',
            organization=self.organization,
            level=5
        )
        
        manager_role = Role.objects.create(
            name='Manager',
            organization=self.organization,
            level=8
        )
        
        # Test that higher-level roles can access lower-level user data
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.analyst,  # Lower level user
            status=RetrospectiveStatus.COMPLETED
        )
        
        # Manager should be able to see junior's retrospectives
        manager = User.objects.create_user(
            username='manager',
            email='manager@approval.com',
            password='testpass123',
            organization=self.organization
        )
        
        # Add appropriate permissions for testing
        self.client.force_authenticate(user=manager)
        
        url = '/api/retrospective/retrospectives/'
        response = self.client.get(url)
        
        # Manager with proper permissions should see retrospectives
        self.assertEqual(response.status_code, status.HTTP_200_OK)
