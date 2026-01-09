from django.urls import path
from . import views

app_name = 'experiment'

urlpatterns = [
    # List and create experiments
    path('experiments/', views.ExperimentListCreateView.as_view(), name='experiment-list-create'),
    
    # Retrieve and update specific experiment
    path('experiments/<int:id>/', views.ExperimentRetrieveUpdateView.as_view(), name='experiment-detail'),
    
    # List and create progress updates for an experiment
    path('experiments/<int:id>/progress-updates/', views.ExperimentProgressUpdateListCreateView.as_view(), name='experiment-progress-updates'),
]

