from django.urls import path
from task.views import TaskViewSet, TaskCommentListView, TaskAttachmentListView, TaskAttachmentDetailView, TaskAttachmentDownloadView

urlpatterns = [
    # Task CRUD endpoints
    path('tasks/', TaskViewSet.as_view({'get': 'list', 'post': 'create'}), name='task-list'),
    path('tasks/<int:pk>/', TaskViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='task-detail'),
    
    # Task action endpoints
    path('tasks/<int:pk>/link/', TaskViewSet.as_view({'post': 'link'}), name='task-link'),
    path('tasks/<int:pk>/make-approval/', TaskViewSet.as_view({'post': 'make_approval'}), name='task-make-approval'),
    path('tasks/<int:pk>/cancel/', TaskViewSet.as_view({'post': 'cancel'}), name='task-cancel'),
    path('tasks/<int:pk>/approval-history/', TaskViewSet.as_view({'get': 'approval_history'}), name='task-approval-history'),
    path('tasks/<int:pk>/revise/', TaskViewSet.as_view({'post': 'revise'}), name='task-revise'),
    path('tasks/<int:pk>/forward/', TaskViewSet.as_view({'post': 'forward'}), name='task-forward'),
    path('tasks/<int:pk>/start-review/', TaskViewSet.as_view({'post': 'start_review'}), name='task-start-review'),
    path('tasks/<int:pk>/lock/', TaskViewSet.as_view({'post': 'lock'}), name='task-lock'),

    # Task comments (task-level, all types)
    path('tasks/<int:task_id>/comments/', TaskCommentListView.as_view(), name='task-comment-list'),
    
    # Task attachments (task-level, all types)
    path('tasks/<int:task_id>/attachments/', TaskAttachmentListView.as_view(), name='task-attachment-list'),
    path('tasks/<int:task_id>/attachments/<int:pk>/', TaskAttachmentDetailView.as_view(), name='task-attachment-detail'),
    path('tasks/<int:task_id>/attachments/<int:pk>/download/', TaskAttachmentDownloadView.as_view(), name='task-attachment-download'),
]
