import base64
import uuid
from rest_framework import serializers
from django.db.models import Max
from django.shortcuts import get_object_or_404
from core.models import Project, ProjectMember
from miro.models import Board, BoardItem, BoardRevision


def generate_share_token():
    """Generate a 24-character share token from UUID base64 encoded"""
    uuid_bytes = uuid.uuid4().bytes
    token = base64.urlsafe_b64encode(uuid_bytes).decode('utf-8').rstrip('=')
    # Ensure exactly 24 chars (UUID base64 = 22 chars, pad if needed)
    return token[:24].ljust(24, 'A')


class BoardSerializer(serializers.ModelSerializer):
    """Serializer for Board model"""
    project_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        model = Board
        fields = [
            'id', 'project_id', 'title', 'share_token', 'viewport',
            'is_archived', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'share_token', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """Convert project FK to project_id in response"""
        data = super().to_representation(instance)
        data['project_id'] = instance.project_id
        return data


class BoardCreateSerializer(BoardSerializer):
    """Serializer for creating a new board"""
    project_id = serializers.IntegerField(write_only=True, required=True)

    def validate_project_id(self, value):
        """Validate project exists and user has access"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required")
        
        try:
            project = Project.objects.get(id=value)
        except Project.DoesNotExist:
            raise serializers.ValidationError("Project not found")
        
        # Check if user is a member of the project
        has_membership = ProjectMember.objects.filter(
            user=request.user,
            project=project,
            is_active=True
        ).exists()
        
        if not has_membership:
            raise serializers.ValidationError("You do not have access to this project")
        
        return value

    def create(self, validated_data):
        """Create board with auto-generated share token"""
        project_id = validated_data.pop('project_id')
        # Project already validated in validate_project_id, so safe to use get()
        project = Project.objects.get(id=project_id)
        
        # Generate unique share token
        share_token = generate_share_token()
        while Board.objects.filter(share_token=share_token).exists():
            share_token = generate_share_token()
        
        validated_data['project'] = project
        validated_data['share_token'] = share_token
        
        return super().create(validated_data)


class BoardUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a board (PATCH)"""

    class Meta:
        model = Board
        fields = ['title', 'viewport', 'is_archived']
        read_only_fields = []


class BoardItemSerializer(serializers.ModelSerializer):
    """Serializer for BoardItem model"""
    board_id = serializers.UUIDField(write_only=True, required=False)
    parent_item_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = BoardItem
        fields = [
            'id', 'board_id', 'type', 'parent_item_id', 'x', 'y',
            'width', 'height', 'rotation', 'style', 'content',
            'z_index', 'is_deleted', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_deleted', 'created_at', 'updated_at']

    def to_representation(self, instance):
        """Convert FKs to IDs in response"""
        data = super().to_representation(instance)
        data['board_id'] = str(instance.board_id)
        if instance.parent_item_id:
            data['parent_item_id'] = str(instance.parent_item_id)
        return data


class BoardItemCreateSerializer(BoardItemSerializer):
    """Serializer for creating a board item"""

    def validate_type(self, value):
        """Validate item type is in allowed choices"""
        valid_types = [choice[0] for choice in BoardItem.ItemType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid type. Must be one of: {', '.join(valid_types)}"
            )
        return value

    def create(self, validated_data):
        """Create item with board from context"""
        board = self.context.get('board')
        if not board:
            raise serializers.ValidationError("Board context is required")
        
        validated_data['board'] = board
        
        # Handle parent_item_id
        parent_item_id = validated_data.pop('parent_item_id', None)
        if parent_item_id:
            try:
                parent_item = BoardItem.objects.get(id=parent_item_id, board=board)
                validated_data['parent_item'] = parent_item
            except BoardItem.DoesNotExist:
                raise serializers.ValidationError({
                    'parent_item_id': 'Parent item not found'
                })
        
        return super().create(validated_data)


class BoardItemUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a board item (PATCH)"""
    parent_item_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = BoardItem
        fields = [
            'type', 'parent_item_id', 'x', 'y', 'width', 'height',
            'rotation', 'style', 'content', 'z_index'
        ]

    def validate_type(self, value):
        """Validate item type is in allowed choices"""
        valid_types = [choice[0] for choice in BoardItem.ItemType.choices]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid type. Must be one of: {', '.join(valid_types)}"
            )
        return value

    def update(self, instance, validated_data):
        """Update item with parent_item handling"""
        parent_item_id = validated_data.pop('parent_item_id', None)
        
        if parent_item_id is not None:
            if parent_item_id:
                try:
                    parent_item = BoardItem.objects.get(
                        id=parent_item_id,
                        board=instance.board
                    )
                    validated_data['parent_item'] = parent_item
                except BoardItem.DoesNotExist:
                    raise serializers.ValidationError({
                        'parent_item_id': 'Parent item not found'
                    })
            else:
                validated_data['parent_item'] = None
        
        return super().update(instance, validated_data)


class BoardItemBatchUpdateSerializer(serializers.Serializer):
    """Serializer for batch updating board items"""
    items = serializers.ListField(
        child=serializers.DictField(),
        required=True
    )

    # Note: ID validation is handled in the view to allow partial failures
    # Items without IDs will be added to the 'failed' array


class BoardRevisionSerializer(serializers.ModelSerializer):
    """Serializer for BoardRevision model"""
    board_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = BoardRevision
        fields = [
            'id', 'board_id', 'version', 'snapshot', 'note', 'created_at'
        ]
        read_only_fields = ['id', 'version', 'created_at']

    def to_representation(self, instance):
        """Convert board FK to board_id in response"""
        data = super().to_representation(instance)
        data['board_id'] = str(instance.board_id)
        return data


class BoardRevisionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a board revision"""

    class Meta:
        model = BoardRevision
        fields = ['snapshot', 'note']

    def validate_snapshot(self, value):
        """Validate snapshot is a dictionary"""
        if not isinstance(value, dict):
            raise serializers.ValidationError("Snapshot must be a dictionary")
        return value

    def create(self, validated_data):
        """Create revision with auto-incremented version"""
        board = self.context.get('board')
        if not board:
            raise serializers.ValidationError("Board context is required")
        
        # Get next version number
        max_version = BoardRevision.objects.filter(
            board=board
        ).aggregate(Max('version'))['version__max'] or 0
        next_version = max_version + 1
        
        validated_data['board'] = board
        validated_data['version'] = next_version
        
        return super().create(validated_data)


class ShareBoardResponseSerializer(serializers.Serializer):
    """Serializer for share board response (board + items)"""
    board = BoardSerializer()
    items = BoardItemSerializer(many=True)

