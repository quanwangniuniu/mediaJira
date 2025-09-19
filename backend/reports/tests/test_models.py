"""
Test models functionality
"""
import pytest
from django.test import TestCase
from core.models import CustomUser
from reports.models import (
    ReportTemplate, Report, ReportSection, ReportAnnotation, 
    ReportApproval, ReportAsset
)


@pytest.mark.django_db
class TestReportModels(TestCase):
    """Test report models"""
    
    def setUp(self):
        """Set up test data"""
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            password="testpass"
        )
    
    def test_report_template_creation(self):
        """Test report template creation"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[
                {"type": "header", "content": "Test Report"},
                {"type": "kpi", "metrics": ["total_cost", "total_revenue"]}
            ],
            variables={"total_records": 0}
        )
        
        assert template.id == "test_template"
        assert template.name == "Test Template"
        assert template.version == 1
        assert len(template.blocks) == 2
        assert "total_records" in template.variables
    
    def test_report_creation(self):
        """Test report creation"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={"total_records": 100}
        )
        
        assert report.id == "test_report"
        assert report.title == "Test Report"
        assert report.owner_id == self.user.username
        assert report.status == "draft"
        assert report.slice_config["total_records"] == 100
    
    def test_report_section_creation(self):
        """Test report section creation"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={}
        )
        
        section = ReportSection.objects.create(
            report=report,
            title="Test Section",
            order_index=0,
            content_md="# Test Section\n{{ table(data) }}",
            charts=[{"type": "line", "title": "Test Chart"}]
        )
        
        assert section.report == report
        assert section.title == "Test Section"
        assert section.order_index == 0
        assert "{{ table(data) }}" in section.content_md
        assert len(section.charts) == 1
    
    def test_report_annotation_creation(self):
        """Test report annotation creation"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={}
        )
        
        annotation = ReportAnnotation.objects.create(
            report=report,
            author_id=self.user.username,
            body_md="Test annotation content"
        )
        
        assert annotation.report == report
        assert annotation.author_id == self.user.username
        assert annotation.body_md == "Test annotation content"
        assert annotation.status == "open"  # Default status
    
    def test_report_approval_creation(self):
        """Test report approval creation"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={}
        )
        
        approval = ReportApproval.objects.create(
            report=report,
            approver_id=self.user.username,
            status="approved",
            comment="Test approval"
        )
        
        assert approval.report == report
        assert approval.approver_id == self.user.username
        assert approval.status == "approved"
        assert approval.comment == "Test approval"
    
    def test_report_asset_creation(self):
        """Test report asset creation"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={}
        )
        
        asset = ReportAsset.objects.create(
            report=report,
            file_type="pdf",
            file_url="/tmp/test_report.pdf",
            checksum="abc123def456"
        )
        
        assert asset.report == report
        assert asset.file_type == "pdf"
        assert asset.file_url == "/tmp/test_report.pdf"
        assert asset.checksum == "abc123def456"
    
    def test_report_status_transitions(self):
        """Test report status transitions"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={}
        )
        
        # Test status transitions
        assert report.status == "draft"
        
        report.status = "in_review"
        report.save()
        assert report.status == "in_review"
        
        report.status = "approved"
        report.save()
        assert report.status == "approved"
        
        # Test re-approval mode (approved -> draft)
        report.status = "draft"
        report.save()
        assert report.status == "draft"
    
    def test_annotation_resolution(self):
        """Test annotation resolution workflow"""
        template = ReportTemplate.objects.create(
            id="test_template",
            name="Test Template",
            version=1,
            blocks=[],
            variables={}
        )
        
        report = Report.objects.create(
            id="test_report",
            title="Test Report",
            owner_id=self.user.username,
            report_template=template,
            status="draft",
            slice_config={}
        )
        
        annotation = ReportAnnotation.objects.create(
            report=report,
            author_id=self.user.username,
            body_md="Test annotation"
        )
        
        # Test resolution
        assert annotation.status == "open"
        
        annotation.status = "resolved"
        annotation.resolved_by = self.user.username
        annotation.save()
        
        assert annotation.status == "resolved"
        assert annotation.resolved_by == self.user.username
