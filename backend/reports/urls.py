# reports/urls.py
from django.urls import path, include
from .views import (
    DimensionsView,
    # Report Template Views
    ReportTemplateListCreateView,
    ReportTemplateDetailView,
    # Report Views
    ReportListCreateView,
    ReportDetailView,
    ReportSubmitView,
    ReportApproveView,
    ReportExportView,
    ReportPublishConfluenceView,
    # Report Section Views
    ReportSectionListCreateView,
    ReportSectionDetailView,
    # Report Annotation Views
    ReportAnnotationListCreateView,
    ReportAnnotationDetailView,
    # Report Asset Views
    ReportAssetListView,
    ReportAssetDetailView,
    # Job Views
    JobDetailView,
    # File Upload/Download Views
    CSVUploadView,
    PDFDownloadView,
)

urlpatterns = [
    # Dimensions API
    path("reports/dimensions/", DimensionsView.as_view(), name="reports-dimensions"),
    
    # Report Template API
    path("report-templates/", ReportTemplateListCreateView.as_view(), name="report-template-list"),
    path("report-templates/<str:template_id>/", ReportTemplateDetailView.as_view(), name="report-template-detail"),
    
    # File Upload/Download API - Put these BEFORE parameterized routes
    path("upload-csv/", CSVUploadView.as_view(), name="csv-upload"),
    
    # Report API
    path("reports/", ReportListCreateView.as_view(), name="report-list"),
    path("reports/reports/", ReportListCreateView.as_view(), name="report-list-alt"),
    
    # Parameterized routes - these must come AFTER specific routes
    path("reports/<str:report_id>/download-pdf/", PDFDownloadView.as_view(), name="pdf-download"),
    path("reports/<str:report_id>/submit/", ReportSubmitView.as_view(), name="report-submit"),
    path("reports/<str:report_id>/approve/", ReportApproveView.as_view(), name="report-approve"),
    path("reports/<str:report_id>/export/", ReportExportView.as_view(), name="report-export"),
    path("reports/<str:report_id>/publish/confluence/", ReportPublishConfluenceView.as_view(), name="report-publish-confluence"),
    path("reports/<str:report_id>/", ReportDetailView.as_view(), name="report-detail"),
    
    # Report Section API
    path("reports/<str:report_id>/sections/", ReportSectionListCreateView.as_view(), name="report-section-list"),
    path("reports/<str:report_id>/sections/<str:section_id>/", ReportSectionDetailView.as_view(), name="report-section-detail"),
    
    # Report Annotation API
    path("reports/<str:report_id>/annotations/", ReportAnnotationListCreateView.as_view(), name="report-annotation-list"),
    path("reports/<str:report_id>/annotations/<str:annotation_id>/", ReportAnnotationDetailView.as_view(), name="report-annotation-detail"),
    
    # Report Asset API
    path("reports/<str:report_id>/assets/", ReportAssetListView.as_view(), name="report-asset-list"),
    path("reports/<str:report_id>/assets/<str:asset_id>/", ReportAssetDetailView.as_view(), name="report-asset-detail"),
    
    # Job API
    path("jobs/<str:job_id>/", JobDetailView.as_view(), name="job-detail"),
]

