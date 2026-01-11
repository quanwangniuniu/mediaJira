from rest_framework import serializers
from task.models import Task, ApprovalRecord, TaskComment, TaskAttachment, TaskHierarchy, TaskRelation
from core.models import Project, ProjectMember
from core.utils.project import get_user_active_project
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
import logging
import mimetypes
logger = logging.getLogger(__name__)

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """Serializer for user summary information"""
    class Meta:
        model = User
        fields = ['id', 'username', 'email']


class ProjectSummarySerializer(serializers.ModelSerializer):
    """Serializer for project summary information"""
    class Meta:
        model = Project
        fields = ['id', 'name']


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model"""
    owner = UserSummarySerializer(read_only=True)
    project = ProjectSummarySerializer(read_only=True)
    project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    current_approver = UserSummarySerializer(read_only=True)
    current_approver_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    is_subtask = serializers.BooleanField(read_only=True)
    parent_relationship = serializers.SerializerMethodField()
    order_in_project = serializers.IntegerField(required=False)
    
    class Meta:
        model = Task
        fields = [
            'id', 'summary', 'description', 'status', 'type',
            'owner', 'project', 'project_id', 'current_approver', 'current_approver_id', 'content_type', 'object_id', 'start_date', 'due_date', 'is_subtask', 'parent_relationship', 'order_in_project', 'anomaly_status'
        ]
        read_only_fields = ['id', 'status', 'owner', 'content_type', 'object_id', 'is_subtask', 'parent_relationship', 'anomaly_status']
    
    def create(self, validated_data):
        """Create a new task"""
        user = self.context['request'].user
        validated_data['owner'] = user

        project = self._resolve_project(user, validated_data.pop('project_id', None))
        self._ensure_project_membership(user, project)
        validated_data['project'] = project
        
        # Get current_approver from current_approver_id
        current_approver_id = validated_data.pop('current_approver_id', None)
        logger.debug(f"DEBUG: current_approver_id from pop: {current_approver_id}")
        logger.debug(f"DEBUG: current_approver_id type: {type(current_approver_id)}")
        
        if current_approver_id is not None:
            try:
                current_approver = User.objects.get(id=current_approver_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'current_approver_id': 'User not found'})

            # Ensure approver is a member of the same project
            has_membership = ProjectMember.objects.filter(
                user=current_approver,
                project=project,
                is_active=True,
            ).exists()
            if not has_membership:
                raise serializers.ValidationError({
                    'current_approver_id': 'Approver must be a member of the project.'
                })

            validated_data['current_approver'] = current_approver
            logger.debug(f"DEBUG: Set current_approver to: {current_approver}")
        else:
            print(f"DEBUG: current_approver_id is None, not setting current_approver")
        
        # Create the task
        task = super().create(validated_data)
        
        # Submit the task to change status from DRAFT to SUBMITTED
        # This ensures the task is in the correct state for approval workflow
        try:
            task.submit()
            task.save()
            logger.debug(f"DEBUG: Task {task.id} status changed from DRAFT to SUBMITTED")
        except Exception as e:
            logger.error(f"ERROR: Failed to submit task {task.id}: {e}")
            # Don't fail the creation, but log the error
        
        return task
    
    def update(self, instance, validated_data):
        """Update a task"""
        if 'project_id' in validated_data:
            project_id = validated_data.pop('project_id')
            if project_id is not None:
                project = self._resolve_project(
                    self.context['request'].user,
                    project_id
                )
                self._ensure_project_membership(self.context['request'].user, project)
                validated_data['project'] = project
        
        # Determine project for approver validation (updated or existing)
        project = validated_data.get('project', getattr(self.instance, 'project', None))
        
        # Handle current_approver_id if provided
        if 'current_approver_id' in validated_data:
            current_approver_id = validated_data.pop('current_approver_id')
            if current_approver_id is not None:
                try:
                    current_approver = User.objects.get(id=current_approver_id)
                except User.DoesNotExist:
                    raise serializers.ValidationError({'current_approver_id': 'User not found'})

                # Ensure approver is a member of the task's project
                if project is None:
                    raise serializers.ValidationError({
                        'project_id': 'Project is required to validate approver.'
                    })

                has_membership = ProjectMember.objects.filter(
                    user=current_approver,
                    project=project,
                    is_active=True,
                ).exists()
                if not has_membership:
                    raise serializers.ValidationError({
                        'current_approver_id': 'Approver must be a member of the project.'
                    })

                validated_data['current_approver'] = current_approver
            else:
                validated_data['current_approver'] = None
        
        return super().update(instance, validated_data)
    
    def validate(self, attrs):
        """Validate the data"""
        # For updates, reject type field if provided
        if self.instance and 'type' in attrs:
            raise serializers.ValidationError({
                'type': 'Task type cannot be modified after creation.'
            })
        return attrs
    
    def validate_type(self, value):
        """Validate task type"""
        valid_types = ['budget', 'asset', 'retrospective', 'report', 'scaling', 'communication']
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid task type. Must be one of: {valid_types}")
        return value
    
    content_type = serializers.SerializerMethodField()
    object_id = serializers.SerializerMethodField()
    
    def get_content_type(self, obj):
        """Get content type as string"""
        return obj.task_type
    
    def get_object_id(self, obj):
        """Get object id as string"""
        return obj.object_id

    def get_parent_relationship(self, obj):
        """Get parent relationship information for subtasks"""
        if not obj.is_subtask:
            return None
        hierarchy = obj.parent_relationship.first()
        if hierarchy:
            return [{
                'parent_task_id': hierarchy.parent_task_id,
            }]
        return None

    def _resolve_project(self, user, project_id):
        """Return project from id or from user's active project."""
        if project_id is not None:
            try:
                return Project.objects.get(id=project_id)
            except Project.DoesNotExist:
                raise serializers.ValidationError({'project_id': 'Project not found'})

        project = get_user_active_project(user)
        if not project:
            raise serializers.ValidationError({
                'project_id': 'Active project is required. Set an active project or provide project_id.'
            })
        return project

    def _ensure_project_membership(self, user, project):
        """Ensure the user can access the project."""
        has_membership = ProjectMember.objects.filter(
            user=user,
            project=project,
            is_active=True,
        ).exists()
        if not has_membership:
            raise serializers.ValidationError({
                'project_id': 'You do not have access to this project.'
            })


