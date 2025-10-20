from django.urls import path
from . import views

app_name = 'google_ads'

urlpatterns = [
    # Operations by account
    path('act_<str:customer_id>/ads/', views.AdsByAccountView.as_view(), name='ads_by_account'),
    path('act_<str:customer_id>/ads/<int:ad_id>/', views.AdByAccountView.as_view(), name='ad_by_account'),
    
    # Global operations
    path('<int:ad_id>/', views.get_ad, name='get_ad'),
    path('<int:ad_id>/update/', views.AdUpdateView.as_view(), name='update_ad'),
    path('<int:ad_id>/delete/', views.AdDeleteView.as_view(), name='delete_ad'),
    
    # Preview related routes
    path('<int:ad_id>/create_preview/', views.create_preview_from_ad, name='create_preview_from_ad'),
    path('preview/<str:token>/', views.get_preview_data, name='get_preview_data'),
    
]