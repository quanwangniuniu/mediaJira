from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
import rest_framework.parsers
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.db.models import Max
from .models import Draft, ContentBlock, BlockAction, DraftRevision, MediaFile
from .serializers import (
    DraftSerializer, DraftListSerializer, CreateDraftSerializer, UpdateDraftSerializer,
    ContentBlockSerializer, BlockActionSerializer, BlockActionCreateSerializer,
    DraftRevisionSerializer, DraftRevisionListSerializer,
    MediaFileSerializer, MediaFileUploadSerializer
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
        """Set the user when creating a draft and create initial revision"""
        draft = serializer.save(user=self.request.user)
        # Create initial revision
        self._create_revision(draft, "Initial version")

    def perform_update(self, serializer):
        """Update draft and create a new revision"""
        draft = serializer.save()
        # Create revision snapshot
        change_summary = self.request.data.get('change_summary', 'Updated draft')
        self._create_revision(draft, change_summary)

    def perform_destroy(self, instance):
        """Soft delete the draft"""
        instance.is_deleted = True
        instance.save()

    def _create_revision(self, draft, change_summary=""):
        """Helper method to create a revision snapshot"""
        # Get the next revision number
        last_revision = draft.revisions.aggregate(Max('revision_number'))['revision_number__max']
        next_revision_number = (last_revision or 0) + 1

        # Create the revision
        DraftRevision.objects.create(
            draft=draft,
            title=draft.title,
            content_blocks=draft.content_blocks.copy() if isinstance(draft.content_blocks, list) else [],
            status=draft.status,
            revision_number=next_revision_number,
            change_summary=change_summary,
            created_by=self.request.user
        )
    
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


class DraftRevisionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing draft revisions (read-only)
    """
    queryset = DraftRevision.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Return revisions for the current user's drafts"""
        return DraftRevision.objects.filter(
            draft__user=self.request.user,
            draft__is_deleted=False
        ).select_related('draft', 'created_by')

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return DraftRevisionListSerializer
        return DraftRevisionSerializer

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        """Restore a draft to a specific revision"""
        revision = self.get_object()
        draft = revision.draft

        # Verify ownership
        if draft.user != request.user:
            return Response(
                {'error': 'You can only restore your own drafts'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Restore the draft to this revision's state
        draft.title = revision.title
        draft.content_blocks = revision.content_blocks.copy() if isinstance(revision.content_blocks, list) else []
        draft.status = revision.status
        draft.save()

        # Create a new revision marking the restoration
        last_revision = draft.revisions.aggregate(Max('revision_number'))['revision_number__max']
        next_revision_number = (last_revision or 0) + 1

        DraftRevision.objects.create(
            draft=draft,
            title=draft.title,
            content_blocks=draft.content_blocks.copy(),
            status=draft.status,
            revision_number=next_revision_number,
            change_summary=f"Restored to revision {revision.revision_number}",
            created_by=request.user
        )

        serializer = DraftSerializer(draft)
        return Response({
            'message': f'Draft restored to revision {revision.revision_number}',
            'draft': serializer.data
        })


class DraftRevisionsListView(APIView):
    """
    API view for listing all revisions of a specific draft
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, draft_id):
        """Get all revisions for a draft"""
        draft = get_object_or_404(
            Draft,
            id=draft_id,
            user=request.user,
            is_deleted=False
        )

        revisions = draft.revisions.all()
        serializer = DraftRevisionListSerializer(revisions, many=True)

        return Response({
            'draft_id': draft.id,
            'draft_title': draft.title,
            'total_revisions': revisions.count(),
            'revisions': serializer.data
        })


class MediaFileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing media files
    """
    queryset = MediaFile.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return media files for the current user"""
        return MediaFile.objects.filter(
            uploaded_by=self.request.user
        ).select_related('uploaded_by', 'draft')
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'create':
            return MediaFileUploadSerializer
        return MediaFileSerializer
    
    def perform_create(self, serializer):
        """Set the user when creating a media file"""
        serializer.save(uploaded_by=self.request.user)


class MediaUploadView(APIView):
    """
    API view for uploading media files (image, video, audio, file)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [rest_framework.parsers.MultiPartParser, rest_framework.parsers.FormParser]
    
    def post(self, request):
        """Upload a media file"""
        file_obj = request.FILES.get('file')
        media_type = request.data.get('media_type')
        draft_id = request.data.get('draft_id')
        
        if not file_obj:
            return Response(
                {'error': 'File is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get draft if provided
        draft = None
        if draft_id:
            try:
                draft = Draft.objects.get(id=draft_id, user=request.user, is_deleted=False)
            except Draft.DoesNotExist:
                return Response(
                    {'error': 'Draft not found or access denied'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Create serializer
        serializer_data = {
            'file': file_obj,
            'media_type': media_type,
        }
        if draft:
            serializer_data['draft'] = draft.id
        
        serializer = MediaFileUploadSerializer(
            data=serializer_data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            media_file = serializer.save()
            
            # Return the media file data with block structure
            return Response({
                'id': media_file.id,
                'file_url': request.build_absolute_uri(media_file.file.url),
                'media_type': media_file.media_type,
                'original_filename': media_file.original_filename,
                'file_size': media_file.file_size,
                'content_type': media_file.content_type,
                'block_data': {
                    'type': media_file.media_type,
                    'content': {
                        'file_id': media_file.id,
                        'file_url': request.build_absolute_uri(media_file.file.url),
                        'filename': media_file.original_filename,
                        'file_size': media_file.file_size,
                        'content_type': media_file.content_type,
                    }
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class WebBookmarkView(APIView):
    """
    API view for creating web bookmark blocks
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Create a web bookmark block"""
        url = request.data.get('url')
        draft_id = request.data.get('draft_id')
        
        if not url:
            return Response(
                {'error': 'URL is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get draft if provided
        draft = None
        if draft_id:
            try:
                draft = Draft.objects.get(id=draft_id, user=request.user, is_deleted=False)
            except Draft.DoesNotExist:
                return Response(
                    {'error': 'Draft not found or access denied'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Create block data structure
        block_data = {
            'type': 'web_bookmark',
            'content': {
                'url': url,
                'title': request.data.get('title', ''),
                'description': request.data.get('description', ''),
                'favicon': request.data.get('favicon', ''),
            }
        }
        
        # If draft is provided, add the block to the draft
        if draft:
            block_id = draft.add_content_block(block_data)
            
            # Also create a ContentBlock record
            content_block = ContentBlock.objects.create(
                draft=draft,
                block_type='web_bookmark',
                content=block_data['content'],
                order=len(draft.content_blocks) - 1
            )
            
            return Response({
                'block_id': block_id,
                'content_block_id': content_block.id,
                'block_data': block_data,
                'message': 'Web bookmark block created successfully'
            }, status=status.HTTP_201_CREATED)
        
        # Return block data without adding to draft
        return Response({
            'block_data': block_data,
            'message': 'Web bookmark block data created'
        }, status=status.HTTP_201_CREATED)
