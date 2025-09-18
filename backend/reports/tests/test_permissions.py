# test_permissions.py
from django.test import TestCase
from django.contrib.auth.models import Group, AnonymousUser
from core.models import CustomUser
from rest_framework.test import APIRequestFactory
from rest_framework import status

from reports.models import Report, ReportAnnotation, ReportSection, ReportAsset, Job
from reports.permissions import (
    _has_role,
    IsReportViewer,
    IsReportEditor,
    IsApprover,
    IsAuthorApproverOrAdmin
)


class TestPermissionHelpers(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create test users
        self.user1 = CustomUser.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='testpass123'
        )
        
        self.user2 = CustomUser.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        
        # Create groups
        self.viewer_group = Group.objects.create(name='viewer')
        self.editor_group = Group.objects.create(name='editor')
        self.approver_group = Group.objects.create(name='approver')
        
        # Create test report
        self.report = Report.objects.create(
            id='test_report',
            title='Test Report',
            owner_id=str(self.user1.id),
            status='draft'
        )
        
        # Create test annotation
        self.annotation = ReportAnnotation.objects.create(
            id='test_annotation',
            report=self.report,
            body_md='Test annotation',
            author_id=str(self.user1.id)
        )
        
        # Create test section
        self.section = ReportSection.objects.create(
            id='test_section',
            report=self.report,
            title='Test Section',
            order_index=0,
            content_md='Test content'
        )
        
        # Create test asset
        self.asset = ReportAsset.objects.create(
            id='test_asset',
            report=self.report,
            file_url='http://example.com/test.pdf',
            file_type='pdf'
        )
        
        # Create test job
        self.job = Job.objects.create(
            id='test_job',
            report=self.report,
            type='export',
            status='queued'
        )

    def test_has_role_authenticated_user(self):
        """Test _has_role with authenticated user"""
        # Test viewer role
        self.user2.groups.add(self.viewer_group)
        self.assertTrue(_has_role(self.user2, 'viewer'))
        
        # Test editor role
        self.user1.groups.add(self.editor_group)
        self.assertTrue(_has_role(self.user1, 'editor'))
        
        # Test approver role
        self.user2.groups.add(self.approver_group)
        self.assertTrue(_has_role(self.user2, 'approver'))

    def test_has_role_unauthenticated_user(self):
        """Test _has_role with unauthenticated user"""
        anonymous = AnonymousUser()
        self.assertFalse(_has_role(anonymous, 'viewer'))
        self.assertFalse(_has_role(anonymous, 'editor'))
        self.assertFalse(_has_role(anonymous, 'approver'))

    def test_has_role_no_role(self):
        """Test _has_role with user having no roles"""
        self.assertFalse(_has_role(self.user1, 'viewer'))
        self.assertFalse(_has_role(self.user1, 'editor'))
        self.assertFalse(_has_role(self.user1, 'approver'))


