from rest_framework import viewsets, status, generics, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from task.models import Task, ApprovalRecord, TaskComment, TaskAttachment
from task.serializers import TaskSerializer, TaskLinkSerializer, ApprovalRecordSerializer, TaskApprovalSerializer, TaskForwardSerializer, TaskCommentSerializer, TaskAttachmentSerializer
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from core.models import ProjectMember, Project
from core.utils.project import get_user_active_project

class TaskViewSet(viewsets.ModelViewSet):
    """ViewSet for Task model"""
    queryset = Task.objects.select_related('project', 'owner', 'current_approver')
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    
    def force_create(self, request):
        """
        Fallback task creation endpoint.

        - Require the frontend to pass a valid project_id
        - Ensure the current user is a member of this Project (create ProjectMember if it doesn't exist)
        - Use the normal serializer to create Task
        - Don't automatically create Project (avoid too much magic)
        """
        data = request.data.copy()
        project_id = data.get('project_id')

        if not project_id:
            return Response(
                {'error': 'project_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get the project (404 if it doesn't exist)
        project = get_object_or_404(Project, id=project_id)

        # Ensure the current user is a member of this project
        ProjectMember.objects.get_or_create(
            user=request.user,
            project=project,
            defaults={'is_active': True},
        )

        # Use the normal serializer to create the task
        serializer = self.get_serializer(
            data=data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        task = serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def get_queryset(self):
        """Filter queryset based on user permissions and query parameters"""
        user = self.request.user
        if not user.is_authenticated:
            return Task.objects.none()

        queryset = Task.objects.select_related('project', 'owner', 'current_approver')
        accessible_project_ids = set(
            ProjectMember.objects.filter(
                user=user,
                is_active=True
            ).values_list('project_id', flat=True)
        )
        
        # Use user.active_project directly to avoid side effects from get_user_active_project
        # which automatically sets active_project if it's None
        active_project = user.active_project
        # Verify that active_project is still accessible (user still has membership)
        if active_project:
            if active_project.id not in accessible_project_ids:
                # Active project is no longer accessible, clear it
                active_project = None
                user.active_project = None
                user.save(update_fields=['active_project'])

        requested_project_id = self.request.query_params.get('project_id')
        if requested_project_id is not None:
            try:
                requested_project_id = int(requested_project_id)
            except (TypeError, ValueError):
                raise ValidationError({'project_id': 'project_id must be an integer'})

            if requested_project_id not in accessible_project_ids:
                raise PermissionDenied('You do not have access to this project.')

            queryset = queryset.filter(project_id=requested_project_id)
        else:
            if active_project:
                queryset = queryset.filter(project_id=active_project.id)
            elif accessible_project_ids:
                queryset = queryset.filter(project_id__in=accessible_project_ids)
            else:
                return Task.objects.none()

        # Apply filters
        task_type = self.request.query_params.get('type')
        if task_type:
            queryset = queryset.filter(type=task_type)
        
        owner_id = self.request.query_params.get('owner_id')
        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)
        
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by content_type
        content_type = self.request.query_params.get('content_type')
        if content_type:
            try:
                ct = ContentType.objects.get(model=content_type)
                queryset = queryset.filter(content_type=ct)
            except ContentType.DoesNotExist:
                # If content_type doesn't exist, return empty queryset
                return Task.objects.none()
        
        # Filter by object_id
        object_id = self.request.query_params.get('object_id')
        if object_id:
            queryset = queryset.filter(object_id=object_id)
        
        # Order by creation date (newest first)
        queryset = queryset.order_by('-id')
        
        return queryset

    def get_object(self):
        """
        Retrieve a single task object.

        Unlike list(), this should not depend on the user's active_project.
        Instead, we:
        - fetch the task by primary key
        - verify the authenticated user has membership in the task's project
        """
        from rest_framework.exceptions import PermissionDenied  # local import to avoid circulars

        # Base queryset without project filtering so we can locate the task by ID
        base_qs = Task.objects.select_related('project', 'owner', 'current_approver')
        task = get_object_or_404(base_qs, pk=self.kwargs.get('pk'))

        user = self.request.user
        if not user.is_authenticated:
            raise PermissionDenied('Authentication credentials were not provided.')

        # Ensure the user is an active member of the task's project
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=task.project,
            is_active=True,
        ).exists()

        if not has_membership:
            raise PermissionDenied('You do not have access to this task.')

        self.check_object_permissions(self.request, task)
        return task
    
    def perform_create(self, serializer):
        """Create a new task"""
        return serializer.save()
    
    def perform_update(self, serializer):
        """Update a task"""
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Delete task and its linked retrospective object if it's a retrospective task
        """
        # If this is a retrospective task, delete the linked RetrospectiveTask first
        if instance.type == 'retrospective' and instance.content_type and instance.object_id:
            try:
                # Get the ContentType for RetrospectiveTask
                from retrospective.models import RetrospectiveTask
                retrospective_content_type = ContentType.objects.get_for_model(RetrospectiveTask)
                
                # Check if the task is linked to a RetrospectiveTask
                if instance.content_type == retrospective_content_type:
                    try:
                        # Get and delete the RetrospectiveTask
                        retrospective = RetrospectiveTask.objects.get(id=instance.object_id)
                        retrospective.delete()
                        print(f"Deleted RetrospectiveTask {instance.object_id} linked to Task {instance.id}")
                    except RetrospectiveTask.DoesNotExist:
                        print(f"RetrospectiveTask {instance.object_id} not found, skipping deletion")
                    except Exception as e:
                        print(f"Error deleting RetrospectiveTask {instance.object_id}: {e}")
            except Exception as e:
                print(f"Error checking RetrospectiveTask for deletion: {e}")
        
        # Delete the task itself
        instance.delete()
    
    @action(detail=True, methods=['post'])
    def link(self, request, pk=None):
        """Link task to an existing object"""
        task = self.get_object()
        
        # Check if task is already linked
        if task.is_linked:
            return Response(
                {'error': 'Task is already linked to an object'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate link data
        serializer = TaskLinkSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the linked object from validated data
        linked_object = serializer.validated_data['linked_object']
        
        # Link the task to the object
        task.link_to_object(linked_object)
        
        # Save the task to persist the link
        task.save()
        
        # Task is already in SUBMITTED status from creation
        # No need to call submit() again
        
        # Return the updated task
        task_serializer = TaskSerializer(task, context={'request': request})
        return Response(task_serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def make_approval(self, request, pk=None):
        """Make approval decision (approve or reject) for a task"""
        task = self.get_object()
        
        # Validate task can be approved/rejected
        if task.status != Task.Status.UNDER_REVIEW:
            return Response(
                {'error': 'Task must be in UNDER_REVIEW status to be approved or rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate request data
        serializer = TaskApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        action = serializer.validated_data['action']
        comment = serializer.validated_data.get('comment', '')
        
        try:
            # Execute the action
            if action == 'approve':
                task.approve()
                is_approved = True
            else:  # action == 'reject'
                task.reject()
                is_approved = False
            
            # Create approval record
            next_step = task.approval_records.count() + 1
            ApprovalRecord.objects.create(
                task=task,
                approved_by=task.current_approver or request.user,
                is_approved=is_approved,
                comment=comment,
                step_number=next_step
            )
            
            # Save the task to persist the state change
            task.save()
            
            # Return both the approval record and updated task data
            approval_serializer = ApprovalRecordSerializer(
                task.approval_records.latest('step_number')
            )
            task_serializer = TaskSerializer(task, context={'request': request})
            
            return Response({
                'approval_record': approval_serializer.data,
                'task': task_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a task"""
        task = self.get_object()
        
        # Validate task can be cancelled
        cancellable_statuses = [
            Task.Status.SUBMITTED,
            Task.Status.UNDER_REVIEW,
            Task.Status.APPROVED,
            Task.Status.REJECTED
        ]
        if task.status not in cancellable_statuses:
            return Response(
                {'error': 'Task cannot be cancelled in current status'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Cancel the task
            task.cancel()
            
            # Delete all approval records
            task.approval_records.all().delete()
            
            # Return task
            task_serializer = TaskSerializer(task, context={'request': request})
            return Response({
                'task': task_serializer.data,
                'approval_record': None
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def approval_history(self, request, pk=None):
        """Get approval history for a task"""
        task = self.get_object()
        
        # Get approval records ordered by step_number
        approval_records = task.approval_records.all().order_by('step_number')
        
        # Serialize the approval records
        approval_serializer = ApprovalRecordSerializer(approval_records, many=True)
        
        return Response({
            'history': approval_serializer.data
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def revise(self, request, pk=None):
        """Revise a task (change status to DRAFT)"""
        task = self.get_object()
        
        # Validate task can be revised
        revisable_statuses = [Task.Status.REJECTED, Task.Status.CANCELLED]
        if task.status not in revisable_statuses:
            return Response(
                {'error': 'Task must be in REJECTED or CANCELLED status to be revised'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Revise the task (just change status to DRAFT)
            task.revise()

            # Save the task to persist the state change
            task.save()
            
            # Return updated task
            task_serializer = TaskSerializer(task, context={'request': request})
            return Response({
                'task': task_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        """Forward a task to next approver (update current_approver)"""
        task = self.get_object()
        
        # Validate task can be forwarded
        forwardable_statuses = [Task.Status.APPROVED]
        if task.status not in forwardable_statuses:
            return Response(
                {'error': 'Task must be in APPROVED status to be forwarded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate request data
        serializer = TaskForwardSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        next_approver_id = serializer.validated_data['next_approver_id']
        comment = serializer.validated_data.get('comment', '')
        
        try:
            # Get the new approver
            User = get_user_model()
            new_approver = User.objects.get(id=next_approver_id)
            
            # Forward the task
            task.forward_to_next()
            
            # Update current_approver
            task.current_approver = new_approver
            task.save()
            
            # Return updated task
            task_serializer = TaskSerializer(task, context={'request': request})
            return Response({
                'task': task_serializer.data
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'User with this ID does not exist'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def start_review(self, request, pk=None):
        """Start review for a task (change status to UNDER_REVIEW)"""
        task = self.get_object()
        
        # Validate task can start review
        if task.status != Task.Status.SUBMITTED:
            return Response(
                {'error': 'Task must be in SUBMITTED status to start review'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Start review
            task.start_review()
            task.save()  # Save the state change
            
            # Return updated task
            task_serializer = TaskSerializer(task, context={'request': request})
            return Response({
                'task': task_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        """Lock a task (change status to LOCKED)"""
        task = self.get_object()
        
        # Validate task can be locked
        lockable_statuses = [Task.Status.APPROVED]
        if task.status not in lockable_statuses:
            return Response(
                {'error': 'Task must be in APPROVED status to be locked'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Lock the task
            task.lock()
            task.save()  # Save the state change
            
            # Return updated task
            task_serializer = TaskSerializer(task, context={'request': request})
            return Response({
                'task': task_serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class TaskCommentListView(generics.ListCreateAPIView):
    """
    List comments for a task or create a new task-level comment.
    Comments are attached directly to the Task, regardless of type.
    """
    serializer_class = TaskCommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        task = get_object_or_404(Task, pk=task_id)

        # Enforce same project-based access control as TaskViewSet
        user = self.request.user
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=task.project,
            is_active=True,
        ).exists()

        if not has_membership:
            raise PermissionDenied('You do not have access to this task.')

        return TaskComment.objects.filter(task_id=task_id)

    def perform_create(self, serializer):
        task_id = self.kwargs.get('task_id')
        task = get_object_or_404(Task, pk=task_id)

        has_membership = ProjectMember.objects.filter(
            user=self.request.user,
            project=task.project,
            is_active=True,
        ).exists()

        if not has_membership:
            raise PermissionDenied('You do not have access to comment on this task.')

        serializer.save(task=task, user=self.request.user)


class TaskAttachmentListView(generics.ListCreateAPIView):
    """
    List attachments for a task or create a new task attachment.
    Attachments are attached directly to the Task, regardless of type.
    """
    serializer_class = TaskAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        task = get_object_or_404(Task, pk=task_id)

        # Enforce same project-based access control as TaskViewSet
        user = self.request.user
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=task.project,
            is_active=True,
        ).exists()

        if not has_membership:
            raise PermissionDenied('You do not have access to this task.')

        return TaskAttachment.objects.filter(task_id=task_id)

    def perform_create(self, serializer):
        task_id = self.kwargs.get('task_id')
        task = get_object_or_404(Task, pk=task_id)

        has_membership = ProjectMember.objects.filter(
            user=self.request.user,
            project=task.project,
            is_active=True,
        ).exists()

        if not has_membership:
            raise PermissionDenied('You do not have access to upload attachments to this task.')

        serializer.save(task=task, uploaded_by=self.request.user)


class TaskAttachmentDetailView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete a specific task attachment.
    """
    serializer_class = TaskAttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        task_id = self.kwargs.get('task_id')
        task = get_object_or_404(Task, pk=task_id)

        # Enforce same project-based access control
        user = self.request.user
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=task.project,
            is_active=True,
        ).exists()

        if not has_membership:
            raise PermissionDenied('You do not have access to this task.')

        return TaskAttachment.objects.filter(task_id=task_id)

    def get_object(self):
        # Use get_queryset() to ensure permission checks are applied
        queryset = self.get_queryset()
        attachment_id = self.kwargs.get('pk')
        return get_object_or_404(queryset, pk=attachment_id)


class TaskAttachmentDownloadView(APIView):
    """Download a specific task attachment"""
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get']
    
    def get(self, request, *args, **kwargs):
        task_id = self.kwargs.get('task_id')
        attachment_id = self.kwargs.get('pk')
        
        # Get the specific attachment
        attachment = get_object_or_404(TaskAttachment, pk=attachment_id, task_id=task_id)
        
        # Check project membership
        user = request.user
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=attachment.task.project,
            is_active=True,
        ).exists()
        
        if not has_membership:
            raise PermissionDenied('You do not have access to this task.')
        
        # Check if the attachment has a file
        if not attachment.file:
            return Response(
                {'detail': 'No file available for download.'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return download URL
        download_data = {
            'task_id': attachment.task.id,
            'task_summary': attachment.task.summary,
            'attachment_id': attachment.id,
            'file_name': attachment.original_filename,
            'file_size': attachment.file_size,
            'content_type': attachment.content_type,
            'checksum': attachment.checksum,
            'scan_status': attachment.scan_status,
            'uploaded_at': attachment.created_at,
            'uploaded_by': attachment.uploaded_by.username,
            'download_url': request.build_absolute_uri(attachment.file.url)
        }
        
        return Response(download_data)
