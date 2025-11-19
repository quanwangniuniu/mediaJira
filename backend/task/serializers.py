from rest_framework import serializers
from task.models import Task, ApprovalRecord
from core.models import Project
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
import logging
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
    project_id = serializers.IntegerField(write_only=True)
    current_approver = UserSummarySerializer(read_only=True)
    current_approver_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Task
        fields = [
            'id', 'summary', 'description', 'status', 'type',
            'owner', 'project', 'project_id', 'current_approver', 'current_approver_id', 'content_type', 'object_id', 'due_date'
        ]
        read_only_fields = ['id', 'status', 'owner', 'content_type', 'object_id']
    
    def create(self, validated_data):
        """Create a new task"""
        # Set the owner to the current user
        validated_data['owner'] = self.context['request'].user
        
        # Get project from project_id
        project_id = validated_data.pop('project_id')
        try:
            project = Project.objects.get(id=project_id)
            validated_data['project'] = project
        except Project.DoesNotExist:
            raise serializers.ValidationError({'project_id': 'Project not found'})
        
        # Get current_approver from current_approver_id
        current_approver_id = validated_data.pop('current_approver_id', None)
        logger.debug(f"DEBUG: current_approver_id from pop: {current_approver_id}")
        logger.debug(f"DEBUG: current_approver_id type: {type(current_approver_id)}")
        
        if current_approver_id is not None:
            try:
                current_approver = User.objects.get(id=current_approver_id)
                validated_data['current_approver'] = current_approver
                logger.debug(f"DEBUG: Set current_approver to: {current_approver}")
            except User.DoesNotExist:
                raise serializers.ValidationError({'current_approver_id': 'User not found'})
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
        # Handle project_id if provided
        if 'project_id' in validated_data:
            project_id = validated_data.pop('project_id')
            try:
                project = Project.objects.get(id=project_id)
                validated_data['project'] = project
            except Project.DoesNotExist:
                raise serializers.ValidationError({'project_id': 'Project not found'})
        
        # Handle current_approver_id if provided
        if 'current_approver_id' in validated_data:
            current_approver_id = validated_data.pop('current_approver_id')
            if current_approver_id is not None:
                try:
                    current_approver = User.objects.get(id=current_approver_id)
                    validated_data['current_approver'] = current_approver
                except User.DoesNotExist:
                    raise serializers.ValidationError({'current_approver_id': 'User not found'})
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
        valid_types = ['budget', 'asset', 'retrospective', 'report']
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


class TaskLinkSerializer(serializers.Serializer):
    """Serializer for linking task to an object"""
    content_type = serializers.CharField()
    object_id = serializers.CharField()
    
    def validate_content_type(self, value):
        """Validate content type"""
        valid_content_types = ['budgetrequest', 'asset', 'retrospectivetask', 'report']
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
