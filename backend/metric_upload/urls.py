from django.urls import path
from . import views

app_name = 'metric_upload'

urlpatterns = [
    # File upload endpoint
    # POST /files/ - Upload a new file
    path('files/', views.FileUploadView.as_view(), name='file-upload'),
    
    # File detail endpoint
    # GET /files/{id}/ - Get file metadata
    path('files/<int:pk>/', views.FileDetailView.as_view(), name='file-detail'),
    
    # File content endpoints
    # GET /files/{id}/content - Download file content
    # HEAD /files/{id}/content - Get file headers without content
    path('files/<int:pk>/content', views.FileContentView.as_view(), name='file-content'),
]
