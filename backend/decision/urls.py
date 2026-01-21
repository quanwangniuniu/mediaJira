from rest_framework.routers import DefaultRouter

from .views import DecisionViewSet

router = DefaultRouter()
router.register(r'', DecisionViewSet, basename='decision')

urlpatterns = router.urls
