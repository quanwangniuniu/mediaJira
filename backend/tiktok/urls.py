from django.urls import path
from . import views


urlpatterns = [
    path('file/video/ad/upload/', views.upload_video_ad, name='tiktok-video-ad-upload'),
    path('file/image/ad/upload/', views.upload_image_ad, name='tiktok-image-ad-upload'),
    path('material/list/', views.material_list, name='tiktok-material-list'),
    path('material/info/<int:id>/', views.material_info, name='tiktok-material-info'),
]


