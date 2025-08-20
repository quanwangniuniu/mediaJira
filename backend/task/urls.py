from django.urls import path, include
from rest_framework.routers import DefaultRouter
from task.views import TaskViewSet

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', include(router.urls)),
]
