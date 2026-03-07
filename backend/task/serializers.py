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
    owner_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    project = ProjectSummarySerializer(read_only=True)
    project_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    current_approver = UserSummarySerializer(read_only=True)
    current_approver_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    is_subtask = serializers.BooleanField(read_only=True)
    parent_relationship = serializers.SerializerMethodField()
    order_in_project = serializers.IntegerField(required=False)
    approval_chain_progress = serializers.SerializerMethodField()
    can_lock = serializers.SerializerMethodField()
    approvals_summary = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'summary', 'description', 'status', 'type',
            'owner', 'owner_id', 'project', 'project_id',
            'current_approver', 'current_approver_id',
            'content_type', 'object_id', 'start_date', 'due_date',
            'is_subtask', 'parent_relationship', 'order_in_project',
            'anomaly_status', 'approval_chain_progress',
            'can_lock', 'approvals_summary',
        ]
        read_only_fields = [
            'id', 'status', 'owner', 'content_type', 'object_id',
            'is_subtask', 'parent_relationship', 'anomaly_status',
            'approval_chain_progress', 'can_lock', 'approvals_summary',
        ]

    def get_approval_chain_progress(self, obj):
        """
        Return approval chain progress info for the frontend.

        Returns None if no chain is assigned (legacy single-approver mode).
        Otherwise returns:
          {
            "current_step": 2,
            "total_steps": 3,
            "step_display": "Step 2 of 3",
            "chain_name": "Buyer → Lead → Client",
            "next_approver": { "id": ..., "username": ..., "email": ... } | null,
            "steps": [
              {
                "step_number": 1,
                "status": "approved",
                "approver": { "id": ..., "username": ..., "email": ... },
                "record": { "approved_by": {...}, "is_approved": true, "decided_time": "...", "comment": "..." }
              },
              {
                "step_number": 2,
                "status": "current",
                "approver": { ... },
                "record": null
              },
              ...
            ]
          }
        """
        if not obj.approval_chain or not obj.current_approval_step:
            return None

        chain = obj.approval_chain
        total = chain.total_steps
        current = obj.current_approval_step

        # Build a lookup of existing approval records: step_number -> record
        records = {r.step_number: r for r in obj.approval_records.all()}

        # Extract per-step role labels from chain name (e.g. "Buyer → Lead → Client")
        role_labels = [part.strip() for part in chain.name.split('→')]

        steps = []
        for step_num in range(1, total + 1):
            chain_step = chain.get_step(step_num)
            if not chain_step:
                continue

            if step_num < current:
                status = 'approved'
            elif step_num == current:
                status = 'current'
            else:
                status = 'pending'

            record = records.get(step_num)
            record_data = None
            if record:
                record_data = {
                    'approved_by': UserSummarySerializer(record.approved_by).data,
                    'is_approved': record.is_approved,
                    'decided_time': record.decided_time.isoformat(),
                    'comment': record.comment,
                }

            # Use the role label from chain name if available, otherwise fall back to "Step N"
            role_name = role_labels[step_num - 1] if step_num - 1 < len(role_labels) else f'Step {step_num}'

            steps.append({
                'step_number': step_num,
                'role_name': role_name,
                'status': status,
                'approver': UserSummarySerializer(chain_step.approver).data,
                'record': record_data,
            })

        next_step = chain.get_step(current + 1)
        return {
            'current_step': current,
            'total_steps': total,
            'step_display': f'Step {current} of {total}',
            'chain_name': chain.name,
            'next_approver': UserSummarySerializer(next_step.approver).data if next_step else None,
            'steps': steps,
        }

    def get_can_lock(self, obj):
        """
        Returns True if the task is allowed to be locked right now.

        Rules:
        - Task must be in APPROVED status.
        - If an approval chain is assigned, the number of approved records
          must meet the chain's effective_required_approvals threshold.
        - Legacy tasks (no chain) can always be locked once APPROVED.
        """
        if obj.status != 'APPROVED':
            return False
        if not obj.approval_chain:
            return True  # Legacy mode: no minimum required
        approved_count = obj.approval_records.filter(is_approved=True).count()
        return approved_count >= obj.approval_chain.effective_required_approvals

    def get_approvals_summary(self, obj):
        """
        Returns a human-readable approval progress summary for chain-mode tasks.

        Example: { "approved_count": 1, "required_count": 2, "display": "1 of 2 approvals" }
        Returns None for legacy tasks (no chain assigned).
        """
        if not obj.approval_chain:
            return None
        approved_count = obj.approval_records.filter(is_approved=True).count()
        required = obj.approval_chain.effective_required_approvals
        return {
            'approved_count': approved_count,
            'required_count': required,
            'display': f'{approved_count} of {required} approvals',
        }

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
        
        # Determine project for owner and approver validation (updated or existing)
        project = validated_data.get('project', getattr(self.instance, 'project', None))

        # Handle owner_id if provided
        if 'owner_id' in validated_data:
            owner_id = validated_data.pop('owner_id')
            if owner_id is not None:
                try:
                    owner = User.objects.get(id=owner_id)
                except User.DoesNotExist:
                    raise serializers.ValidationError({'owner_id': 'User not found'})

                if project is None:
                    raise serializers.ValidationError({
                        'project_id': 'Project is required to validate owner.'
                    })

                has_membership = ProjectMember.objects.filter(
                    user=owner,
                    project=project,
                    is_active=True,
                ).exists()
                if not has_membership:
                    raise serializers.ValidationError({
                        'owner_id': 'Owner must be a member of the project.'
                    })

                validated_data['owner'] = owner
            else:
                validated_data['owner'] = None
        
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
        valid_types = ['budget', 'asset', 'retrospective', 'report', 'scaling', 'alert', 'experiment', 'optimization', 'communication', 'platform_policy_update']
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
            'scalingplan', 'alerttask', 'experiment',
            'optimization',
            'clientcommunication',
            'reporttask',
            'decision',
            'platformpolicyupdate',
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
