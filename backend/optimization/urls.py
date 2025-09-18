from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'optimization'

# API URL patterns
urlpatterns = [
    # ==================== EXPERIMENT ENDPOINTS ====================
    
    # List and create experiments
    path('experiments/', views.ExperimentListCreateView.as_view(), name='experiment-list-create'),

    # Update specific experiment
    path('experiments/<int:id>/', views.ExperimentUpdateView.as_view(), name='experiment-update'),
    
    # Get experiment metrics
    path('experiments/<int:id>/metrics/', views.ExperimentMetricsView.as_view(), name='experiment-metrics'),
    
    # Ingest experiment metrics (Celery-friendly)
    path('experiments/<int:id>/metrics/ingest/', views.ingest_experiment_metrics, name='ingest-experiment-metrics'),
    
    # ==================== SCALING ACTION ENDPOINTS ====================
    
    # List and create scaling actions
    path('scaling/', views.ScalingActionListCreateView.as_view(), name='scaling-list-create'),
    
    # Rollback specific scaling action
    path('scaling/<int:id>/rollback/', views.rollback_scaling_action, name='rollback-scaling-action')
]