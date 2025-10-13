import re
import secrets
from typing import List, Optional
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from .models import AdCreative, AdCreativePreview


def validate_numeric_string(input_id: str) -> bool:
    """
    Validate that input_id is a numeric string matching pattern '^\\d+$'
    """
    if input_id is None:
        return False
    pattern = r'^\d+$'
    return bool(re.match(pattern, input_id))


def get_allowed_ad_creative_fields() -> List[str]:
    """
    Get list of allowed fields for AdCreative based on OpenAPI spec
    """
    return [
        # Core fields
        'id', 'actor_id', 'name', 'status',
        
        # Content fields
        'body', 'title', 'image_hash', 'image_url', 'video_id', 'thumbnail_id', 'thumbnail_url',
        
        # Call to action
        'call_to_action_type', 'call_to_action',
        
        # Authorization and categorization
        'authorization_category', 'effective_authorization_category', 'categorization_criteria', 'category_media_source',
        
        # Object information
        'object_type', 'object_id', 'object_url', 'object_store_url', 'object_story_id',
        
        # Instagram and social
        'instagram_user_id', 'instagram_permalink_url', 'effective_instagram_media_id', 'effective_object_story_id',
        'source_facebook_post_id', 'source_instagram_media_id', 'threads_user_id',
        
        # Links and URLs
        'link_destination_display_url', 'link_og_id', 'link_url', 'template_url', 'url_tags',
        
        # Dynamic ads
        'product_set_id', 'bundle_folder_id', 'destination_set_id', 'place_page_set_id',
        'dynamic_ad_voice', 'applink_treatment',
        
        # Branded content
        'branded_content_sponsor_page_id', 'collaborative_ads_lsb_image_bank_id',
        
        # Features and settings
        'enable_direct_install', 'enable_launch_instant_app', 'user_page_actor_override',
        
        # Messages and welcome
        'page_welcome_message', 'messenger_sponsored_message',
        
        # Media and assets
        'photo_album_source_object_story_id', 'playable_asset_id', 'referral_id',
        
        # JSON fields
        'contextual_multi_ads', 'media_sourcing_spec', 'facebook_branded_content',
        'portrait_customizations', 'product_data', 'recommender_settings',
        'image_crops', 'ad_disclaimer_spec', 'asset_feed_spec', 'branded_content',
        'creative_sourcing_spec', 'degrees_of_freedom_spec', 'template_url_spec',
        'platform_customizations', 'interactive_components_spec',
        
        # Nested objects
        'adlabels', 'object_story_spec'
    ]


def validate_fields_param(fields_param: str) -> List[str]:
    """
    Validate and parse the fields parameter from query string
    Returns list of valid field names
    """
    if not fields_param:
        return []
    
    # Split by comma and clean up
    requested_fields = [field.strip() for field in fields_param.split(',') if field.strip()]
    allowed_fields = get_allowed_ad_creative_fields()
    
    # Validate each field
    valid_fields = []
    for field in requested_fields:
        if field in allowed_fields:
            valid_fields.append(field)
        else:
            raise ValidationError(f"Invalid field: {field}")
    
    return valid_fields


def validate_thumbnail_dimensions(width: Optional[int], height: Optional[int]) -> tuple:
    """
    Validate thumbnail width and height parameters
    Returns (width, height) with defaults applied
    """
    if width is not None and (width < 1 or width > 10000):
        raise ValidationError("thumbnail_width must be between 1 and 10000")
    
    if height is not None and (height < 1 or height > 10000):
        raise ValidationError("thumbnail_height must be between 1 and 10000")
    
    return width or 64, height or 64


def validate_title_and_body(title: str, body: str) -> None:
    """
    Validate title and body length constraints
    """
    if title and len(title) > 255:
        raise ValidationError("Title must be 255 characters or less")
    
    if body and len(body) > 10000:  # Assuming reasonable limit
        raise ValidationError("Body must be 10000 characters or less")


def get_ad_creative_by_id(ad_creative_id: str):
    """
    Get AdCreative by ID with proper validation
    """
    
    if not validate_numeric_string(ad_creative_id):
        raise ValidationError("ad_creative_id must be a numeric string")
    
    try:
        return AdCreative.objects.select_related(
             'actor'
        ).prefetch_related(
            'ad_labels',
            'object_story_spec_link_data',
            'object_story_spec_photo_data',
            'object_story_spec_video_data',
            'object_story_spec_text_data',
            'object_story_spec_template_data'
        ).get(id=ad_creative_id)
    except AdCreative.DoesNotExist:
        raise ValidationError("AdCreative not found")


