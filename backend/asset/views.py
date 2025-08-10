from .tasks import scan_asset_version
from rest_framework import generics, status, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.shortcuts import get_object_or_404
from .models import Asset, AssetVersion, AssetComment, ReviewAssignment, AssetStateTransition
from .serializers import AssetSerializer, AssetVersionSerializer, AssetCommentSerializer, ReviewAssignmentSerializer, BulkReviewSerializer, AssetReviewSerializer
from .services import AssetEventService
from rest_framework.generics import RetrieveUpdateDestroyAPIView
from rest_framework.exceptions import APIException


class AssetVersionPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class AssetListView(generics.ListCreateAPIView):
    """
    AssetListView handles listing all assets and creating a new asset.

    - GET: Returns a paginated list of all assets visible to the authenticated user.
    - POST: Creates a new asset with the authenticated user set as the owner.

    Permissions:
        - Only authenticated users can access this view.

    Pagination:
        - Uses AssetVersionPagination (default page_size=5, can be changed with 'page_size' query param).

    Note:
        When creating a new asset (POST), the status will always be set to "NotSubmitted" automatically,
        regardless of what is provided in the request. This is enforced by the Asset model's default
        and the serializer behavior.
    """
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AssetVersionPagination

    def perform_create(self, serializer):
        """
        Called when creating a new asset via POST request.
        Automatically sets the owner of the asset to the current user.
        The status will always be set to "NotSubmitted" (see Asset model default).
        """
        serializer.save(owner=self.request.user, status=Asset.NOT_SUBMITTED)


class AssetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    AssetDetailView handles retrieving, updating, and deleting a specific asset.

    - GET: Returns the details of a specific asset.
    - PUT: Updates the entire asset with new data.
    - DELETE: Deletes the asset.

    Permissions:
        - Only authenticated users can access this view.
    """
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'put', 'delete']

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"detail": "Asset deleted successfully."},
            status=status.HTTP_204_NO_CONTENT
        )


class AssetSubmitView(APIView):
    """
    Purpose:
        Transitions the asset from 'NotSubmitted' to 'PendingReview' state.
    """
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        if not asset.can_submit():
            return Response({'detail': 'Asset cannot be submitted from its current state.'}, status=400)
        
        # Triggers the FSM transition from NotSubmitted to PendingReview.
        old_status = asset.status
        asset.submit(submitted_by=request.user)
        asset.save()
        
        # Broadcast status change event to all connected users
        AssetEventService.broadcast_status_change(
            asset_id=asset.id,
            from_state=old_status,
            to_state=asset.status,
            changed_by=request.user,
            metadata={'action': 'submit'}
        )
        
        return Response({'detail': 'Asset submitted for review.', 'status': asset.status})


class AssetVersionListView(generics.ListCreateAPIView):
    """
    API endpoint for listing and creating asset versions.

    GET /assets/{asset_id}/versions/:
        - List all versions of a specific asset.
        - Query params: supports pagination (see AssetVersionPagination).
        - Returns: paginated list of AssetVersionItem objects.

    POST /assets/{asset_id}/versions/:
        - Create a new version for the specified asset.
        - Request body: AssetVersionItem (file required).
        - Sets uploaded_by to current user.
        - Triggers virus scan for uploaded files.
        - Broadcasts version upload event to all connected users.
    """
    serializer_class = AssetVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AssetVersionPagination

    def get_queryset(self):
        """
        Get all versions for the given asset.
        """
        asset_id = self.kwargs.get('asset_id')
        asset = get_object_or_404(Asset, pk=asset_id)
        return AssetVersion.objects.filter(asset=asset)

    # This method handles the creation of a new asset version:
    def perform_create(self, serializer):
        asset_id = self.kwargs.get('asset_id')
        asset = get_object_or_404(Asset, pk=asset_id)
        
        # Auto-increment version number
        latest_version = AssetVersion.objects.filter(asset=asset).order_by('-version_number').first()
        version_number = (latest_version.version_number + 1) if latest_version else 1
        
        # Save the version (checksum will be calculated automatically in save method)
        version = serializer.save(
            asset=asset,
            uploaded_by=self.request.user,
            version_number=version_number
        )
        
        # Trigger virus scanning for uploaded files
        from .tasks import scan_asset_version
        scan_asset_version.delay(version.id)


class AssetVersionDetailView(RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update, or delete a specific asset version.
    - GET: Retrieve asset version details
    - PUT: Update asset version (only allowed fields, e.g. file)
        - If file is updated, triggers virus scanning and recalculates checksum
    - DELETE: Physically delete asset version
    """
    serializer_class = AssetVersionSerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['put', 'delete', 'get']

    def get_object(self):
        asset_id = self.kwargs.get('asset_id')
        version_id = self.kwargs.get('version_id')
        return get_object_or_404(AssetVersion, pk=version_id, asset_id=asset_id)
    
    def update(self, request, *args, **kwargs):
        version = self.get_object()
        if not version.can_be_updated():
            return Response(
                {'detail': 'Cannot update a finalized version. Only draft versions can be updated.'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if file content is unchanged (for 409 status)
        uploaded = request.FILES.get('file')
        if uploaded and version.is_file_unchanged(uploaded):
            return Response(
                {'detail': 'File content unchanged; no update performed.'}, 
                status=status.HTTP_409_CONFLICT
            )
        
        return super().update(request, *args, **kwargs)

    def perform_update(self, serializer):
        version = serializer.save()
        # Trigger virus scanning if file content changed
        if getattr(version, '_file_content_changed', False):
            scan_asset_version.delay(version.id)
    
    def destroy(self, request, *args, **kwargs):
        version = self.get_object()
        if not version.can_be_deleted():
            return Response(
                {'detail': 'Cannot delete a finalized version. Only draft versions can be deleted.'}, 
                status=400
            )
        return super().destroy(request, *args, **kwargs)


class AssetCommentListView(generics.ListCreateAPIView):
    """List asset comments or create a new comment"""
    serializer_class = AssetCommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AssetVersionPagination
    
    def get_queryset(self):
        asset_id = self.kwargs.get('asset_id')
        get_object_or_404(Asset, pk=asset_id)
        return AssetComment.objects.filter(asset_id=asset_id)
    
    def perform_create(self, serializer):
        asset_id = self.kwargs.get('asset_id')
        asset = get_object_or_404(Asset, pk=asset_id)
        
        # Save the comment with the asset and current user
        comment = serializer.save(asset=asset, user=self.request.user)
        
        # Broadcast comment added event to all connected users
        AssetEventService.broadcast_comment_added(
            asset_id=asset_id,
            comment_id=comment.id,
            user_id=comment.user.id,
            body=comment.body
        )


class AssetHistoryView(generics.ListAPIView):
    """Get asset activity history"""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = AssetVersionPagination
    
    def get(self, request, *args, **kwargs):
        asset_id = self.kwargs.get('asset_id')
        asset = get_object_or_404(Asset, pk=asset_id)
        
        # Collect all history items
        history_items = []
        
        # 1. Asset creation
        history_items.append({
            'type': 'asset_created',
            'timestamp': asset.created_at,
            'user_id': asset.owner.id,
            'details': {
                'asset_id': asset.id,
                'task_title': asset.task.name if asset.task else None,
                'team_name': asset.team.name if asset.team else None,
                'status': asset.status
            }
        })
        
        # 2. State transitions
        for transition in asset.state_transitions.all():
            history_items.append({
                'type': 'state_transition',
                'timestamp': transition.timestamp,
                'user_id': transition.triggered_by.id if transition.triggered_by else None,
                'details': {
                    'from_state': transition.from_state,
                    'to_state': transition.to_state,
                    'transition_method': transition.transition_method,
                    'metadata': transition.metadata
                }
            })
        
        # 3. Asset versions
        for version in asset.versions.all():
            history_items.append({
                'type': 'version_uploaded',
                'timestamp': version.created_at,
                'user_id': version.uploaded_by.id,
                'details': {
                    'version_number': version.version_number,
                    'file_url': version.file.url if version.file else None,
                    'checksum': version.checksum,
                    'scan_status': version.scan_status
                }
            })
        
        # 4. Comments
        for comment in asset.comments.all():
            history_items.append({
                'type': 'comment_added',
                'timestamp': comment.created_at,
                'user_id': comment.user.id,
                'details': {
                    'comment_id': comment.id,
                    'body': comment.body
                }
            })
        
        # 5. Review assignments
        for assignment in asset.assignments.all():
            history_items.append({
                'type': 'review_assigned',
                'timestamp': assignment.assigned_at,
                'user_id': assignment.assigned_by.id,
                'details': {
                    'assigned_user_id': assignment.user.id,
                    'role': assignment.role,
                    'valid_until': assignment.valid_until
                }
            })
        
        # Sort by timestamp (newest first)
        history_items.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Apply pagination manually
        paginator = self.paginator
        page = paginator.paginate_queryset(history_items, request)
        if page is not None:
            return paginator.get_paginated_response(page)
        
        return Response(history_items)


class ReviewAssignmentListView(generics.ListCreateAPIView):
    """List review assignments or create new assignments"""
    serializer_class = ReviewAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated]
        
    def get_queryset(self):
        asset_id = self.kwargs.get('asset_id')
        get_object_or_404(Asset, pk=asset_id)
        return ReviewAssignment.objects.filter(asset_id=asset_id)
    
    def perform_create(self, serializer):
        asset_id = self.kwargs.get('asset_id')
        asset = get_object_or_404(Asset, pk=asset_id)
        
        try:
            # Save the assignment with the asset and current user as assigned_by
            assignment = serializer.save(asset=asset, assigned_by=self.request.user)
            
            # Broadcast review assignment event to all connected users
            AssetEventService.broadcast_review_assigned(
                asset_id=asset_id,
                assigned_user_id=assignment.user.id,
                role=assignment.role,
                assigned_by=self.request.user
            )
        except Exception as e:
            # Handle unique constraint violation
            if 'unique' in str(e).lower() or 'duplicate' in str(e).lower():
                raise serializers.ValidationError(
                    'A review assignment with this user and role already exists for this asset.'
                )
            raise


class AssetReviewView(generics.UpdateAPIView):
    """
    API endpoint for submitting a review action for an asset.

    Methods:
        patch(request, *args, **kwargs): 
            Handles PATCH requests to perform review actions on an asset.

    Usage:
        - Allows authenticated users to submit, approve, reject, acknowledge rejection, or start review for an asset.
        - Broadcasts status changes and review actions to all connected users via AssetEventService.

    PATCH Parameters:
        action (str): The review action to perform. Must be one of: 'submit', 'approve', 'reject', 'start_review', 'acknowledge_rejection', 'archive'.
        comment (str, optional): An optional comment to include with the review action.

    Returns:
        200 OK with status and detail message on success.
        400 Bad Request with error detail if action is invalid or not allowed in current state.
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = Asset.objects.all()
    serializer_class = AssetReviewSerializer
    http_method_names = ['patch']  # Only allow PATCH method
    
    def patch(self, request, *args, **kwargs):
        asset = self.get_object()
        action = request.data.get('action')
        comment = request.data.get('comment', '')
        
        if action == 'approve':
            if not asset.can_approve():
                return Response(
                    {'detail': 'Asset cannot be approved from its current state.'}, 
                    status=400
                )
            old_status = asset.status
            asset.approve(approver=request.user)
            asset.save()
            
            # Broadcast status change event to all connected users
            AssetEventService.broadcast_status_change(
                asset_id=asset.id,
                from_state=old_status,
                to_state=asset.status,
                changed_by=request.user,
                metadata={'action': 'approve', 'comment': comment}
            )
            

            return Response({
                'detail': 'Asset approved successfully.',
                'status': asset.status
            })
        
        elif action == 'reject':
            if not asset.can_reject():  # Same check for reject
                return Response(
                    {'detail': 'Asset cannot be rejected from its current state.'}, 
                    status=400
                )
            old_status = asset.status
            asset.reject(rejector=request.user, reason=comment)
            asset.save()
            
            # Broadcast status change event to all connected users
            AssetEventService.broadcast_status_change(
                asset_id=asset.id,
                from_state=old_status,
                to_state=asset.status,
                changed_by=request.user,
                metadata={'action': 'reject', 'comment': comment}
            )
            

            return Response({
                'detail': 'Asset rejected successfully.',
                'status': asset.status
            })
        

        
        elif action == 'submit':
            if not asset.can_submit():
                return Response(
                    {'detail': 'Asset cannot be submitted from its current state.'}, 
                    status=400
                )
            old_status = asset.status
            asset.submit(submitted_by=request.user)
            asset.save()
            
            # Broadcast status change event to all connected users
            AssetEventService.broadcast_status_change(
                asset_id=asset.id,
                from_state=old_status,
                to_state=asset.status,
                changed_by=request.user,
                metadata={'action': 'submit', 'comment': comment}
            )
            
            return Response({
                'detail': 'Asset submitted for review successfully.',
                'status': asset.status
            })
        
        elif action == 'start_review':
            if not asset.can_start_review():
                return Response(
                    {'detail': 'Asset cannot start review from its current state.'}, 
                    status=400
                )
            old_status = asset.status
            asset.start_review(reviewer=request.user)
            asset.save()
            
            # Broadcast status change event to all connected users
            AssetEventService.broadcast_status_change(
                asset_id=asset.id,
                from_state=old_status,
                to_state=asset.status,
                changed_by=request.user,
                metadata={'action': 'review_start', 'comment': comment}
            )
            
            return Response({
                'detail': 'Review started successfully.',
                'status': asset.status
            })
        
        elif action == 'acknowledge_rejection':
            if not asset.can_acknowledge_rejection():
                return Response(
                    {'detail': 'Asset cannot acknowledge rejection from its current state.'}, 
                    status=400
                )
            old_status = asset.status
            asset.acknowledge_rejection(returned_by=request.user, reason=comment)
            asset.save()
            
            # Broadcast status change event to all connected users
            AssetEventService.broadcast_status_change(
                asset_id=asset.id,
                from_state=old_status,
                to_state=asset.status,
                changed_by=request.user,
                metadata={'action': 'acknowledge_rejection', 'comment': comment}
            )
            

            
            return Response({
                'detail': 'Asset rejection acknowledged successfully.',
                'status': asset.status
            })
        
        elif action == 'archive':
            if not asset.can_archive():
                return Response(
                    {'detail': 'Asset cannot be archived from its current state.'}, 
                    status=400
                )
            old_status = asset.status
            asset.archive(archived_by=request.user)
            asset.save()
            
            # Broadcast status change event to all connected users
            AssetEventService.broadcast_status_change(
                asset_id=asset.id,
                from_state=old_status,
                to_state=asset.status,
                changed_by=request.user,
                metadata={'action': 'archived', 'comment': comment}
            )
            

            
            return Response({
                'detail': 'Asset archived successfully.',
                'status': asset.status
            })
        
        else:
            return Response(
                {'detail': 'Invalid action. Must be one of: submit, approve, reject, start_review, acknowledge_rejection, archive.'}, 
                status=400
            )


class BulkReviewView(generics.CreateAPIView):
    """Bulk review multiple assets"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        reviews = request.data.get('reviews', [])
        if not reviews:
            return Response(
                {'detail': 'No reviews provided.'}, 
                status=400
            )
        
        # Ensure reviews is a list
        if not isinstance(reviews, list):
            return Response(
                {'detail': 'Reviews must be a list of review objects.'}, 
                status=400
            )
        
        results = []
        for review_data in reviews:
            # Ensure review_data is a dictionary
            if not isinstance(review_data, dict):
                return Response(
                    {'detail': f'Invalid review data format. Expected dict, got {type(review_data).__name__}'}, 
                    status=400
                )
            
            asset_id = review_data.get('asset_id')
            action = review_data.get('action')
            comment = review_data.get('comment', '')
            
            try:
                asset = Asset.objects.get(pk=asset_id)
                
                if action == 'submit':
                    if asset.can_submit():
                        asset.submit(submitted_by=request.user)
                        asset.save()
                        status = 'submitted'
                    else:
                        status = 'failed'
                        comment = 'Asset cannot be submitted from its current state.'
                
                elif action == 'approve':
                    if asset.can_approve():
                        asset.approve(approver=request.user)
                        asset.save()
                        status = 'approved'
                    else:
                        status = 'failed'
                        comment = 'Asset cannot be approved from its current state.'
                
                elif action == 'reject':
                    if asset.can_reject():
                        asset.reject(rejector=request.user, reason=comment)
                        asset.save()
                        status = 'rejected'
                    else:
                        status = 'failed'
                        comment = 'Asset cannot be rejected from its current state.'
                
                elif action == 'start_review':
                    if asset.can_start_review():
                        asset.start_review(reviewer=request.user)
                        asset.save()
                        status = 'review_started'
                    else:
                        status = 'failed'
                        comment = 'Asset cannot start review from its current state.'
                
                elif action == 'archive':
                    if asset.can_archive():
                        asset.archive(archived_by=request.user)
                        asset.save()
                        status = 'archived'
                    else:
                        status = 'failed'
                        comment = 'Asset cannot be archived from its current state.'
                
                else:
                    status = 'failed'
                    comment = 'Invalid action.'
                
                results.append({
                    'asset_id': asset_id,
                    'status': status,
                    'message': comment,
                    'new_status': asset.status if status != 'failed' else None
                })
                
            except Asset.DoesNotExist:
                results.append({
                    'asset_id': asset_id,
                    'status': 'failed',
                    'message': 'Asset not found.',
                    'new_status': None
                })
        
        return Response({
            'results': results,
            'summary': {
                'total': len(reviews),
                'successful': len([r for r in results if r['status'] != 'failed']),
                'failed': len([r for r in results if r['status'] == 'failed'])
            }
        })


class AssetVersionPublishView(APIView):
    """
    Publish a specific asset version (Draft -> Finalized).
    - POST: Publish version from Draft to Finalized state
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        asset_id = self.kwargs.get('asset_id')
        version_id = self.kwargs.get('version_id')
        
        version = get_object_or_404(AssetVersion, pk=version_id, asset_id=asset_id)
        
        if not version.can_be_finalized():
            return Response(
                {'detail': 'Version cannot be finalized. Must be in Draft state and scan status must be Clean.'}, 
                status=400
            )
        
        # Publish the version (Draft -> Finalized)
        version.finalize(finalized_by=request.user)
        version.save()
        
        # Broadcast version published event to all connected users
        file_name = version.get_file_name()
        AssetEventService.broadcast_version_published(
            asset_id=asset_id,
            version_number=version.version_number,
            published_by=request.user,
            file_name=file_name
        )
        
        return Response({
            'detail': 'Version published successfully.',
            'version_status': version.version_status
        })


class AssetAcknowledgeView(APIView):
    """
    Acknowledge rejection and return asset to editing state (RevisionRequired -> NotSubmitted).
    - POST: Acknowledge rejection and return to NotSubmitted state
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['post']

    def post(self, request, *args, **kwargs):
        asset = get_object_or_404(Asset, pk=self.kwargs.get('pk'))
        
        if not asset.can_acknowledge_rejection():
            return Response(
                {'detail': 'Asset cannot acknowledge rejection from its current state.'}, 
                status=400
            )
        
        # Acknowledge rejection (RevisionRequired -> NotSubmitted)
        old_status = asset.status
        asset.acknowledge_rejection(returned_by=request.user)
        asset.save()
        
        # Broadcast status change event to all connected users
        AssetEventService.broadcast_status_change(
            asset_id=asset.id,
            from_state=old_status,
            to_state=asset.status,
            changed_by=request.user,
            metadata={'action': 'acknowledged_rejection'}
        )
        
        return Response({
            'detail': 'Asset rejection acknowledged successfully.',
            'status': asset.status
        }) 


class AssetVersionDownloadView(APIView):
    """Download a specific asset version (only Finalized versions)"""
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get']
    
    def get(self, request, *args, **kwargs):
        asset_id = self.kwargs.get('asset_id')
        version_id = self.kwargs.get('version_id')
        
        # Get the specific version
        version = get_object_or_404(AssetVersion, pk=version_id, asset_id=asset_id)
        
        # Check if the version is finalized
        if version.version_status != AssetVersion.FINALIZED:
            return Response(
                {'detail': 'Only finalized versions can be downloaded.'}, 
                status=400
            )
        
        # Check if the version has a file
        if not version.file:
            return Response(
                {'detail': 'No file available for download.'}, 
                status=404
            )
        
        # Prepare download response
        download_data = {
            'asset_id': version.asset.id,
            'asset_title': version.asset.task.name if version.asset.task else None,
            'asset_status': version.asset.status,
            'version_number': version.version_number,
            'version_status': version.version_status,
            'file_name': version.get_file_name(),
            'file_size': None,  # Could be added if needed
            'checksum': version.checksum,
            'scan_status': version.scan_status,
            'uploaded_at': version.created_at,
            'uploaded_by': version.uploaded_by.username
        }
        
        # Add download URL for uploaded file
        download_data['download_url'] = request.build_absolute_uri(version.file.url)
        download_data['file_type'] = 'uploaded'
        
        return Response(download_data) 

