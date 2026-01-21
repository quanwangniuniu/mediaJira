from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound
from django.shortcuts import get_object_or_404
from django.db.models import Max
from django.db import transaction

from core.models import ProjectMember
from miro.models import Board, BoardItem, BoardRevision
from miro.serializers import (
    BoardSerializer,
    BoardCreateSerializer,
    BoardUpdateSerializer,
    BoardItemSerializer,
    BoardItemCreateSerializer,
    BoardItemUpdateSerializer,
    BoardItemBatchUpdateSerializer,
    BoardRevisionSerializer,
    BoardRevisionCreateSerializer,
    ShareBoardResponseSerializer,
)
from miro.permissions import IsBoardProjectMember, HasValidShareToken


class BoardViewSet(viewsets.ModelViewSet):
    """ViewSet for Board model"""
    queryset = Board.objects.select_related('project')
    permission_classes = [IsAuthenticated, IsBoardProjectMember]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return BoardCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return BoardUpdateSerializer
        return BoardSerializer

    def get_queryset(self):
        """Filter boards by user's project memberships"""
        user = self.request.user
        if not user.is_authenticated:
            return Board.objects.none()

        # Get all projects where user is a member
        project_ids = ProjectMember.objects.filter(
            user=user,
            is_active=True
        ).values_list('project_id', flat=True)

        return Board.objects.filter(
            project_id__in=project_ids
        ).select_related('project').order_by('-created_at')

    @action(detail=True, methods=['get', 'post'], url_path='items')
    def items(self, request, pk=None, board_id=None):
        """List or create board items"""
        # Support both pk (from router) and board_id (from manual URL pattern)
        if board_id:
            from miro.models import Board
            board = get_object_or_404(Board, id=board_id)
        else:
            board = self.get_object()
        
        if request.method == 'GET':
            # List items
            include_deleted = request.query_params.get('include_deleted', 'false').lower() == 'true'
            queryset = BoardItem.objects.filter(board=board)
            
            if not include_deleted:
                queryset = queryset.filter(is_deleted=False)
            
            queryset = queryset.select_related('parent_item').order_by('z_index', 'created_at')
            serializer = BoardItemSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Create item
            serializer = BoardItemCreateSerializer(
                data=request.data,
                context={'request': request, 'board': board}
            )
            serializer.is_valid(raise_exception=True)
            item = serializer.save()
            response_serializer = BoardItemSerializer(item)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], url_path='items/batch')
    def batch_items(self, request, pk=None, board_id=None):
        """Batch update board items (partial updates)"""
        # Support both pk (from router) and board_id (from manual URL pattern)
        if board_id:
            from miro.models import Board
            board = get_object_or_404(Board, id=board_id)
        else:
            board = self.get_object()
        
        # Validate request data
        batch_serializer = BoardItemBatchUpdateSerializer(data={'items': request.data.get('items', [])})
        batch_serializer.is_valid(raise_exception=True)
        items_data = batch_serializer.validated_data['items']
        
        updated = []
        failed = []
        
        for item_data in items_data:
            item_id = item_data.pop('id', None)
            if not item_id:
                failed.append({'id': None, 'error': 'Missing id field'})
                continue
            
            try:
                item = BoardItem.objects.get(id=item_id, board=board)
                serializer = BoardItemUpdateSerializer(item, data=item_data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    updated.append(BoardItemSerializer(item).data)
                else:
                    failed.append({'id': str(item_id), 'error': serializer.errors})
            except BoardItem.DoesNotExist:
                failed.append({'id': str(item_id), 'error': 'Item not found'})
            except Exception as e:
                failed.append({'id': str(item_id), 'error': str(e)})
        
        return Response({
            'updated': updated,
            'failed': failed
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get', 'post'], url_path='revisions')
    def revisions(self, request, pk=None, board_id=None):
        """List or create board revisions"""
        # Support both pk (from router) and board_id (from manual URL pattern)
        if board_id:
            from miro.models import Board
            board = get_object_or_404(Board, id=board_id)
        else:
            board = self.get_object()
        
        if request.method == 'GET':
            # List revisions
            limit = int(request.query_params.get('limit', 20))
            limit = max(1, min(limit, 100))  # Clamp between 1 and 100
            
            queryset = BoardRevision.objects.filter(
                board=board
            ).order_by('-version', '-created_at')[:limit]
            
            serializer = BoardRevisionSerializer(queryset, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        elif request.method == 'POST':
            # Create revision
            serializer = BoardRevisionCreateSerializer(
                data=request.data,
                context={'request': request, 'board': board}
            )
            serializer.is_valid(raise_exception=True)
            revision = serializer.save()
            response_serializer = BoardRevisionSerializer(revision)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='revisions/(?P<version>\\d+)')
    def revision_detail(self, request, pk=None, version=None, board_id=None):
        """Get a specific board revision by version"""
        # Support both pk (from router) and board_id (from manual URL pattern)
        if board_id:
            from miro.models import Board
            board = get_object_or_404(Board, id=board_id)
        else:
            board = self.get_object()
        
        try:
            revision = BoardRevision.objects.get(board=board, version=version)
        except BoardRevision.DoesNotExist:
            raise NotFound(f"Revision version {version} not found for this board")
        
        serializer = BoardRevisionSerializer(revision)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='revisions/(?P<version>\\d+)/restore')
    def restore_revision(self, request, pk=None, version=None, board_id=None):
        """Restore board from a revision (applies snapshot to DB and creates new revision)"""
        # Support both pk (from router) and board_id (from manual URL pattern)
        if board_id:
            from miro.models import Board
            board = get_object_or_404(Board, id=board_id)
        else:
            board = self.get_object()
        
        try:
            old_revision = BoardRevision.objects.get(board=board, version=version)
        except BoardRevision.DoesNotExist:
            raise NotFound(f"Revision version {version} not found for this board")
        
        snapshot = old_revision.snapshot
        if not isinstance(snapshot, dict):
            raise NotFound("Invalid snapshot format")
        
        # Apply snapshot to board and items in a transaction
        with transaction.atomic():
            # 1. Update board viewport
            if 'viewport' in snapshot:
                board.viewport = snapshot['viewport']
                board.save(update_fields=['viewport'])
            
            # 2. Restore items from snapshot
            snapshot_items = snapshot.get('items', [])
            snapshot_item_ids = set()
            
            # Update/create items from snapshot
            for item_data in snapshot_items:
                item_id = item_data.get('id')
                if not item_id:
                    continue  # Skip items without ID
                
                snapshot_item_ids.add(str(item_id))
                
                try:
                    item = BoardItem.objects.get(id=item_id, board=board)
                    # Update existing item with snapshot data
                    item.x = item_data.get('x', item.x)
                    item.y = item_data.get('y', item.y)
                    item.width = item_data.get('width', item.width)
                    item.height = item_data.get('height', item.height)
                    item.rotation = item_data.get('rotation', item.rotation)
                    item.style = item_data.get('style', item.style)
                    item.content = item_data.get('content', item.content)
                    item.z_index = item_data.get('z_index', item.z_index)
                    item.is_deleted = False  # Restore deleted items
                    
                    # Handle parent_item_id
                    parent_item_id = item_data.get('parent_item_id')
                    if parent_item_id:
                        try:
                            parent_item = BoardItem.objects.get(id=parent_item_id, board=board)
                            item.parent_item = parent_item
                        except BoardItem.DoesNotExist:
                            item.parent_item = None
                    else:
                        item.parent_item = None
                    
                    item.save()
                except BoardItem.DoesNotExist:
                    # Item doesn't exist, skip (we only restore existing items)
                    pass
            
            # 3. Mark items not in snapshot as deleted
            BoardItem.objects.filter(board=board).exclude(id__in=snapshot_item_ids).update(is_deleted=True)
            
            # 4. Get next version number and create new revision
            max_version = BoardRevision.objects.filter(
                board=board
            ).aggregate(Max('version'))['version__max'] or 0
            new_version = max_version + 1
            
            # Create new revision recording the restored state
            new_revision = BoardRevision.objects.create(
                board=board,
                version=new_version,
                snapshot=old_revision.snapshot,
                note=f"Restored from version {version}"
            )
        
        serializer = BoardRevisionSerializer(new_revision)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BoardItemViewSet(viewsets.ModelViewSet):
    """ViewSet for BoardItem model"""
    queryset = BoardItem.objects.select_related('board', 'parent_item')
    serializer_class = BoardItemSerializer
    permission_classes = [IsAuthenticated, IsBoardProjectMember]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action in ['update', 'partial_update']:
            return BoardItemUpdateSerializer
        return BoardItemSerializer

    def partial_update(self, request, *args, **kwargs):
        """
        Patch item and return the full item representation (including `id`).
        DRF's default would return BoardItemUpdateSerializer fields only.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(BoardItemSerializer(instance).data, status=status.HTTP_200_OK)

    def get_queryset(self):
        """Filter items by user's project memberships"""
        user = self.request.user
        if not user.is_authenticated:
            return BoardItem.objects.none()

        # Get all projects where user is a member
        project_ids = ProjectMember.objects.filter(
            user=user,
            is_active=True
        ).values_list('project_id', flat=True)

        return BoardItem.objects.filter(
            board__project_id__in=project_ids
        ).select_related('board', 'parent_item')

    def destroy(self, request, *args, **kwargs):
        """Soft delete item and return specific response format"""
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({
            'id': str(instance.id),
            'is_deleted': True,
            'updated_at': instance.updated_at
        }, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        """Soft delete item (set is_deleted=True)"""
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])


class ShareBoardView(APIView):
    """View for accessing board via share token (public access)"""
    permission_classes = [HasValidShareToken]

    def get(self, request, share_token=None):
        """Get board and active items via share token"""
        try:
            board = Board.objects.get(share_token=share_token)
        except Board.DoesNotExist:
            raise NotFound("Board not found or invalid share token")
        
        # Get active items only (exclude deleted)
        items = BoardItem.objects.filter(
            board=board,
            is_deleted=False
        ).select_related('parent_item').order_by('z_index', 'created_at')
        
        board_serializer = BoardSerializer(board)
        items_serializer = BoardItemSerializer(items, many=True)
        
        return Response({
            'board': board_serializer.data,
            'items': items_serializer.data
        }, status=status.HTTP_200_OK)