def generate_secure_token() -> str:
    """
    Generate a secure token for preview access
    """
    return secrets.token_urlsafe(32)


def create_preview_from_ad_creative(ad_creative_id: str, ad_format: str, **kwargs) -> dict:
    """
    Create a preview from an existing ad creative by ID
    """    
    # Get the ad creative
    ad_creative = get_ad_creative_by_id(ad_creative_id)
    
    # Generate JSON spec from ad creative data
    json_spec = generate_json_spec_from_ad_creative(ad_creative, ad_format, **kwargs)
    
    # Generate secure token
    token = generate_secure_token()
    
    # Create preview record
    preview = AdCreativePreview.objects.create(
        ad_creative=ad_creative,
        token=token,
        json_spec=json_spec,
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    return {
        'token': token,
        'preview_id': preview.id,
        'expires_at': preview.expires_at.isoformat()
    }


def create_preview_from_creative_data(creative_data: dict, ad_format: str, **kwargs) -> dict:
    """
    Create a preview from creative data in request
    """
    
    # Generate JSON spec from creative data
    json_spec = generate_json_spec_from_creative_data(creative_data, ad_format, **kwargs)
    
    # Generate secure token
    token = generate_secure_token()
    
    # Create preview record (without ad_creative_id since it's from request data)
    preview = AdCreativePreview.objects.create(
        ad_creative=None,  # No existing ad creative
        token=token,
        json_spec=json_spec,
        expires_at=timezone.now() + timedelta(hours=24)
    )
    
    return {
        'token': token,
        'preview_id': preview.id,
        'expires_at': preview.expires_at.isoformat()
    }


def generate_json_spec_from_ad_creative(ad_creative, ad_format: str, **kwargs) -> dict:
    """
    Generate JSON spec from an existing AdCreative instance
    """
    json_spec = {
        'ad_format': ad_format,
        'ad_creative_id': ad_creative.id,
        'name': ad_creative.name,
        'body': ad_creative.body,
        'title': ad_creative.title,
        'image_url': ad_creative.image_url,
        'image_hash': ad_creative.image_hash,
        'video_id': ad_creative.video_id,
        'thumbnail_url': ad_creative.thumbnail_url,
        'thumbnail_id': ad_creative.thumbnail_id,
        'link_url': ad_creative.link_url,
        'call_to_action_type': ad_creative.call_to_action_type,
        'call_to_action': ad_creative.call_to_action,
        'object_type': ad_creative.object_type,
        'object_id': ad_creative.object_id,
        'object_url': ad_creative.object_url,
        'instagram_user_id': ad_creative.instagram_user_id,
        'instagram_permalink_url': ad_creative.instagram_permalink_url,
        'source_facebook_post_id': ad_creative.source_facebook_post_id,
        'source_instagram_media_id': ad_creative.source_instagram_media_id,
        'product_set_id': ad_creative.product_set_id,
        'bundle_folder_id': ad_creative.bundle_folder_id,
        'destination_set_id': ad_creative.destination_set_id,
        'place_page_set_id': ad_creative.place_page_set_id,
        'dynamic_ad_voice': ad_creative.dynamic_ad_voice,
        'applink_treatment': ad_creative.applink_treatment,
        'branded_content_sponsor_page_id': ad_creative.branded_content_sponsor_page_id,
        'collaborative_ads_lsb_image_bank_id': ad_creative.collaborative_ads_lsb_image_bank_id,
        'enable_direct_install': ad_creative.enable_direct_install,
        'enable_launch_instant_app': ad_creative.enable_launch_instant_app,
        'user_page_actor_override': ad_creative.user_page_actor_override,
        'page_welcome_message': ad_creative.page_welcome_message,
        'messenger_sponsored_message': ad_creative.messenger_sponsored_message,
        'photo_album_source_object_story_id': ad_creative.photo_album_source_object_story_id,
        'playable_asset_id': ad_creative.playable_asset_id,
        'referral_id': ad_creative.referral_id,
        'threads_user_id': ad_creative.threads_user_id,
        'link_destination_display_url': ad_creative.link_destination_display_url,
        'link_og_id': ad_creative.link_og_id,
        'template_url': ad_creative.template_url,
        'url_tags': ad_creative.url_tags,
        'object_store_url': ad_creative.object_store_url,
        'object_story_id': ad_creative.object_story_id,
        'effective_instagram_media_id': ad_creative.effective_instagram_media_id,
        'effective_object_story_id': ad_creative.effective_object_story_id,
        'authorization_category': ad_creative.authorization_category,
        'effective_authorization_category': ad_creative.effective_authorization_category,
        'categorization_criteria': ad_creative.categorization_criteria,
        'category_media_source': ad_creative.category_media_source,
        'status': ad_creative.status,
        'created_at': ad_creative.id,  # Using ID as created_at placeholder
        'updated_at': ad_creative.id,  # Using ID as updated_at placeholder
        'actor_id': str(ad_creative.actor.id) if ad_creative.actor else None,
    }
    
    # Add object_story_spec data
    object_story_spec = {}
    
    if ad_creative.object_story_spec_instagram_user_id:
        object_story_spec['instagram_user_id'] = ad_creative.object_story_spec_instagram_user_id
    
    if ad_creative.object_story_spec_page_id:
        object_story_spec['page_id'] = ad_creative.object_story_spec_page_id
    
    if ad_creative.object_story_spec_product_data:
        object_story_spec['product_data'] = ad_creative.object_story_spec_product_data
    
    # Add link_data if exists
    if ad_creative.object_story_spec_link_data:
        link_data = ad_creative.object_story_spec_link_data
        object_story_spec['link_data'] = {
            'ad_context': link_data.ad_context,
            'additional_image_index': link_data.additional_image_index,
            'app_link_spec': link_data.app_link_spec,
            'attachment_style': link_data.attachment_style,
            'boosted_product_set_id': link_data.boosted_product_set_id,
            'branded_content_shared_to_sponsor_status': link_data.branded_content_shared_to_sponsor_status,
            'branded_content_sponsor_page_id': link_data.branded_content_sponsor_page_id,
            'branded_content_sponsor_relationship': link_data.branded_content_sponsor_relationship,
            'call_to_action': link_data.call_to_action,
            'caption': link_data.caption,
            'child_attachments': link_data.child_attachments,
            'collection_thumbnails': link_data.collection_thumbnails,
            'customization_rules_spec': link_data.customization_rules_spec,
            'description': link_data.description,
            'event_id': link_data.event_id,
            'force_single_link': link_data.force_single_link,
            'format_option': link_data.format_option,
            'image_crops': link_data.image_crops,
            'image_hash': link_data.image_hash,
            'image_layer_specs': link_data.image_layer_specs,
            'image_overlay_spec': link_data.image_overlay_spec,
            'link': link_data.link,
            'message': link_data.message,
            'multi_share_end_card': link_data.multi_share_end_card,
            'multi_share_optimized': link_data.multi_share_optimized,
            'name': link_data.name,
            'offer_id': link_data.offer_id,
            'page_welcome_message': link_data.page_welcome_message,
            'picture': link_data.picture,
            'post_click_configuration': link_data.post_click_configuration,
            'preferred_image_tags': link_data.preferred_image_tags,
            'preferred_video_tags': link_data.preferred_video_tags,
            'retailer_item_ids': link_data.retailer_item_ids,
            'show_multiple_images': link_data.show_multiple_images,
            'sponsorship_info': link_data.sponsorship_info,
            'use_flexible_image_aspect_ratio': link_data.use_flexible_image_aspect_ratio
        }
    
    # Add photo_data if exists (now ManyToMany - serialize as list)
    photo_data_queryset = ad_creative.object_story_spec_photo_data.all()
    if photo_data_queryset.exists():
        object_story_spec['photo_data'] = [
            {
                'branded_content_shared_to_sponsor_status': photo.branded_content_shared_to_sponsor_status,
                'branded_content_sponsor_page_id': photo.branded_content_sponsor_page_id,
                'branded_content_sponser_relationship': photo.branded_content_sponser_relationship,
                'caption': photo.caption,
                'image_hash': photo.image_hash,
                'page_welcome_message': photo.page_welcome_message,
                'url': photo.url
            }
            for photo in photo_data_queryset
        ]
    
    # Add video_data if exists (now ManyToMany - serialize as list)
    video_data_queryset = ad_creative.object_story_spec_video_data.all()
    if video_data_queryset.exists():
        object_story_spec['video_data'] = [
            {
                'additional_image_index': video.additional_image_index,
                'branded_content_shared_to_sponsor_status': video.branded_content_shared_to_sponsor_status,
                'branded_content_sponsor_page_id': video.branded_content_sponsor_page_id,
                'branded_content_sponser_relationship': video.branded_content_sponser_relationship,
                'call_to_action': video.call_to_action,
                'caption_ids': video.caption_ids,
                'collection_thumbnails': video.collection_thumbnails,
                'customization_rules_spec': video.customization_rules_spec,
                'image_hash': video.image_hash,
                'image_url': video.image_url,
                'link_description': video.link_description,
                'message': video.message,
                'offer_id': video.offer_id,
                'page_welcome_message': video.page_welcome_message,
                'post_click_configuration': video.post_click_configuration,
                'retailer_item_ids': video.retailer_item_ids,
                'targeting': video.targeting,
                'title': video.title,
                'video_id': video.video_id
            }
            for video in video_data_queryset
        ]
    
    # Add text_data if exists
    if ad_creative.object_story_spec_text_data:
        text_data = ad_creative.object_story_spec_text_data
        object_story_spec['text_data'] = {
            'message': text_data.message
        }
    
    # Add template_data if exists
    if ad_creative.object_story_spec_template_data:
        template_data = ad_creative.object_story_spec_template_data
        object_story_spec['template_data'] = {
            'ad_context': template_data.ad_context,
            'additional_image_index': template_data.additional_image_index,
            'app_link_spec': template_data.app_link_spec,
            'attachment_style': template_data.attachment_style,
            'boosted_product_set_id': template_data.boosted_product_set_id,
            'branded_content_shared_to_sponsor_status': template_data.branded_content_shared_to_sponsor_status,
            'branded_content_sponsor_page_id': template_data.branded_content_sponsor_page_id,
            'branded_content_sponsor_relationship': template_data.branded_content_sponsor_relationship,
            'call_to_action': template_data.call_to_action,
            'caption': template_data.caption,
            'child_attachments': template_data.child_attachments,
            'collection_thumbnails': template_data.collection_thumbnails,
            'customization_rules_spec': template_data.customization_rules_spec,
            'description': template_data.description,
            'event_id': template_data.event_id,
            'force_single_link': template_data.force_single_link,
            'format_option': template_data.format_option,
            'image_crops': template_data.image_crops,
            'image_hash': template_data.image_hash,
            'image_layer_specs': template_data.image_layer_specs,
            'image_overlay_spec': template_data.image_overlay_spec,
            'link': template_data.link,
            'message': template_data.message,
            'multi_share_end_card': template_data.multi_share_end_card,
            'multi_share_optimized': template_data.multi_share_optimized,
            'name': template_data.name,
            'offer_id': template_data.offer_id,
            'page_welcome_message': template_data.page_welcome_message,
            'picture': template_data.picture,
            'post_click_configuration': template_data.post_click_configuration,
            'preferred_image_tags': template_data.preferred_image_tags,
            'preferred_video_tags': template_data.preferred_video_tags,
            'retailer_item_ids': template_data.retailer_item_ids,
            'show_multiple_images': template_data.show_multiple_images,
            'sponsorship_info': template_data.sponsorship_info,
            'use_flexible_image_aspect_ratio': template_data.use_flexible_image_aspect_ratio
        }
    
    if object_story_spec:
        json_spec['object_story_spec'] = object_story_spec
    
    # Add additional parameters from kwargs
    for key, value in kwargs.items():
        if value is not None:
            json_spec[key] = value
    
    return json_spec


def generate_json_spec_from_creative_data(creative_data: dict, ad_format: str, **kwargs) -> dict:
    """
    Generate JSON spec from creative data in request
    """
    json_spec = {
        'ad_format': ad_format,
        'creative_data': creative_data
    }
    
    # Add additional parameters from kwargs
    for key, value in kwargs.items():
        if value is not None:
            json_spec[key] = value
    
    return json_spec


def get_preview_by_token(token: str) -> dict:
    """
    Get preview JSON spec by token
    """
    
    try:
        preview = AdCreativePreview.objects.get(token=token)
        
        # Check if expired
        if preview.expires_at and preview.expires_at < timezone.now():
            # Delete expired preview record
            preview.delete()
            raise ValidationError("Preview token has expired")
        
        return preview.json_spec
    except AdCreativePreview.DoesNotExist:
        raise ValidationError("Preview token not found")
