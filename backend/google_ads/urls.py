from django.urls import path
from . import views

app_name = 'google_ads'

urlpatterns = [
    # media upload and list
    path('photos/upload/', views.PhotoUploadView.as_view(), name='photo_upload'),
    path('photos/', views.PhotoListView.as_view(), name='photo_list'),
    path('videos/create/', views.VideoCreateView.as_view(), name='video_create'),
    path('videos/', views.VideoListView.as_view(), name='video_list'),
    
    # Global ads operations (for frontend)
    path('ads/', views.AdsListView.as_view(), name='ads_list'),
    path('ads/<int:ad_id>/', views.AdDetailView.as_view(), name='ad_detail'),
    
    # Operations by account
    path('act_<str:customer_id>/ads/', views.AdsByAccountView.as_view(), name='ads_by_account'),
    path('act_<str:customer_id>/ads/<int:ad_id>/', views.AdByAccountView.as_view(), name='ad_by_account'),
    
    # Global operations (legacy)
    path('<int:ad_id>/', views.get_ad, name='get_ad'),
    path('<int:ad_id>/update/', views.AdUpdateView.as_view(), name='update_ad'),
    path('<int:ad_id>/delete/', views.AdDeleteView.as_view(), name='delete_ad'),
    
    # Preview related routes
    path('preview/<str:token>/', views.get_preview_data, name='get_preview_data'),
    path('<int:ad_id>/create_preview/', views.create_preview_from_ad, name='create_preview_from_ad'),
    
]