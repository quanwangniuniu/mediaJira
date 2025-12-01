from rest_framework.routers import DefaultRouter
from .views import EmailDraftViewSet, WorkflowViewSet

router = DefaultRouter()
router.register(r"klaviyo-drafts", EmailDraftViewSet, basename="klaviyo-draft")
router.register(r"klaviyo-workflows", WorkflowViewSet, basename="klaviyo-workflow")

urlpatterns = router.urls
