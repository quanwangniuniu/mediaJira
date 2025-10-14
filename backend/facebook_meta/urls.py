from django.urls import path
from . import views

app_name = 'facebook_meta'

urlpatterns = [
    # Specific routes MUST come before the generic '<str:ad_creative_id>/' route
    # GET & POST /facebook_meta/adcreatives
    path('adcreatives/', views.AdCreativesView.as_view(), name='ad_creatives'),
    
    # GET /facebook_meta/preview/{token}/public (public, no auth)
    path('preview/<str:token>/public/', views.get_preview_by_token_public, name='get_preview_by_token_public'),
    
    # POST /facebook_meta/photos/upload
    path('photos/upload/', views.PhotoUploadView.as_view(), name='photo_upload'),
    
    # GET /facebook_meta/photos
    path('photos/', views.PhotoListView.as_view(), name='photo_list'),
    
    # POST /facebook_meta/videos/upload
    path('videos/upload/', views.VideoUploadView.as_view(), name='video_upload'),
    
    # GET /facebook_meta/videos
    path('videos/', views.VideoListView.as_view(), name='video_list'),

    # POST, GET, DELETE /facebook_meta/{ad_creative_id}/share-preview
    path('<str:ad_creative_id>/share-preview/', views.SharePreviewView.as_view(), name='share_preview'),

    # POST /facebook_meta/{ad_creative_id}/associate-media
    path('<str:ad_creative_id>/associate-media/', views.AssociateMediaToAdCreativeView.as_view(), name='associate_media_to_ad_creative'),

    # GET, PATCH, DELETE /facebook_meta/{ad_creative_id}
    path('<str:ad_creative_id>/', views.AdCreativeDetailView.as_view(), name='ad_creative_detail'),
]
