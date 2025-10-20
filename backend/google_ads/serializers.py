from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Ad, CustomerAccount, FinalAppUrl, CustomParameter, UrlCollection,
    AdImageAsset, AdTextAsset, AdVideoAsset,
    ImageAdInfo, VideoAdInfo,
    VideoResponsiveAdInfo, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo,
    VideoTrueViewInStreamAdInfo, VideoBumperInStreamAdInfo, VideoOutstreamAdInfo,
    VideoNonSkippableInStreamAdInfo, InFeedVideoAdInfo
)

User = get_user_model()


# ========== Account Serializers (nested in Ad) ==========
    
class CustomerAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerAccount
        fields = ['id', 'customer_id', 'descriptive_name', 'status']
        read_only_fields = ['id']


# ========== Asset Serializers ==========

class AdImageAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdImageAsset
        fields = ['id', 'asset', 'pixel_width', 'pixel_height', 'file_size_bytes']


class AdTextAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdTextAsset
        fields = ['id', 'text']


class AdVideoAssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdVideoAsset
        fields = ['id', 'asset']


class FinalAppUrlSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinalAppUrl
        fields = ['id', 'os_type', 'url']


class CustomParameterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomParameter
        fields = ['id', 'key', 'value']


class UrlCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UrlCollection
        fields = ['id', 'url_collection_id', 'final_urls', 'final_mobile_urls', 'tracking_url_template']




class ImageAdInfoSerializer(serializers.ModelSerializer):
    image_asset = AdImageAssetSerializer(read_only=True)
    image_asset_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = ImageAdInfo
        fields = [
            'id', 'mime_type', 'pixel_width', 'pixel_height', 'image_url',
            'preview_pixel_width', 'preview_pixel_height', 'preview_image_url',
            'name', 'image_asset', 'image_asset_id', 'data', 'ad_id_to_copy_image_from'
        ]


class VideoTrueViewInStreamAdInfoSerializer(serializers.ModelSerializer):
    companion_banner = AdImageAssetSerializer(read_only=True)
    companion_banner_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = VideoTrueViewInStreamAdInfo
        fields = ['id', 'action_button_label', 'action_headline', 'companion_banner', 'companion_banner_id']


class VideoBumperInStreamAdInfoSerializer(serializers.ModelSerializer):
    companion_banner = AdImageAssetSerializer(read_only=True)
    companion_banner_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = VideoBumperInStreamAdInfo
        fields = ['id', 'action_button_label', 'action_headline', 'companion_banner', 'companion_banner_id']


class VideoOutstreamAdInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VideoOutstreamAdInfo
        fields = ['id', 'headline', 'description']


class VideoNonSkippableInStreamAdInfoSerializer(serializers.ModelSerializer):
    companion_banner = AdImageAssetSerializer(read_only=True)
    companion_banner_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = VideoNonSkippableInStreamAdInfo
        fields = ['id', 'action_button_label', 'action_headline', 'companion_banner', 'companion_banner_id']


class InFeedVideoAdInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = InFeedVideoAdInfo
        fields = ['id', 'headline', 'description1', 'description2', 'thumbnail']


class VideoAdInfoSerializer(serializers.ModelSerializer):
    video_asset = AdVideoAssetSerializer(read_only=True)
    video_asset_id = serializers.IntegerField(write_only=True, required=False)
    
    format_in_stream = VideoTrueViewInStreamAdInfoSerializer(read_only=True)
    format_bumper = VideoBumperInStreamAdInfoSerializer(read_only=True)
    format_out_stream = VideoOutstreamAdInfoSerializer(read_only=True)
    format_non_skippable = VideoNonSkippableInStreamAdInfoSerializer(read_only=True)
    format_in_feed = InFeedVideoAdInfoSerializer(read_only=True)
    
    class Meta:
        model = VideoAdInfo
        fields = [
            'id', 'video_asset', 'video_asset_id', 'video_asset_info',
            'format_in_stream', 'format_bumper', 'format_out_stream',
            'format_non_skippable', 'format_in_feed'
        ]


