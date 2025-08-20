from django.urls import path
from task.views import TaskViewSet

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
]
