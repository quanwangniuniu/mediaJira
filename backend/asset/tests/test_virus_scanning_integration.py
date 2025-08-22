"""
Integration tests for virus scanning workflow.
These tests focus on end-to-end virus scanning scenarios that simulate real file upload and scanning processes.
"""

import os
import tempfile
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from unittest.mock import patch, MagicMock

from asset.models import Asset, AssetVersion
from core.models import Organization, Team, Project
from task.models import Task

User = get_user_model()


class BaseVirusScanningTestCase(APITestCase):
    """Base test case for virus scanning integration testing"""
    
    def setUp(self):
        """Set up common test data"""
        # Create test users
        self.owner = User.objects.create_user(
            email='owner@example.com',
            username='owner',
            password='testpass123'
        )
        self.reviewer = User.objects.create_user(
            email='reviewer@example.com',
            username='reviewer',
            password='testpass123'
        )
        self.approver = User.objects.create_user(
            email='approver@example.com',
            username='approver',
            password='testpass123'
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

        # Create project and task (core models)
        self.project = Project.objects.create(name="Virus Scanning Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Virus Scanning Test Task", type="asset", project=self.project)
        
        # Authenticate as owner by default
        self.client.force_authenticate(user=self.owner)
    
    def create_test_file(self, filename='test_file.txt', content='Test content for virus scanning'):
        """Helper method to create a test file"""
        return SimpleUploadedFile(
            filename,
            content.encode('utf-8'),
            content_type='text/plain'
        )
    
    def create_asset(self, **kwargs):
        """Helper method to create an asset"""
        data = {
            'task': self.task.id,
            'team': self.team.id,
            'tags': ['virus-scanning', 'test'],
            **kwargs
        }
        response = self.client.post(reverse('asset:asset-list'), data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data
    
    def upload_version(self, asset_id, file_obj=None, **kwargs):
        """Helper method to upload a version"""
        if file_obj is None:
            file_obj = self.create_test_file()
        
        data = {
            'file': file_obj,
            **kwargs
        }
        response = self.client.post(
            reverse('asset:asset-version-list', kwargs={'asset_id': asset_id}),
            data,
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data
    
    def publish_version(self, asset_id, version_id):
        """Helper method to publish a version"""
        response = self.client.post(
            reverse('asset:asset-version-publish', kwargs={
                'asset_id': asset_id,
                'version_id': version_id
            })
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data
    
    def submit_asset(self, asset_id):
        """Helper method to submit an asset for review"""
        response = self.client.put(
            reverse('asset:asset-submit', kwargs={'pk': asset_id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data


class VirusScanningWorkflowIntegrationTest(BaseVirusScanningTestCase):
    """Integration tests for virus scanning workflow"""
    
    def test_virus_scanning_workflow_clean_file(self):
        """Test complete virus scanning workflow with a clean file"""
        
        # Step 1: Create an asset
        print("Step 1: Creating asset...")
        asset_data = self.create_asset()
        asset_id = asset_data['id']
        
        # Step 2: Upload version (this should trigger virus scanning)
        print("Step 2: Uploading version...")
        file_obj = self.create_test_file('clean_file.txt', 'This is a clean file')
        version_data = self.upload_version(asset_id, file_obj=file_obj)
        version_id = version_data['id']
        
        # Verify version was created with PENDING scan status
        self.assertEqual(version_data['scan_status'], AssetVersion.PENDING)
        
        # Step 3: Manually simulate virus scanning by updating scan status
        print("Step 3: Simulating virus scan...")
        version = AssetVersion.objects.get(id=version_id)
        version.scan_status = AssetVersion.CLEAN
        version.save(update_fields=['scan_status'])
        
        # Step 4: Verify scan results
        print("Step 4: Verifying scan results...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        
        # Version should now be marked as CLEAN
        self.assertEqual(version['scan_status'], AssetVersion.CLEAN)
        
        # Step 5: Now we can publish the version
        print("Step 5: Publishing version...")
        published_data = self.publish_version(asset_id, version_id)
        self.assertEqual(published_data['version_status'], AssetVersion.FINALIZED)
        
        # Step 6: Submit asset for review
        print("Step 6: Submitting asset...")
        submitted_data = self.submit_asset(asset_id)
        self.assertEqual(submitted_data['status'], Asset.PENDING_REVIEW)
        
        print("✅ Virus scanning workflow with clean file test passed!")
    
    def test_virus_scanning_workflow_infected_file(self):
        """Test virus scanning workflow with an infected file"""
        
        # Step 1: Create an asset
        print("Step 1: Creating asset...")
        asset_data = self.create_asset()
        asset_id = asset_data['id']
        
        # Step 2: Upload version with infected content
        print("Step 2: Uploading infected file...")
        # EICAR test virus content
        eicar_content = 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
        file_obj = self.create_test_file('infected_file.txt', eicar_content)
        version_data = self.upload_version(asset_id, file_obj=file_obj)
        version_id = version_data['id']
        
        # Step 3: Simulate virus scanning - mark as infected
        print("Step 3: Simulating virus scan...")
        version = AssetVersion.objects.get(id=version_id)
        version.scan_status = AssetVersion.INFECTED
        version.save(update_fields=['scan_status'])
        
        # Step 4: Verify scan results
        print("Step 4: Verifying scan results...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        
        # Version should be marked as INFECTED
        self.assertEqual(version['scan_status'], AssetVersion.INFECTED)
        
        # Step 5: Try to publish the version (should fail)
        print("Step 5: Attempting to publish infected version...")
        response = self.client.post(reverse('asset:asset-version-publish', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Step 6: Try to submit asset (should fail)
        print("Step 6: Attempting to submit asset with infected version...")
        response = self.client.put(reverse('asset:asset-submit', kwargs={'pk': asset_id}))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        print("✅ Virus scanning workflow with infected file test passed!")
    
    def test_virus_scanning_workflow_scan_error(self):
        """Test virus scanning workflow when scan fails"""
        
        # Step 1: Create an asset
        print("Step 1: Creating asset...")
        asset_data = self.create_asset()
        asset_id = asset_data['id']
        
        # Step 2: Upload version
        print("Step 2: Uploading version...")
        file_obj = self.create_test_file('test_file.txt', 'Test content')
        version_data = self.upload_version(asset_id, file_obj=file_obj)
        version_id = version_data['id']
        
        # Step 3: Simulate virus scanning - mark as error
        print("Step 3: Simulating virus scan error...")
        version = AssetVersion.objects.get(id=version_id)
        version.scan_status = AssetVersion.ERROR
        version.save(update_fields=['scan_status'])
        
        # Step 4: Verify scan results
        print("Step 4: Verifying scan results...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        
        # Version should be marked as ERROR
        self.assertEqual(version['scan_status'], AssetVersion.ERROR)
        
        # Step 5: Try to publish the version (should fail)
        print("Step 5: Attempting to publish version with scan error...")
        response = self.client.post(reverse('asset:asset-version-publish', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        print("✅ Virus scanning workflow with scan error test passed!")
    
    def test_virus_scanning_workflow_retry_mechanism(self):
        """Test virus scanning retry mechanism"""
        
        # Step 1: Create an asset
        print("Step 1: Creating asset...")
        asset_data = self.create_asset()
        asset_id = asset_data['id']
        
        # Step 2: Upload version
        print("Step 2: Uploading version...")
        file_obj = self.create_test_file('retry_test.txt', 'Test content for retry')
        version_data = self.upload_version(asset_id, file_obj=file_obj)
        version_id = version_data['id']
        
        # Step 3: Simulate first scan failure
        print("Step 3: Simulating first scan failure...")
        version = AssetVersion.objects.get(id=version_id)
        version.scan_status = AssetVersion.ERROR
        version.save(update_fields=['scan_status'])
        
        # Step 4: Verify first scan failed
        print("Step 4: Verifying first scan failed...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        self.assertEqual(version['scan_status'], AssetVersion.ERROR)
        
        # Step 5: Simulate retry success
        print("Step 5: Simulating retry success...")
        version_obj = AssetVersion.objects.get(id=version_id)
        version_obj.scan_status = AssetVersion.CLEAN
        version_obj.save(update_fields=['scan_status'])
        
        # Step 6: Verify retry succeeded
        print("Step 6: Verifying retry succeeded...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        self.assertEqual(version['scan_status'], AssetVersion.CLEAN)
        
        # Step 7: Now we can publish the version
        print("Step 7: Publishing version...")
        published_data = self.publish_version(asset_id, version_id)
        self.assertEqual(published_data['version_status'], AssetVersion.FINALIZED)
        
        print("✅ Virus scanning retry mechanism test passed!")
    
    def test_virus_scanning_workflow_bulk_scan(self):
        """Test bulk virus scanning of multiple pending versions"""
        
        # Step 1: Create multiple assets with pending versions
        print("Step 1: Creating multiple assets...")
        assets = []
        versions = []
        
        for i in range(3):
            asset_data = self.create_asset()
            asset_id = asset_data['id']
            assets.append(asset_data)
            
            file_obj = self.create_test_file(f'bulk_test_{i}.txt', f'Bulk test content {i}')
            version_data = self.upload_version(asset_id, file_obj=file_obj)
            versions.append(version_data)
            
            # Verify versions are pending
            self.assertEqual(version_data['scan_status'], AssetVersion.PENDING)
        
        # Step 2: Simulate bulk scan by updating all versions
        print("Step 2: Simulating bulk virus scan...")
        for i, version_data in enumerate(versions):
            version = AssetVersion.objects.get(id=version_data['id'])
            version.scan_status = AssetVersion.CLEAN
            version.save(update_fields=['scan_status'])
        
        # Step 3: Verify all versions were scanned
        print("Step 3: Verifying bulk scan results...")
        for i, version_data in enumerate(versions):
            response = self.client.get(reverse('asset:asset-version-detail', kwargs={
                'asset_id': assets[i]['id'],
                'version_id': version_data['id']
            }))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            version = response.data
            self.assertEqual(version['scan_status'], AssetVersion.CLEAN)
        
        # Step 4: Publish and submit all assets
        print("Step 4: Publishing and submitting all assets...")
        for i, version_data in enumerate(versions):
            asset_id = assets[i]['id']
            version_id = version_data['id']
            
            # Publish version
            published_data = self.publish_version(asset_id, version_id)
            self.assertEqual(published_data['version_status'], AssetVersion.FINALIZED)
            
            # Submit asset
            submitted_data = self.submit_asset(asset_id)
            self.assertEqual(submitted_data['status'], Asset.PENDING_REVIEW)
        
        print("✅ Virus scanning bulk scan test passed!")
    
    def test_virus_scanning_workflow_without_file(self):
        """Test virus scanning workflow for versions without files"""
        
        # Step 1: Create an asset
        print("Step 1: Creating asset...")
        asset_data = self.create_asset()
        asset_id = asset_data['id']
        
        # Step 2: Create version without file (this should not trigger scanning)
        print("Step 2: Creating version without file...")
        # We need to create the version directly since the API requires a file
        version = AssetVersion.objects.create(
            asset_id=asset_id,
            version_number=1,
            uploaded_by=self.owner,
            file=None
        )
        
        # Step 3: Verify scan status remains PENDING
        print("Step 3: Verifying scan status...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version.id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version_data = response.data
        self.assertEqual(version_data['scan_status'], AssetVersion.PENDING)
        
        # Step 4: Try to publish version (should fail - no file)
        print("Step 4: Attempting to publish version without file...")
        response = self.client.post(reverse('asset:asset-version-publish', kwargs={
            'asset_id': asset_id,
            'version_id': version.id
        }))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        print("✅ Virus scanning workflow without file test passed!")
    
    def test_virus_scanning_workflow_integration_with_publishing(self):
        """Test integration between virus scanning and version publishing"""
        
        # Step 1: Create an asset
        print("Step 1: Creating asset...")
        asset_data = self.create_asset()
        asset_id = asset_data['id']
        
        # Step 2: Upload version
        print("Step 2: Uploading version...")
        file_obj = self.create_test_file('integration_test.txt', 'Integration test content')
        version_data = self.upload_version(asset_id, file_obj=file_obj)
        version_id = version_data['id']
        
        # Step 3: Try to publish before scanning (should fail)
        print("Step 3: Attempting to publish before scanning...")
        response = self.client.post(reverse('asset:asset-version-publish', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Step 4: Simulate virus scan completion
        print("Step 4: Simulating virus scan completion...")
        version = AssetVersion.objects.get(id=version_id)
        version.scan_status = AssetVersion.CLEAN
        version.save(update_fields=['scan_status'])
        
        # Step 5: Verify scan completed
        print("Step 5: Verifying scan completed...")
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        self.assertEqual(version['scan_status'], AssetVersion.CLEAN)
        
        # Step 6: Now publish should work
        print("Step 6: Publishing version after scan...")
        published_data = self.publish_version(asset_id, version_id)
        self.assertEqual(published_data['version_status'], AssetVersion.FINALIZED)
        
        # Step 7: Submit asset
        print("Step 7: Submitting asset...")
        submitted_data = self.submit_asset(asset_id)
        self.assertEqual(submitted_data['status'], Asset.PENDING_REVIEW)
        
        # Step 8: Verify complete workflow
        print("Step 8: Verifying complete workflow...")
        response = self.client.get(reverse('asset:asset-detail', kwargs={'pk': asset_id}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        asset = response.data
        self.assertEqual(asset['status'], Asset.PENDING_REVIEW)
        
        # Check version details
        response = self.client.get(reverse('asset:asset-version-detail', kwargs={
            'asset_id': asset_id,
            'version_id': version_id
        }))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        version = response.data
        self.assertEqual(version['version_status'], AssetVersion.FINALIZED)
        self.assertEqual(version['scan_status'], AssetVersion.CLEAN)
        
        print("✅ Virus scanning integration with publishing test passed!")