class TaskLinkSerializer(serializers.Serializer):
    """Serializer for linking task to an object"""
    content_type = serializers.CharField()
    object_id = serializers.CharField()
    
    def validate_content_type(self, value):
        """Validate content type"""
        valid_content_types = [
            'budgetrequest',
            'asset',
            'retrospectivetask',
            'report',
            'scalingplan',
            'clientcommunication',
        ]
        if value not in valid_content_types:
            raise serializers.ValidationError(f"Invalid content type. Must be one of: {valid_content_types}")
        return value
    
    def validate(self, data):
        """Validate the link data"""
        content_type = data['content_type']
        object_id = data['object_id']
        
        try:
            # Get the content type
            ct = ContentType.objects.get(model=content_type)
            
            # Try to get the object
            model_class = ct.model_class()
            if model_class is None:
                raise serializers.ValidationError(f"Content type '{content_type}' not found")
            
            # For UUID fields (like RetrospectiveTask), convert string to UUID
            if content_type == 'retrospectivetask':
                import uuid
                try:
                    object_uuid = uuid.UUID(object_id)
                    obj = model_class.objects.get(id=object_uuid)
                except (ValueError, model_class.DoesNotExist):
                    raise serializers.ValidationError(f"Object with id '{object_id}' not found")
            else:
                # For integer fields
                try:
                    obj = model_class.objects.get(id=object_id)
                except (ValueError, model_class.DoesNotExist):
                    raise serializers.ValidationError(f"Object with id '{object_id}' not found")
            
            # Store the object in validated_data for later use
            data['linked_object'] = obj
            
        except ContentType.DoesNotExist:
            raise serializers.ValidationError(f"Content type '{content_type}' not found")
        
        return data


class TaskApprovalSerializer(serializers.Serializer):
    """Serializer for task approval/rejection requests"""
    action = serializers.ChoiceField(choices=['approve', 'reject'], required=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    
    def validate_action(self, value):
        """Validate action value"""
        if value not in ['approve', 'reject']:
            raise serializers.ValidationError("Action must be either 'approve' or 'reject'")
        return value


class TaskForwardSerializer(serializers.Serializer):
    """Serializer for task forward requests"""
    next_approver_id = serializers.IntegerField(required=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    
    def validate_next_approver_id(self, value):
        """Validate next_approver_id exists"""
        try:
            User.objects.get(id=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("User with this ID does not exist")
        return value


class ApprovalRecordSerializer(serializers.ModelSerializer):
    """Serializer for ApprovalRecord model"""
    approved_by = UserSummarySerializer(read_only=True)
    
    class Meta:
        model = ApprovalRecord
        fields = [
            'id', 'approved_by', 'is_approved', 'comment',
            'decided_time', 'step_number'
        ]
        read_only_fields = ['id', 'approved_by', 'step_number', 'decided_time']


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for TaskComment model."""
    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = TaskComment
        fields = ['id', 'task', 'user', 'body', 'created_at']
        read_only_fields = ['id', 'task', 'user', 'created_at']


class TaskAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for TaskAttachment model"""
    uploaded_by = UserSummarySerializer(read_only=True)
    original_filename = serializers.CharField(required=False)
    file_size = serializers.IntegerField(required=False)
    
    class Meta:
        model = TaskAttachment
        fields = [
            'id', 'task', 'file', 'original_filename', 'file_size',
            'content_type', 'checksum', 'scan_status', 'uploaded_by', 'created_at'
        ]
        read_only_fields = ['id', 'task', 'uploaded_by', 'created_at', 'checksum', 'scan_status']
    
    def validate(self, attrs):
        """Validate file is required for creation"""
        file_obj = attrs.get('file')
        if self.instance is None and file_obj is None:
            raise serializers.ValidationError("File is required for attachment creation.")
        return attrs
    
    def create(self, validated_data):
        """Create attachment and set metadata"""
        file_obj = validated_data.get('file')
        if file_obj:
            # Set metadata from file
            validated_data['original_filename'] = file_obj.name
            validated_data['file_size'] = file_obj.size
            validated_data['content_type'] = file_obj.content_type or mimetypes.guess_type(file_obj.name)[0] or 'application/octet-stream'
        
        return super().create(validated_data)


class SubtaskAddSerializer(serializers.Serializer):
    """Serializer for adding a subtask to a parent task"""
    child_task_id = serializers.IntegerField(required=True)


class TaskRelationAddSerializer(serializers.Serializer):
    """Serializer for adding a task relation"""
    target_task_id = serializers.IntegerField(required=True)
    relationship_type = serializers.ChoiceField(
        choices=['causes', 'blocks', 'clones', 'relates_to'],
        required=True
    )
