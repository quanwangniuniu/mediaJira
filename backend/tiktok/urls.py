from django.urls import path
from . import views


urlpatterns = [
    path('file/video/ad/upload/', views.upload_video_ad, name='tiktok-video-ad-upload'),
    path('file/image/ad/upload/', views.upload_image_ad, name='tiktok-image-ad-upload'),
    path('material/list/', views.material_list, name='tiktok-material-list'),
    path('material/info/<int:id>/', views.material_info, name='tiktok-material-info'),

    # Creation API
    path('creation/sidebar/brief_info_list/', views.brief_info_list, name='tiktok-brief-info-list'),
    path('creation/detail/', views.creation_detail, name='tiktok-creation-detail'),

    path('creation/ad-drafts/save/', views.ad_draft_save, name='tiktok-ad-draft-save'),
    path('creation/ad-drafts/delete/', views.ad_draft_delete, name='tiktok-ad-draft-delete'),
    path('creation/ad-group/save/', views.ad_group_save, name='tiktok-ad-group-save'),
    path('creation/ad-group/delete/', views.ad_group_delete, name='tiktok-ad-group-delete'),

    # Shareable Previews
    path('ad-drafts/<uuid:id>/share/', views.share_ad_draft, name='tiktok-share-ad-draft'),
    path('public-previews/<slug:slug>/', views.get_public_preview, name='tiktok-public-preview'),
]


