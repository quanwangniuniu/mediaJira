from rest_framework.routers import DefaultRouter

from .views import DecisionDraftViewSet, DecisionViewSet

router = DefaultRouter()
router.register(r'decisions/drafts', DecisionDraftViewSet, basename='decision-draft')
router.register(r'decisions', DecisionViewSet, basename='decision')

urlpatterns = router.urls