class VideoResponsiveAdInfoSerializer(serializers.ModelSerializer):
    headlines = AdTextAssetSerializer(many=True, read_only=True)
    long_headlines = AdTextAssetSerializer(many=True, read_only=True)
    descriptions = AdTextAssetSerializer(many=True, read_only=True)
    call_to_actions = AdTextAssetSerializer(many=True, read_only=True)
    videos = AdVideoAssetSerializer(many=True, read_only=True)
    companion_banners = AdImageAssetSerializer(many=True, read_only=True)
    
    headline_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    long_headline_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    description_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    call_to_action_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    video_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    companion_banner_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    class Meta:
        model = VideoResponsiveAdInfo
        fields = [
            'id', 'breadcrumb1', 'breadcrumb2',
            'headlines', 'long_headlines', 'descriptions', 'call_to_actions', 'call_to_actions_enabled',
            'videos', 'companion_banners',
            'headline_ids', 'long_headline_ids', 'description_ids',
            'call_to_action_ids', 'video_ids', 'companion_banner_ids'
        ]


class ResponsiveSearchAdInfoSerializer(serializers.ModelSerializer):
    headlines = AdTextAssetSerializer(many=True, read_only=True)
    descriptions = AdTextAssetSerializer(many=True, read_only=True)
    
    headline_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    description_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    class Meta:
        model = ResponsiveSearchAdInfo
        fields = ['id', 'path1', 'path2', 'headlines', 'descriptions', 'headline_ids', 'description_ids']


class ResponsiveDisplayAdInfoSerializer(serializers.ModelSerializer):
    marketing_images = AdImageAssetSerializer(many=True, read_only=True)
    square_marketing_images = AdImageAssetSerializer(many=True, read_only=True)
    logo_images = AdImageAssetSerializer(many=True, read_only=True)
    square_logo_images = AdImageAssetSerializer(many=True, read_only=True)
    headlines = AdTextAssetSerializer(many=True, read_only=True)
    long_headline = AdTextAssetSerializer(read_only=True)
    descriptions = AdTextAssetSerializer(many=True, read_only=True)
    youtube_videos = AdVideoAssetSerializer(many=True, read_only=True)
    
    marketing_image_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    square_marketing_image_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    logo_image_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    square_logo_image_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    headline_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    long_headline_id = serializers.IntegerField(write_only=True, required=False)
    description_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    youtube_video_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    class Meta:
        model = ResponsiveDisplayAdInfo
        fields = [
            'id', 'business_name', 'main_color', 'accent_color', 'allow_flexible_color',
            'call_to_action_text', 'price_prefix', 'promo_text', 'format_setting',
            'enable_asset_enhancements', 'enable_autogen_video', 'control_spec',
            'marketing_images', 'square_marketing_images', 'logo_images', 'square_logo_images',
            'headlines', 'long_headline', 'descriptions', 'youtube_videos',
            'marketing_image_ids', 'square_marketing_image_ids', 'logo_image_ids',
            'square_logo_image_ids', 'headline_ids', 'long_headline_id',
            'description_ids', 'youtube_video_ids'
        ]