class TestIsReportViewer(TestCase):
    def setUp(self):
        """Set up test data"""
        self.factory = APIRequestFactory()
        
        # Create test users
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.viewer = CustomUser.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='testpass123'
        )
        
        self.editor = CustomUser.objects.create_user(
            username='editor',
            email='editor@example.com',
            password='testpass123'
        )
        
        self.approver = CustomUser.objects.create_user(
            username='approver',
            email='approver@example.com',
            password='testpass123'
        )
        
        
        # Create groups and assign users
        viewer_group = Group.objects.create(name='viewer')
        editor_group = Group.objects.create(name='editor')
        approver_group = Group.objects.create(name='approver')
        
        self.viewer.groups.add(viewer_group)
        self.editor.groups.add(editor_group)
        self.approver.groups.add(approver_group)
        
        # Create test report
        self.report = Report.objects.create(
            id='test_report',
            title='Test Report',
            owner_id=str(self.user.id),
            status='draft'
        )
        
        self.permission = IsReportViewer()

    def test_has_permission_safe_methods_viewer(self):
        """Test has_permission with safe methods for viewer"""
        request = self.factory.get('/api/reports/')
        request.user = self.viewer
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)

    def test_has_permission_safe_methods_editor(self):
        """Test has_permission with safe methods for editor"""
        request = self.factory.get('/api/reports/')
        request.user = self.editor
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)

    def test_has_permission_safe_methods_approver(self):
        """Test has_permission with safe methods for approver"""
        request = self.factory.get('/api/reports/')
        request.user = self.approver
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)


    def test_has_permission_unsafe_methods(self):
        """Test has_permission with unsafe methods"""
        request = self.factory.post('/api/reports/')
        request.user = self.viewer
        
        result = self.permission.has_permission(request, None)
        self.assertFalse(result)


    def test_has_object_permission_safe_methods_viewer(self):
        """Test has_object_permission with safe methods for viewer"""
        request = self.factory.get('/api/reports/test_report/')
        request.user = self.viewer
        
        result = self.permission.has_object_permission(request, None, self.report)
        self.assertTrue(result)

    def test_has_object_permission_unsafe_methods(self):
        """Test has_object_permission with unsafe methods"""
        request = self.factory.post('/api/reports/test_report/')
        request.user = self.user
        
        result = self.permission.has_object_permission(request, None, self.report)
        self.assertFalse(result)


class TestIsReportEditor(TestCase):
    def setUp(self):
        """Set up test data"""
        self.factory = APIRequestFactory()
        
        # Create test users
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.editor = CustomUser.objects.create_user(
            username='editor',
            email='editor@example.com',
            password='testpass123'
        )
        
        
        # Create groups
        editor_group = Group.objects.create(name='editor')
        self.editor.groups.add(editor_group)
        
        # Create test report
        self.report = Report.objects.create(
            id='test_report',
            title='Test Report',
            owner_id=str(self.user.id),
            status='draft'
        )
        
        self.permission = IsReportEditor()

    def test_has_permission_safe_methods(self):
        """Test has_permission with safe methods"""
        request = self.factory.get('/api/reports/')
        request.user = self.user
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)

    def test_has_permission_unsafe_methods_editor(self):
        """Test has_permission with unsafe methods for editor"""
        request = self.factory.post('/api/reports/')
        request.user = self.editor
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)


    def test_has_permission_unsafe_methods_regular_user(self):
        """Test has_permission with unsafe methods for regular user"""
        request = self.factory.post('/api/reports/')
        request.user = self.user
        
        result = self.permission.has_permission(request, None)
        self.assertFalse(result)

    def test_has_object_permission_safe_methods(self):
        """Test has_object_permission with safe methods"""
        request = self.factory.get('/api/reports/test_report/')
        request.user = self.user
        
        result = self.permission.has_object_permission(request, None, self.report)
        self.assertTrue(result)


    def test_has_object_permission_unsafe_methods_editor(self):
        """Test has_object_permission with unsafe methods for editor"""
        request = self.factory.post('/api/reports/test_report/')
        request.user = self.editor
        
        result = self.permission.has_object_permission(request, None, self.report)
        self.assertTrue(result)



class TestIsApprover(TestCase):
    def setUp(self):
        """Set up test data"""
        self.factory = APIRequestFactory()
        
        # Create test users
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.approver = CustomUser.objects.create_user(
            username='approver',
            email='approver@example.com',
            password='testpass123'
        )
        
        
        # Create groups
        approver_group = Group.objects.create(name='approver')
        self.approver.groups.add(approver_group)
        
        # Create test report
        self.report = Report.objects.create(
            id='test_report',
            title='Test Report',
            owner_id=str(self.user.id),
            status='draft'
        )
        
        self.permission = IsApprover()

    def test_has_permission_approver(self):
        """Test has_permission for approver"""
        request = self.factory.post('/api/reports/test_report/approve/')
        request.user = self.approver
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)


    def test_has_permission_regular_user(self):
        """Test has_permission for regular user"""
        request = self.factory.post('/api/reports/test_report/approve/')
        request.user = self.user
        
        result = self.permission.has_permission(request, None)
        self.assertFalse(result)

    def test_has_object_permission_approver(self):
        """Test has_object_permission for approver"""
        request = self.factory.post('/api/reports/test_report/approve/')
        request.user = self.approver
        
        result = self.permission.has_object_permission(request, None, self.report)
        self.assertTrue(result)


    def test_has_object_permission_regular_user(self):
        """Test has_object_permission for regular user"""
        request = self.factory.post('/api/reports/test_report/approve/')
        request.user = self.user
        
        result = self.permission.has_object_permission(request, None, self.report)
        self.assertFalse(result)


