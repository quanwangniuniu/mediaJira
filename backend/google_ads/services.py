"""
Google Ads Business Logic Service
Provides business logic for ad creation, updates, review, etc.
"""
from django.db import transaction
from django.core.exceptions import ValidationError
import secrets
from .models import (
    Ad, AdImageAsset, AdTextAsset, AdVideoAsset,
    ImageAdInfo, VideoAdInfo,
    VideoResponsiveAdInfo, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo,
    AdPreview
)

class AdService:
    """Ad business service"""
    @staticmethod
    @transaction.atomic
    def create_ad_with_assets(ad_data, ad_type_data=None, asset_data=None):
        """
        Create ad and its related assets     
        Args:
            ad_data: Ad basic data
            ad_type_data: Ad type specific data
            asset_data: Asset data      
        Returns:
            Ad: Created ad instance
        """
        # Create ad
        ad = Ad.objects.create(**ad_data)      
        # Create ad type information
        if ad_type_data:
            AdService._create_ad_type_info(ad, ad_type_data)      
        # Create assets
        if asset_data:
            AdService._create_assets(ad, asset_data)      
        return ad
    
    @staticmethod
    def _create_ad_type_info(ad, ad_type_data):
        """Create ad type information"""
        ad_type = ad.type       
        if ad_type == 'IMAGE_AD' and 'image_ad' in ad_type_data:
            image_ad_info = ImageAdInfo.objects.create(**ad_type_data['image_ad'])
            ad.image_ad = image_ad_info
            ad.save()
        elif ad_type == 'VIDEO_AD' and 'video_ad' in ad_type_data:
            video_ad_info = VideoAdInfo.objects.create(**ad_type_data['video_ad'])
            ad.video_ad = video_ad_info
            ad.save()
        elif ad_type == 'VIDEO_RESPONSIVE_AD' and 'video_responsive_ad' in ad_type_data:
            video_responsive_ad_info = VideoResponsiveAdInfo.objects.create(**ad_type_data['video_responsive_ad'])
            ad.video_responsive_ad = video_responsive_ad_info
            ad.save()
        elif ad_type == 'RESPONSIVE_SEARCH_AD' and 'responsive_search_ad' in ad_type_data:
            responsive_search_ad_info = ResponsiveSearchAdInfo.objects.create(**ad_type_data['responsive_search_ad'])
            ad.responsive_search_ad = responsive_search_ad_info
            ad.save()
        elif ad_type == 'RESPONSIVE_DISPLAY_AD' and 'responsive_display_ad' in ad_type_data:
            responsive_display_ad_info = ResponsiveDisplayAdInfo.objects.create(**ad_type_data['responsive_display_ad'])
            ad.responsive_display_ad = responsive_display_ad_info
            ad.save()
    
    @staticmethod
    def _create_assets(ad, asset_data):
        """Batch create assets"""
        asset_creators = {
            'image_assets': AdImageAsset,
            'text_assets': AdTextAsset,
            'video_assets': AdVideoAsset,
        }       
        for asset_type, model_class in asset_creators.items():
            if asset_type in asset_data:
                for asset_info in asset_data[asset_type]:
                    model_class.objects.create(**asset_info)