class AdSerializer(serializers.ModelSerializer):
    # Related ad type information
    image_ad = ImageAdInfoSerializer(read_only=True)
    video_ad = VideoAdInfoSerializer(read_only=True)
    video_responsive_ad = VideoResponsiveAdInfoSerializer(read_only=True)
    responsive_search_ad = ResponsiveSearchAdInfoSerializer(read_only=True)
    responsive_display_ad = ResponsiveDisplayAdInfoSerializer(read_only=True)
    
    # URL related information
    final_app_urls = FinalAppUrlSerializer(many=True, read_only=True)
    url_custom_parameters = CustomParameterSerializer(many=True, read_only=True)
    url_collections = UrlCollectionSerializer(many=True, read_only=True)
    
    # Media assets
    media_assets = serializers.StringRelatedField(many=True, read_only=True)
    media_asset_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True, required=False)
    
    # User and account information
    created_by = serializers.StringRelatedField(read_only=True)
    customer_account = CustomerAccountSerializer(read_only=True)
    
    # ID fields for write operations
    customer_account_id = serializers.IntegerField(write_only=True)
    created_by_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Ad
        fields = [
            'id', 'resource_name', 'google_ads_id', 'name', 'display_url',
            'added_by_google_ads', 'type', 'device_preference', 'system_managed_resource_source',
            'final_urls', 'final_mobile_urls', 'tracking_url_template', 'final_url_suffix',
            'status', 'created_at', 'updated_at',
            
            # Ad type information
            'image_ad', 'video_ad', 'video_responsive_ad', 
            'responsive_search_ad', 'responsive_display_ad',
            
            # URL related information
            'final_app_urls', 'url_custom_parameters', 'url_collections',
            
            # Related information
            'customer_account', 'created_by', 'media_assets',
            'customer_account_id', 'created_by_id', 'media_asset_ids'
        ]
        read_only_fields = ['google_ads_id', 'added_by_google_ads', 'system_managed_resource_source', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate Union Field constraints"""
        ad_type_fields = [
            data.get('image_ad'), data.get('video_ad'), data.get('video_responsive_ad'),
            data.get('responsive_search_ad'), data.get('responsive_display_ad')
        ]
        
        non_empty_count = sum(1 for field in ad_type_fields if field)
        if non_empty_count > 1:
            raise serializers.ValidationError("Only one ad type can be set")
        
        return data

    def create(self, validated_data):
        """Create ad instance"""
        # Extract related IDs
        customer_account_id = validated_data.pop('customer_account_id')
        created_by_id = validated_data.pop('created_by_id', None)
        media_asset_ids = validated_data.pop('media_asset_ids', [])
        
        # Create corresponding ad type object based on type field
        ad_type = validated_data.get('type')
        ad_type_obj = None
        
        if ad_type == 'RESPONSIVE_SEARCH_AD':
            # Create basic ResponsiveSearchAdInfo
            ad_type_obj = ResponsiveSearchAdInfo.objects.create()
            # Add default headlines and descriptions
            for i in range(1, 4):
                headline = AdTextAsset.objects.create(text=f'Headline {i}')
                ad_type_obj.headlines.add(headline)
            for i in range(1, 3):
                description = AdTextAsset.objects.create(text=f'Description {i}')
                ad_type_obj.descriptions.add(description)
            validated_data['responsive_search_ad'] = ad_type_obj
            
        elif ad_type == 'RESPONSIVE_DISPLAY_AD':
            # Create basic ResponsiveDisplayAdInfo
            long_headline = AdTextAsset.objects.create(text='Long Headline')
            headline = AdTextAsset.objects.create(text='Headline')
            description = AdTextAsset.objects.create(text='Description')
            
            ad_type_obj = ResponsiveDisplayAdInfo.objects.create(
                business_name='Business Name',
                long_headline=long_headline,
                main_color='#FF0000',
                accent_color='#0000FF',
                allow_flexible_color=False
            )
            ad_type_obj.headlines.add(headline)
            ad_type_obj.descriptions.add(description)
            validated_data['responsive_display_ad'] = ad_type_obj
            
        elif ad_type == 'VIDEO_RESPONSIVE_AD':
            # Create basic VideoResponsiveAdInfo
            video_asset = AdVideoAsset.objects.create(asset='customers/123/assets/video1')
            long_headline = AdTextAsset.objects.create(text='Long Headline')
            description = AdTextAsset.objects.create(text='Description')
            
            ad_type_obj = VideoResponsiveAdInfo.objects.create(
                call_to_actions_enabled=False,
                companion_banner_enabled=False
            )
            ad_type_obj.videos.add(video_asset)
            ad_type_obj.long_headlines.add(long_headline)
            ad_type_obj.descriptions.add(description)
            validated_data['video_responsive_ad'] = ad_type_obj
        
        # Create ad instance
        ad = Ad.objects.create(
            customer_account_id=customer_account_id,
            created_by_id=created_by_id,
            **validated_data
        )
        
        # Set media assets
        if media_asset_ids:
            ad.media_assets.set(media_asset_ids)
        
        return ad

    def update(self, instance, validated_data):
        """Update ad instance"""
        # Extract related IDs
        customer_account_id = validated_data.pop('customer_account_id', None)
        created_by_id = validated_data.pop('created_by_id', None)
        media_asset_ids = validated_data.pop('media_asset_ids', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if customer_account_id:
            instance.customer_account_id = customer_account_id
        if created_by_id:
            instance.created_by_id = created_by_id
        
        instance.save()

        if media_asset_ids is not None:
            instance.media_assets.set(media_asset_ids)
        
        return instance


class AdListSerializer(serializers.ModelSerializer):
    """Ad list serializer"""
    customer_account = CustomerAccountSerializer(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = Ad
        fields = [
            'id', 'name', 'type', 'status', 'customer_account',
            'created_by', 'created_at', 'updated_at'
        ]