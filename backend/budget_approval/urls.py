from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'requests', views.BudgetRequestViewSet, basename='budget-request')
router.register(r'pools', views.BudgetPoolViewSet, basename='budget-pool')

urlpatterns = router.urls + [
    path('requests/<int:pk>/decision/', views.BudgetRequestDecisionView.as_view(), name='budget-request-decision'),
    path('escalate/', views.BudgetEscalationView.as_view(), name='budget-escalation'),
] 