class AdPreviewService:
    """Ad preview service"""   
    @staticmethod
    def generate_preview_from_ad(ad, device_type='DESKTOP'):
        """
        Generate preview from current ad instance
        """
        # Generate preview data
        preview_data = AdPreviewService._generate_preview_data(ad, device_type)    
        # Generate secure token
        token = secrets.token_urlsafe(32)   
        # Set expiration time (default 7 days)
        from django.utils import timezone
        from datetime import timedelta
        expiration_time = timezone.now() + timedelta(days=7)
        
        # Create preview
        preview = AdPreview.objects.create(
            token=token,
            ad=ad,
            device_type=device_type,
            preview_data=preview_data,
            created_by=ad.created_by,
            expiration_date_time=expiration_time
        )
        return preview
     
    @staticmethod
    def get_preview_by_token(token):
        """
        Get preview data by token
        """
        try:
            preview = AdPreview.objects.get(token=token)
            
            # Check if expired
            from django.utils import timezone
            if preview.expiration_date_time < timezone.now():
                raise ValidationError("Preview token has expired")
                
            return preview.preview_data          
        except AdPreview.DoesNotExist:
            raise ValidationError("Preview token not found")   
    @staticmethod
    def _generate_preview_data(ad, device_type):
        preview_data = {
            'device_type': device_type,
            'ad_id': ad.id,
            'ad_name': ad.name,
            'ad_type': ad.type,
            'status': ad.status,
            'resource_name': ad.resource_name,
            'display_url': ad.display_url,
            'final_urls': ad.final_urls,
            'final_mobile_urls': ad.final_mobile_urls,
            'tracking_url_template': ad.tracking_url_template,
            'final_url_suffix': ad.final_url_suffix,
            'device_preference': ad.device_preference,
            'added_by_google_ads': ad.added_by_google_ads,
            'system_managed_resource_source': ad.system_managed_resource_source,
            'customer_account_id': ad.customer_account.customer_id if ad.customer_account else None,
            'customer_account_name': ad.customer_account.descriptive_name if ad.customer_account else None,
            'created_by': ad.created_by.id if ad.created_by else None,
            'created_at': ad.created_at.isoformat() if ad.created_at else None,
            'updated_at': ad.updated_at.isoformat() if ad.updated_at else None,
        }       
        # Add ad type specific data
        ad_type_data = AdPreviewService._extract_ad_type_data(ad)
        if ad_type_data:
            preview_data['ad_type_data'] = ad_type_data       
        # Add URL collections data
        url_collections_data = AdPreviewService._extract_url_collections_data(ad)
        if url_collections_data:
            preview_data['url_collections'] = url_collections_data       
        # Add custom parameters data
        custom_params_data = AdPreviewService._extract_custom_parameters_data(ad)
        if custom_params_data:
            preview_data['url_custom_parameters'] = custom_params_data       
        # Add final app URLs data
        final_app_urls_data = AdPreviewService._extract_final_app_urls_data(ad)
        if final_app_urls_data:
            preview_data['final_app_urls'] = final_app_urls_data      
        return preview_data
      
    @staticmethod
    def _extract_ad_type_data(ad):
        """Extract ad type specific data"""
        ad_type_data = {}      
        if ad.image_ad:
            ad_type_data['image_ad'] = {
                'mime_type': ad.image_ad.mime_type,
                'pixel_width': ad.image_ad.pixel_width,
                'pixel_height': ad.image_ad.pixel_height,
                'image_url': ad.image_ad.image_url,
                'preview_pixel_width': ad.image_ad.preview_pixel_width,
                'preview_pixel_height': ad.image_ad.preview_pixel_height,
                'preview_image_url': ad.image_ad.preview_image_url,
                'name': ad.image_ad.name,
                'image_asset': ad.image_ad.image_asset.asset if ad.image_ad.image_asset else None,
                'data': ad.image_ad.data is not None,  # Only return whether data exists, not actual binary data
                'ad_id_to_copy_image_from': ad.image_ad.ad_id_to_copy_image_from,
            }        
        elif ad.video_ad:
            ad_type_data['video_ad'] = {
                'video_asset': ad.video_ad.video_asset.asset if ad.video_ad.video_asset else None,
                'video_asset_info': ad.video_ad.video_asset_info,
            }            
            # Add video format data
            if ad.video_ad.format_in_stream:
                ad_type_data['video_ad']['format_in_stream'] = {
                    'action_button_label': ad.video_ad.format_in_stream.action_button_label,
                    'action_headline': ad.video_ad.format_in_stream.action_headline,
                    'companion_banner': ad.video_ad.format_in_stream.companion_banner.asset if ad.video_ad.format_in_stream.companion_banner else None,
                }
            if ad.video_ad.format_bumper:
                ad_type_data['video_ad']['format_bumper'] = {
                    'action_button_label': ad.video_ad.format_bumper.action_button_label,
                    'action_headline': ad.video_ad.format_bumper.action_headline,
                    'companion_banner': ad.video_ad.format_bumper.companion_banner.asset if ad.video_ad.format_bumper.companion_banner else None,
                }
            if ad.video_ad.format_outstream:
                ad_type_data['video_ad']['format_outstream'] = {
                    'headline': ad.video_ad.format_outstream.headline,
                    'description': ad.video_ad.format_outstream.description if ad.video_ad.format_outstream.description else None,
                }
            if ad.video_ad.format_non_skippable:
                ad_type_data['video_ad']['format_non_skippable'] = {
                    'companion_banner': ad.video_ad.format_non_skippable.companion_banner.asset if ad.video_ad.format_non_skippable.companion_banner else None,
                    'action_button_label': ad.video_ad.format_non_skippable.action_button_label,
                    'action_headline': ad.video_ad.format_non_skippable.action_headline
                }
            if ad.video_ad.format_in_feed:
                ad_type_data['video_ad']['format_in_feed'] = {
                    'headline': ad.video_ad.format_in_feed.headline,
                    'description1': ad.video_ad.format_in_feed.description1,
                    'description2': ad.video_ad.format_in_feed.description2,
                    'thumbnail': ad.video_ad.format_in_feed.thumbnail,
                }       
        elif ad.responsive_search_ad:
            ad_type_data['responsive_search_ad'] = {
                'path1': ad.responsive_search_ad.path1,
                'path2': ad.responsive_search_ad.path2,
                'headlines': [asset.text for asset in ad.responsive_search_ad.headlines.all()],
                'descriptions': [asset.text for asset in ad.responsive_search_ad.descriptions.all()],
            }       
        elif ad.responsive_display_ad:
            ad_type_data['responsive_display_ad'] = {
                'business_name': ad.responsive_display_ad.business_name,
                'main_color': ad.responsive_display_ad.main_color,
                'accent_color': ad.responsive_display_ad.accent_color,
                'allow_flexible_color': ad.responsive_display_ad.allow_flexible_color,
                'call_to_action_text': ad.responsive_display_ad.call_to_action_text,
                'price_prefix': ad.responsive_display_ad.price_prefix,
                'promo_text': ad.responsive_display_ad.promo_text,
                'format_setting': ad.responsive_display_ad.format_setting,
                'enable_asset_enhancements': ad.responsive_display_ad.enable_asset_enhancements,
                'enable_autogen_video': ad.responsive_display_ad.enable_autogen_video,
                'headlines': [asset.text for asset in ad.responsive_display_ad.headlines.all()],
                'long_headline': ad.responsive_display_ad.long_headline.text if ad.responsive_display_ad.long_headline else None,
                'descriptions': [asset.text for asset in ad.responsive_display_ad.descriptions.all()],
                'marketing_images': [asset.asset for asset in ad.responsive_display_ad.marketing_images.all()],
                'square_marketing_images': [asset.asset for asset in ad.responsive_display_ad.square_marketing_images.all()],
                'logo_images': [asset.asset for asset in ad.responsive_display_ad.logo_images.all()],
                'square_logo_images': [asset.asset for asset in ad.responsive_display_ad.square_logo_images.all()],
                'youtube_videos': [asset.asset for asset in ad.responsive_display_ad.youtube_videos.all()],
                'control_spec': ad.responsive_display_ad.control_spec,
            }
        elif ad.video_responsive_ad:
            ad_type_data['video_responsive_ad'] = {
                'headlines': [asset.text for asset in ad.video_responsive_ad.headlines.all()],
                'long_headlines': [asset.text for asset in ad.video_responsive_ad.long_headlines.all()],
                'descriptions': [asset.text for asset in ad.video_responsive_ad.descriptions.all()],
                'call_to_actions': [asset.text for asset in ad.video_responsive_ad.call_to_actions.all()],
                'videos': [asset.asset for asset in ad.video_responsive_ad.videos.all()],
                'companion_banners': [asset.asset for asset in ad.video_responsive_ad.companion_banners.all()],
                'breadcrumb1': ad.video_responsive_ad.breadcrumb1,
                'breadcrumb2': ad.video_responsive_ad.breadcrumb2,
            }     
        return ad_type_data
    
    @staticmethod
    def _extract_url_collections_data(ad):
        """Extract URL collections data"""
        url_collections = ad.url_collections.all()
        if not url_collections:
            return None      
        return [
            {
                'url_collection_id': collection.url_collection_id,
                'final_urls': collection.final_urls,
                'final_mobile_urls': collection.final_mobile_urls,
                'tracking_url_template': collection.tracking_url_template,
            }
            for collection in url_collections
        ]
    
    @staticmethod
    def _extract_custom_parameters_data(ad):
        """Extract custom parameters data"""
        custom_params = ad.url_custom_parameters.all()
        if not custom_params:
            return None       
        return [
            {
                'key': param.key,
                'value': param.value,
            }
            for param in custom_params
        ]
    
    @staticmethod
    def _extract_final_app_urls_data(ad):
        """Extract final app URLs data"""
        final_app_urls = ad.final_app_urls.all()
        if not final_app_urls:
            return None      
        return [
            {
                'os_type': url.os_type,
                'url': url.url,
            }
            for url in final_app_urls
        ]


