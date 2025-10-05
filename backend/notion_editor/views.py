from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from .models import Draft, ContentBlock, BlockAction
from .serializers import (
    DraftSerializer, DraftListSerializer, CreateDraftSerializer, UpdateDraftSerializer,
    ContentBlockSerializer, BlockActionSerializer, BlockActionCreateSerializer
)

User = get_user_model()


class DraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing drafts
    """
    queryset = Draft.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return drafts for the current user"""
        return Draft.objects.filter(
            user=self.request.user, 
            is_deleted=False
        ).select_related('user').prefetch_related('blocks__actions')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return DraftListSerializer
        elif self.action == 'create':
            return CreateDraftSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateDraftSerializer
        return DraftSerializer
    
    def perform_create(self, serializer):
        """Set the user when creating a draft"""
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        """Soft delete the draft"""
        instance.is_deleted = True
        instance.save()
    
    @action(detail=True, methods=['post'])
    def add_block(self, request, pk=None):
        """Add a new content block to the draft"""
        draft = self.get_object()
        block_data = request.data
        
        if not isinstance(block_data, dict):
            return Response(
                {'error': 'Block data must be a dictionary'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Add block to JSON content_blocks
        block_id = draft.add_content_block(block_data)
        
        # Also create a ContentBlock record for structured storage
        content_block = ContentBlock.objects.create(
            draft=draft,
            block_type=block_data.get('type', 'text'),
            content=block_data.get('content', {}),
            order=len(draft.content_blocks) - 1
        )
        
        return Response({
            'block_id': block_id,
            'content_block_id': content_block.id,
            'message': 'Block added successfully'
        })
    
    @action(detail=True, methods=['put'])
    def update_block(self, request, pk=None):
        """Update a content block in the draft"""
        draft = self.get_object()
        block_id = request.data.get('block_id')
        block_data = request.data.get('block_data')
        
        if not block_id or not block_data:
            return Response(
                {'error': 'block_id and block_data are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = draft.update_content_block(block_id, block_data)
        
        if success:
            return Response({'message': 'Block updated successfully'})
        else:
            return Response(
                {'error': 'Block not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['delete'])
    def delete_block(self, request, pk=None):
        """Delete a content block from the draft"""
        draft = self.get_object()
        block_id = request.data.get('block_id')
        
        if not block_id:
            return Response(
                {'error': 'block_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = draft.delete_content_block(block_id)
        
        if success:
            return Response({'message': 'Block deleted successfully'})
        else:
            return Response(
                {'error': 'Block not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    


class ContentBlockViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing content blocks
    """
    queryset = ContentBlock.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return content blocks for the current user's drafts"""
        return ContentBlock.objects.filter(
            draft__user=self.request.user,
            draft__is_deleted=False
        ).select_related('draft').prefetch_related('actions')
    
    def get_serializer_class(self):
        return ContentBlockSerializer
    
    def perform_create(self, serializer):
        """Ensure the draft belongs to the current user"""
        draft = serializer.validated_data['draft']
        if draft.user != self.request.user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only create blocks for your own drafts")
        serializer.save()


class BlockActionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing block actions
    """
    queryset = BlockAction.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return block actions for the current user's drafts"""
        return BlockAction.objects.filter(
            block__draft__user=self.request.user,
            block__draft__is_deleted=False
        ).select_related('block__draft')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BlockActionCreateSerializer
        return BlockActionSerializer


class DraftBlocksView(APIView):
    """
    API view for managing blocks of a specific draft
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, draft_id):
        """Get all blocks for a draft"""
        draft = get_object_or_404(
            Draft, 
            id=draft_id, 
            user=request.user, 
            is_deleted=False
        )
        
        blocks = draft.blocks.all().order_by('order', 'created_at')
        serializer = ContentBlockSerializer(blocks, many=True)
        
        return Response({
            'draft_id': draft.id,
            'draft_title': draft.title,
            'blocks': serializer.data
        })


class ExportDraftView(APIView):
    """
    API view for exporting a draft
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, draft_id):
        """Export draft as downloadable JSON"""
        draft = get_object_or_404(
            Draft, 
            id=draft_id, 
            user=request.user, 
            is_deleted=False
        )
        
        export_data = {
            'title': draft.title,
            'status': draft.status,
            'content_blocks': draft.content_blocks,
            'created_at': draft.created_at.isoformat(),
            'updated_at': draft.updated_at.isoformat(),
            'exported_at': draft.updated_at.isoformat(),
        }
        
        response = JsonResponse(export_data, json_dumps_params={'indent': 2})
        response['Content-Disposition'] = f'attachment; filename="{draft.title}_export.json"'
        return response


class DuplicateDraftView(APIView):
    """
    API view for duplicating a draft
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, draft_id):
        """Duplicate a draft"""
        original_draft = get_object_or_404(
            Draft, 
            id=draft_id, 
            user=request.user, 
            is_deleted=False
        )
        
        new_title = request.data.get('title', f"{original_draft.title} (Copy)")
        
        new_draft = Draft.objects.create(
            title=new_title,
            user=request.user,
            status='draft',
            content_blocks=original_draft.content_blocks.copy()
        )
        
        # Duplicate content blocks
        for block in original_draft.blocks.all():
            new_block = ContentBlock.objects.create(
                draft=new_draft,
                block_type=block.block_type,
                content=block.content,
                order=block.order
            )
            
            # Duplicate block actions
            for action in block.actions.all():
                BlockAction.objects.create(
                    block=new_block,
                    action_type=action.action_type,
                    label=action.label,
                    icon=action.icon,
                    is_enabled=action.is_enabled,
                    order=action.order
                )
        
        serializer = DraftSerializer(new_draft)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
