# reports/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_nested.routers import NestedDefaultRouter
from .viewsets import (
    ReportTemplateViewSet,ReportViewSet, ReportSectionViewSet, ReportAnnotationViewSet,
    ReportAssetViewSet, JobViewSet
)
from .views import DimensionsView

router = DefaultRouter()
router.register(r"reports", ReportViewSet, basename="report")
router.register(r"jobs", JobViewSet, basename="job")
router.register(r"report-templates", ReportTemplateViewSet, basename="report-template")

nested = NestedDefaultRouter(router, r"reports", lookup="report")
nested.register(r"sections", ReportSectionViewSet, basename="report-sections")
nested.register(r"annotations", ReportAnnotationViewSet, basename="report-annotations")
nested.register(r"assets", ReportAssetViewSet, basename="report-assets")


urlpatterns = [

    path("reports/dimensions/", DimensionsView.as_view(), name="reports-dimensions"),
    path("", include(router.urls)),
    path("", include(nested.urls)),
]

