from django.urls import path
from miro.views import BoardViewSet, BoardItemViewSet, ShareBoardView

app_name = 'miro'

urlpatterns = [
    # Board CRUD
    path('boards/', BoardViewSet.as_view({'get': 'list', 'post': 'create'}), name='board-list'),
    path('boards/<uuid:pk>/', BoardViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update'}), name='board-detail'),
    
    # Board items (nested)
    path('boards/<uuid:board_id>/items/', BoardViewSet.as_view({'get': 'items', 'post': 'items'}), name='board-items'),
    path('boards/<uuid:board_id>/items/batch/', BoardViewSet.as_view({'patch': 'batch_items'}), name='board-items-batch'),
    
    # Item operations
    path('items/<uuid:pk>/', BoardItemViewSet.as_view({'patch': 'partial_update', 'delete': 'destroy'}), name='item-detail'),
    
    # Board revisions (nested)
    path('boards/<uuid:board_id>/revisions/', BoardViewSet.as_view({'get': 'revisions', 'post': 'revisions'}), name='board-revisions'),
    path('boards/<uuid:board_id>/revisions/<int:version>/', BoardViewSet.as_view({'get': 'revision_detail'}), name='board-revision-detail'),
    path('boards/<uuid:board_id>/revisions/<int:version>/restore/', BoardViewSet.as_view({'post': 'restore_revision'}), name='board-revision-restore'),
    
    # Share token access
    path('share/boards/<str:share_token>/', ShareBoardView.as_view(), name='share-board'),
]

