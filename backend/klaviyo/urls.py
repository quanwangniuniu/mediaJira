from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import EmailDraftViewSet, WorkflowViewSet, upload_image, list_images, import_image_from_url

router = DefaultRouter()
router.register(r"klaviyo-drafts", EmailDraftViewSet, basename="klaviyo-draft")
router.register(r"klaviyo-workflows", WorkflowViewSet, basename="klaviyo-workflow")

urlpatterns = router.urls + [
    path('images/upload/', upload_image, name='klaviyo-image-upload'),
    path('images/import-url/', import_image_from_url, name='klaviyo-image-import-url'),
    path('images/', list_images, name='klaviyo-image-list'),
]
