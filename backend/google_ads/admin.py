from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Ad, CustomerAccount, FinalAppUrl, CustomParameter, UrlCollection,
    AdImageAsset, AdTextAsset, AdVideoAsset,
    ImageAdInfo, VideoAdInfo,
    VideoResponsiveAdInfo, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo,
    VideoTrueViewInStreamAdInfo, VideoBumperInStreamAdInfo, VideoOutstreamAdInfo,
    VideoNonSkippableInStreamAdInfo, InFeedVideoAdInfo
)


@admin.register(CustomerAccount)
class CustomerAccountAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_id', 'descriptive_name', 'status', 'created_by']
    list_filter = ['status']
    search_fields = ['customer_id', 'descriptive_name']
    ordering = ['-id']


@admin.register(Ad)
class AdAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'name', 'type', 'status', 'customer_account', 'created_by', 'created_at'
    ]
    list_filter = ['type', 'status', 'customer_account', 'created_at']
    search_fields = ['name', 'resource_name', 'customer_account__customer_id', 'customer_account__descriptive_name']
    readonly_fields = ['google_ads_id', 'added_by_google_ads', 'system_managed_resource_source', 'created_at', 'updated_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'type', 'status', 'display_url')
        }),
        ('Google Ads Information', {
            'fields': ('resource_name', 'google_ads_id', 'added_by_google_ads', 'system_managed_resource_source'),
            'classes': ('collapse',)
        }),
        ('Related Information', {
            'fields': ('customer_account', 'created_by')
        }),
        ('URL Settings', {
            'fields': ('final_urls', 'final_mobile_urls', 'tracking_url_template', 'final_url_suffix'),
            'classes': ('collapse',)
        }),
        ('Device Preference', {
            'fields': ('device_preference',),
            'classes': ('collapse',)
        }),
        ('Media Assets', {
            'fields': ('media_assets',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        })
    )
    
    filter_horizontal = ['media_assets']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'customer_account', 'created_by'
        ).prefetch_related('media_assets')


@admin.register(AdImageAsset)
class AdImageAssetAdmin(admin.ModelAdmin):
    list_display = ['id', 'asset']
    search_fields = ['asset']
    ordering = ['asset']


@admin.register(AdTextAsset)
class AdTextAssetAdmin(admin.ModelAdmin):
    list_display = ['id', 'text_preview']
    search_fields = ['text']
    ordering = ['text']
    
    def text_preview(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_preview.short_description = 'Text Preview'


@admin.register(AdVideoAsset)
class AdVideoAssetAdmin(admin.ModelAdmin):
    list_display = ['id', 'asset']
    search_fields = ['asset']
    ordering = ['asset']


class FinalAppUrlInline(admin.TabularInline):
    model = FinalAppUrl
    extra = 0
    fields = ['os_type', 'url']


class CustomParameterInline(admin.TabularInline):
    model = CustomParameter
    extra = 0
    fields = ['key', 'value']


class UrlCollectionInline(admin.TabularInline):
    model = UrlCollection
    extra = 0
    fields = ['url_collection_id', 'final_urls', 'final_mobile_urls', 'tracking_url_template']


@admin.register(ImageAdInfo)
class ImageAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'mime_type', 'pixel_width', 'pixel_height']
    list_filter = ['mime_type']
    search_fields = ['name', 'image_url']


@admin.register(VideoAdInfo)
class VideoAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'video_asset', 'format_type']
    search_fields = ['video_asset__asset']
    
    def format_type(self, obj):
        if obj.format_in_stream:
            return 'In Stream'
        elif obj.format_bumper:
            return 'Bumper'
        elif obj.format_out_stream:
            return 'Out Stream'
        elif obj.format_non_skippable:
            return 'Non Skippable'
        elif obj.format_in_feed:
            return 'In Feed'
        return 'No Format'
    format_type.short_description = 'Format Type'


@admin.register(VideoResponsiveAdInfo)
class VideoResponsiveAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'breadcrumb1', 'breadcrumb2']
    search_fields = ['breadcrumb1', 'breadcrumb2']
    filter_horizontal = ['headlines', 'long_headlines', 'descriptions', 'call_to_actions', 'videos', 'companion_banners']


@admin.register(ResponsiveSearchAdInfo)
class ResponsiveSearchAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'path1', 'path2']
    search_fields = ['path1', 'path2']
    filter_horizontal = ['headlines', 'descriptions']


@admin.register(ResponsiveDisplayAdInfo)
class ResponsiveDisplayAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'business_name', 'main_color', 'accent_color', 'allow_flexible_color']
    search_fields = ['business_name', 'call_to_action_text', 'price_prefix', 'promo_text']
    list_filter = ['allow_flexible_color', 'enable_asset_enhancements', 'enable_autogen_video']
    filter_horizontal = [
        'marketing_images', 'square_marketing_images', 'logo_images', 'square_logo_images',
        'headlines', 'descriptions', 'youtube_videos'
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('business_name', 'long_headline')
        }),
        ('Color Settings', {
            'fields': ('main_color', 'accent_color', 'allow_flexible_color')
        }),
        ('Call to Action', {
            'fields': ('call_to_action_text', 'price_prefix', 'promo_text')
        }),
        ('Format Settings', {
            'fields': ('format_setting', 'enable_asset_enhancements', 'enable_autogen_video')
        }),
        ('Media Assets', {
            'fields': ('marketing_images', 'square_marketing_images', 'logo_images', 'square_logo_images', 'youtube_videos'),
            'classes': ('collapse',)
        }),
        ('Text Assets', {
            'fields': ('headlines', 'descriptions'),
            'classes': ('collapse',)
        }),
        ('Other Settings', {
            'fields': ('control_spec',),
            'classes': ('collapse',)
        })
    )


@admin.register(VideoTrueViewInStreamAdInfo)
class VideoTrueViewInStreamAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'action_button_label', 'action_headline']
    search_fields = ['action_button_label', 'action_headline']


@admin.register(VideoBumperInStreamAdInfo)
class VideoBumperInStreamAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'action_button_label', 'action_headline']
    search_fields = ['action_button_label', 'action_headline']


@admin.register(VideoOutstreamAdInfo)
class VideoOutstreamAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'headline_preview', 'description_preview']
    search_fields = ['headline', 'description']
    
    def headline_preview(self, obj):
        return obj.headline[:30] + '...' if len(obj.headline) > 30 else obj.headline
    headline_preview.short_description = 'Headline'
    
    def description_preview(self, obj):
        return obj.description[:30] + '...' if len(obj.description) > 30 else obj.description
    description_preview.short_description = 'Description'


@admin.register(VideoNonSkippableInStreamAdInfo)
class VideoNonSkippableInStreamAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'action_button_label', 'action_headline']
    search_fields = ['action_button_label', 'action_headline']


@admin.register(InFeedVideoAdInfo)
class InFeedVideoAdInfoAdmin(admin.ModelAdmin):
    list_display = ['id', 'headline_preview', 'thumbnail']
    list_filter = ['thumbnail']
    search_fields = ['headline', 'description1', 'description2']
    
    def headline_preview(self, obj):
        return obj.headline[:30] + '...' if len(obj.headline) > 30 else obj.headline
    headline_preview.short_description = 'Headline'


# Add inline editing for Ad model
AdAdmin.inlines = [FinalAppUrlInline, CustomParameterInline, UrlCollectionInline]