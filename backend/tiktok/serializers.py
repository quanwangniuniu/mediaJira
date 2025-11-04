from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import AdDraft, AdGroup, PublicPreview

User = get_user_model()


class AdGroupSerializer(serializers.ModelSerializer):
    """Serializer for AdGroup model"""
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    
    class Meta:
        model = AdGroup
        fields = [
            'id',
            'gid',
            'name',
            'created_by_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'gid', 'created_by_id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create a new AdGroup instance"""
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class AdDraftSerializer(serializers.ModelSerializer):
    """Serializer for AdDraft model"""
    created_by_id = serializers.IntegerField(source='created_by.id', read_only=True)
    ad_group_id = serializers.UUIDField(source='ad_group.id', read_only=True, allow_null=True)
    ad_group = serializers.PrimaryKeyRelatedField(
        queryset=AdGroup.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )
    
    class Meta:
        model = AdDraft
        fields = [
            'id',
            'aid',
            'name',
            'ad_text',
            'call_to_action',
            'creative_type',
            'opt_status',
            'assets',
            'ad_group',
            'ad_group_id',
            'created_by_id',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'aid', 'created_by_id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create a new AdDraft instance"""
        validated_data['created_by'] = self.context['request'].user
        # Ensure ad_group belongs to the user if provided
        ad_group = validated_data.get('ad_group')
        if ad_group and ad_group.created_by != validated_data['created_by']:
            raise serializers.ValidationError({'ad_group': 'Ad group does not belong to the current user'})
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update an existing AdDraft instance"""
        # Ensure ad_group belongs to the user if provided
        ad_group = validated_data.get('ad_group')
        if ad_group and ad_group.created_by != instance.created_by:
            raise serializers.ValidationError({'ad_group': 'Ad group does not belong to the current user'})
        return super().update(instance, validated_data)


class PublicPreviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = PublicPreview
        fields = ['id', 'slug', 'ad_draft', 'version_id', 'snapshot_json', 'created_at']
        read_only_fields = ['id', 'slug', 'created_at']