class TestIsAuthorApproverOrAdmin(TestCase):
    def setUp(self):
        """Set up test data"""
        self.factory = APIRequestFactory()
        
        # Create test users
        self.user = CustomUser.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.viewer = CustomUser.objects.create_user(
            username='viewer',
            email='viewer@example.com',
            password='testpass123'
        )
        
        self.editor = CustomUser.objects.create_user(
            username='editor',
            email='editor@example.com',
            password='testpass123'
        )
        
        self.approver = CustomUser.objects.create_user(
            username='approver',
            email='approver@example.com',
            password='testpass123'
        )
        
        
        # Create groups
        viewer_group = Group.objects.create(name='viewer')
        editor_group = Group.objects.create(name='editor')
        approver_group = Group.objects.create(name='approver')
        
        self.viewer.groups.add(viewer_group)
        self.editor.groups.add(editor_group)
        self.approver.groups.add(approver_group)
        
        # Create test annotation
        self.annotation = ReportAnnotation.objects.create(
            id='test_annotation',
            report=Report.objects.create(
                id='test_report',
                title='Test Report',
                owner_id=str(self.user.id),
                status='draft'
            ),
            body_md='Test annotation',
            author_id=str(self.user.id)
        )
        
        self.permission = IsAuthorApproverOrAdmin()

    def test_has_permission_safe_methods_viewer(self):
        """Test has_permission with safe methods for viewer"""
        request = self.factory.get('/api/reports/test_report/annotations/')
        request.user = self.viewer
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)

    def test_has_permission_safe_methods_editor(self):
        """Test has_permission with safe methods for editor"""
        request = self.factory.get('/api/reports/test_report/annotations/')
        request.user = self.editor
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)

    def test_has_permission_unsafe_methods_editor(self):
        """Test has_permission with unsafe methods for editor"""
        request = self.factory.post('/api/reports/test_report/annotations/')
        request.user = self.editor
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)

    def test_has_permission_unsafe_methods_approver(self):
        """Test has_permission with unsafe methods for approver"""
        request = self.factory.post('/api/reports/test_report/annotations/')
        request.user = self.approver
        
        result = self.permission.has_permission(request, None)
        self.assertTrue(result)


    def test_has_permission_unsafe_methods_viewer(self):
        """Test has_permission with unsafe methods for viewer"""
        request = self.factory.post('/api/reports/test_report/annotations/')
        request.user = self.viewer
        
        result = self.permission.has_permission(request, None)
        self.assertFalse(result)



    def test_has_object_permission_unsafe_methods_editor(self):
        """Test has_object_permission with unsafe methods for editor"""
        request = self.factory.post('/api/reports/test_report/annotations/test_annotation/')
        request.user = self.editor
        
        result = self.permission.has_object_permission(request, None, self.annotation)
        self.assertTrue(result)

    def test_has_object_permission_unsafe_methods_approver(self):
        """Test has_object_permission with unsafe methods for approver"""
        request = self.factory.post('/api/reports/test_report/annotations/test_annotation/')
        request.user = self.approver
        
        result = self.permission.has_object_permission(request, None, self.annotation)
        self.assertTrue(result)


    def test_has_object_permission_unsafe_methods_viewer(self):
        """Test has_object_permission with unsafe methods for viewer"""
        request = self.factory.post('/api/reports/test_report/annotations/test_annotation/')
        request.user = self.viewer
        
        result = self.permission.has_object_permission(request, None, self.annotation)
        self.assertFalse(result)
