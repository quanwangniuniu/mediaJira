from django.urls import path
from .views import DashboardSummaryView

app_name = 'dashboard'

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
]
