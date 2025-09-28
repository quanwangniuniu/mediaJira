from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Draft, ContentBlock, BlockAction

User = get_user_model()


class BlockActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlockAction
        fields = [
            'id', 'action_type', 'label', 'icon', 
            'is_enabled', 'order', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ContentBlockSerializer(serializers.ModelSerializer):
    actions = BlockActionSerializer(many=True, read_only=True)
    text_content = serializers.SerializerMethodField()
    
    class Meta:
        model = ContentBlock
        fields = [
            'id', 'draft', 'block_type', 'content', 'order', 
            'actions', 'text_content', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_text_content(self, obj):
        """Get plain text content from the block"""
        if hasattr(obj, 'get_text_content'):
            return obj.get_text_content()
        # For serialization, extract text from content dict
        if isinstance(obj, dict):
            content = obj.get('content', {})
            if isinstance(content, dict) and 'text' in content:
                return content['text']
        return str(obj.get('content', ''))


class DraftSerializer(serializers.ModelSerializer):
    blocks = ContentBlockSerializer(many=True, read_only=True)
    content_blocks_count = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Draft
        fields = [
            'id', 'title', 'user', 'user_email', 'status', 
            'content_blocks', 'blocks', 'content_blocks_count',
            'created_at', 'updated_at', 'is_deleted'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_content_blocks_count(self, obj):
        """Get the number of content blocks"""
        if isinstance(obj.content_blocks, list):
            return len(obj.content_blocks)
        return 0
    
    def validate_content_blocks(self, value):
        """Validate content blocks JSON structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("Content blocks must be a list")
        
        for i, block in enumerate(value):
            if not isinstance(block, dict):
                raise serializers.ValidationError(f"Block {i} must be a dictionary")
            
            if 'type' not in block:
                raise serializers.ValidationError(f"Block {i} must have a 'type' field")
            
            if 'content' not in block:
                raise serializers.ValidationError(f"Block {i} must have a 'content' field")
        
        return value


class DraftListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    content_blocks_count = serializers.SerializerMethodField()
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = Draft
        fields = [
            'id', 'title', 'user_email', 'status', 
            'content_blocks_count', 'created_at', 'updated_at'
        ]
    
    def get_content_blocks_count(self, obj):
        if isinstance(obj.content_blocks, list):
            return len(obj.content_blocks)
        return 0


class CreateDraftSerializer(serializers.ModelSerializer):
    """Serializer for creating new drafts"""
    class Meta:
        model = Draft
        fields = ['title', 'status', 'content_blocks']
    
    def create(self, validated_data):
        """Create a new draft with the current user"""
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class UpdateDraftSerializer(serializers.ModelSerializer):
    """Serializer for updating drafts"""
    class Meta:
        model = Draft
        fields = ['title', 'status', 'content_blocks']
    
    def update(self, instance, validated_data):
        """Update draft and handle content blocks"""
        return super().update(instance, validated_data)


class BlockActionCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating block actions"""
    class Meta:
        model = BlockAction
        fields = ['block', 'action_type', 'label', 'icon', 'is_enabled', 'order']
    
    def validate(self, data):
        """Validate that the block belongs to the current user's draft"""
        block = data.get('block')
        if block and hasattr(self.context.get('request'), 'user'):
            user = self.context['request'].user
            if block.draft.user != user:
                raise serializers.ValidationError("You can only add actions to your own drafts")
        return data


