from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError

User = get_user_model()

# ========== 账户模型 ==========
class CustomerAccount(models.Model):
    """Google Ads Customer 账户模型 - 对应Customer"""
    
    class CustomerStatus(models.TextChoices):
        ENABLED = 'ENABLED', 'Enabled'
        CANCELED = 'CANCELED', 'Canceled'
        SUSPENDED = 'SUSPENDED', 'Suspended'
        CLOSED = 'CLOSED', 'Closed'
    
    # 基础字段
    customer_id = models.CharField(
        max_length=20, 
        unique=True,
        help_text="Google Ads Customer ID"
    )
    descriptive_name = models.CharField(
        max_length=255,
        help_text="Customer descriptive name"
    )
    status = models.CharField(
        max_length=20, 
        choices=CustomerStatus.choices,
        default=CustomerStatus.ENABLED,
        help_text="Customer status"
    )
    
    # 关联字段
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='google_ads_customer_accounts',
        help_text="创建者"
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.customer_id} - {self.descriptive_name}"

# ========== URL 相关模型 ==========
class FinalAppUrl(models.Model):
    """最终应用URL模型"""
    OS_TYPE_CHOICES = [
        ('UNSPECIFIED', 'Unspecified'),
        ('UNKNOWN', 'Unknown'),
        ('IOS', 'iOS'),
        ('ANDROID', 'Android'),
    ]
    
    ad = models.ForeignKey(
        'Ad', 
        on_delete=models.CASCADE, 
        related_name='final_app_urls',
        help_text="关联的广告"
    )

    os_type = models.CharField(
        max_length=20, 
        choices=OS_TYPE_CHOICES,
        help_text="The operating system targeted by this URL. Required."
    )
    url = models.URLField(
        max_length=2048,
        help_text="The app deep link URL. Required."
    )
    
    class Meta:
        unique_together = ['ad', 'os_type']
    
    def __str__(self):
        return f"{self.get_os_type_display()}: {self.url}"

class CustomParameter(models.Model):
    """URL自定义参数模型"""
    ad = models.ForeignKey(
        'Ad', 
        on_delete=models.CASCADE, 
        related_name='url_custom_parameters',
        help_text="关联的广告"
    )
    key = models.CharField(
        max_length=255,
        help_text="The key matching the parameter tag name."
    )
    value = models.CharField(
        max_length=255,
        help_text="The value to be substituted."
    )
    
    class Meta:
        unique_together = ['ad', 'key']
    
    def __str__(self):
        return f"{self.key}: {self.value}"

class UrlCollection(models.Model):
    """URL集合模型"""
    ad = models.ForeignKey(
        'Ad', 
        on_delete=models.CASCADE, 
        related_name='url_collections',
        help_text="关联的广告"
    )
    url_collection_id = models.CharField(
        max_length=255,
        help_text="Unique identifier for the URL collection"
    )
    final_urls = ArrayField(
        models.URLField(max_length=2048),
        blank=True, default=list,
        help_text="Final URLs"
    )
    final_mobile_urls = ArrayField(
        models.URLField(max_length=2048),
        blank=True, default=list,
        help_text="Final mobile URLs"
    )
    tracking_url_template = models.CharField(
        max_length=2048,
        blank=True,
        help_text="URL template for tracking"
    )
    
    class Meta:
        unique_together = ['ad', 'url_collection_id']
    
    def __str__(self):
        return f"Collection {self.url_collection_id}"
    
    def clean(self):
        """验证URL集合数据"""
        super().clean()
        
        # 验证至少有一个URL字段不为空
        if not self.final_urls and not self.final_mobile_urls:
            raise ValidationError({
                'final_urls': 'At least one of final_urls or final_mobile_urls must be provided'
            })
        
        # 验证URL格式 - 支持Web URL和应用深度链接
        for url in self.final_urls:
            if not self._is_valid_url(url):
                raise ValidationError({
                    'final_urls': f'Invalid URL format: {url}. Expected web URL (http/https) or app deep link (scheme://host_path)'
                })
        
        for url in self.final_mobile_urls:
            if not self._is_valid_url(url):
                raise ValidationError({
                    'final_mobile_urls': f'Invalid URL format: {url}. Expected web URL (http/https) or app deep link (scheme://host_path)'
                })
    
    def _is_valid_url(self, url):
        """验证URL格式 - 支持Web URL和应用深度链接"""
        import re
        
        # Web URL格式: http:// 或 https://
        web_url_pattern = r'^https?://'
        
        # 应用深度链接格式: scheme://host_path
        # 例如: exampleapp://productid_1234, myapp://path/to/content
        deep_link_pattern = r'^[a-zA-Z][a-zA-Z0-9+.-]*://'
        
        return bool(re.match(web_url_pattern, url) or re.match(deep_link_pattern, url))

class AdImageAsset(models.Model):
    """
    用于存储广告中使用的图片资产信息
    """
    asset = models.CharField(
        max_length=255,
        help_text="The Asset resource name of this image"
    )
    
    def __str__(self):
        return f"AdImageAsset: {self.asset}"

class AdTextAsset(models.Model):
    """
    用于存储广告中使用的文本资产信息
    """
    text = models.CharField(
        max_length=255,
        help_text="Asset text"
    )
    
    def __str__(self):
        return f"AdTextAsset: {self.text[:50]}..."

class AdVideoAsset(models.Model):
    """
    用于存储广告中使用的视频资产信息
    """
    asset = models.CharField(
        max_length=255,
        help_text="The Asset resource name of this video"
    )
    
    def __str__(self):
        return f"AdVideoAsset: {self.asset}"

# ========== 枚举类定义 ==========

class AdType(models.TextChoices):
    VIDEO_AD = "VIDEO_AD", "Video ad."
    IMAGE_AD = "IMAGE_AD", "Image ad."
    RESPONSIVE_SEARCH_AD = "RESPONSIVE_SEARCH_AD", "Responsive search ad."
    RESPONSIVE_DISPLAY_AD = "RESPONSIVE_DISPLAY_AD", "Responsive display ad."
    VIDEO_RESPONSIVE_AD = "VIDEO_RESPONSIVE_AD", "Video responsive ad."

class Device(models.TextChoices):
    UNSPECIFIED = "UNSPECIFIED", "Not specified."
    UNKNOWN = "UNKNOWN", "Used for return value only. Represents value unknown in this version."
    MOBILE = "MOBILE", "Mobile devices with full browsers."
    TABLET = "TABLET", "Tablets with full browsers."
    DESKTOP = "DESKTOP", "Computers."
    CONNECTED_TV = "CONNECTED_TV", "Connected TVs."
    OTHER = "OTHER", "Other device types."

class SystemManagedResourceSource(models.TextChoices):
    UNSPECIFIED = "UNSPECIFIED", "Not specified."
    UNKNOWN = "UNKNOWN", "Used for return value only. Represents value unknown in this version."
    AD_VARIATIONS = "AD_VARIATIONS", "Created by ad variations."
    
class MimeType(models.TextChoices):
    IMAGE_JPEG = "IMAGE_JPEG", "JPEG image."
    IMAGE_GIF = "IMAGE_GIF", "GIF image."
    IMAGE_PNG = "IMAGE_PNG", "PNG image."
    FLASH = "FLASH", "Flash."
    TEXT_HTML = "TEXT_HTML", "HTML."
    PDF = "PDF", "PDF."
    MSWORD = "MSWORD", "MS Word."
    MSEXCEL = "MSEXCEL", "MS Excel."
    RTF = "RTF", "RTF."
    AUDIO_WAV = "AUDIO_WAV", "WAV audio."
    AUDIO_MP3 = "AUDIO_MP3", "MP3 audio."
    HTML5_AD_ZIP = "HTML5_AD_ZIP", "HTML5 ZIP."

class VideoThumbnail(models.TextChoices):
    DEFAULT_THUMBNAIL = "DEFAULT_THUMBNAIL", "The default thumbnail. Can be auto-generated or user-uploaded."
    THUMBNAIL_1 = "THUMBNAIL_1", "Thumbnail 1, generated from the video."
    THUMBNAIL_2 = "THUMBNAIL_2", "Thumbnail 2, generated from the video."
    THUMBNAIL_3 = "THUMBNAIL_3", "Thumbnail 3, generated from the video."

class DisplayAdFormatSetting(models.TextChoices):
    ALL_FORMATS = "ALL_FORMATS", "Text, image and native formats."
    NON_NATIVE = "NON_NATIVE", "Text and image formats."
    NATIVE = "NATIVE", "Native format, for example, the format rendering is controlled by the publisher and not by Google."

class AdsStatus(models.TextChoices):
    """广告草稿状态"""
    DRAFT = 'DRAFT', 'Draft'
    PENDING_REVIEW = 'PENDING_REVIEW', 'Pending Review'
    APPROVED = 'APPROVED', 'Approved'
    REJECTED = 'REJECTED', 'Rejected'
    PUBLISHED = 'PUBLISHED', 'Published'

# ========== 广告类型模型 ==========


class ImageAdInfo(models.Model):
    """
    Immutable
    """
    mime_type = models.CharField(max_length=30, choices=MimeType.choices, help_text="The mime type of the image")
    pixel_width = models.BigIntegerField(help_text="Width in pixels of the full size image")
    pixel_height = models.BigIntegerField(help_text="Height in pixels of the full size image")
    image_url = models.CharField(max_length=2048, help_text="URL of the full size image")
    preview_pixel_width = models.BigIntegerField(help_text="Width in pixels of the preview size image")
    preview_pixel_height = models.BigIntegerField(help_text="Height in pixels of the preview size image")
    preview_image_url = models.CharField(max_length=2048, help_text="URL of the preview size image")
    name = models.CharField(max_length=255, help_text="The name of the image")
    
    # ImageAdInfo.image Union field - 只能有一个非空
    image_asset = models.ForeignKey(
        AdImageAsset, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        help_text="The Asset resource name of this image (AdImageAsset.asset) - Union field option 1"
    )
    data = models.BinaryField(null=True, blank=True, help_text="Raw image data as bytes - Union field option 2")
    ad_id_to_copy_image_from = models.BigIntegerField(null=True, blank=True, help_text="An ad ID to copy the image from - Union field option 3")
    
    def __str__(self):
        return f"ImageAd: {self.name or self.image_url[:50]}..."
    
    def clean(self):
        """验证Union Field约束"""
        super().clean()
        union_fields = [self.image_asset, self.data, self.ad_id_to_copy_image_from]
        if sum(1 for field in union_fields if field) > 1:
            raise ValidationError("Only one image source can be set")

# VideoAdInfo的Format子类
class VideoTrueViewInStreamAdInfo(models.Model):
    action_button_label = models.CharField(max_length=255, blank=True, help_text="Label on the CTA button taking the user to the video ad's final URL")
    action_headline = models.CharField(max_length=255, blank=True, help_text="Additional text displayed with the CTA button")
    companion_banner = models.ForeignKey(
        AdImageAsset, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        help_text="The image assets of the companion banner used with the ad"
    )

    def __str__(self):
        return f"VideoTrueViewInStream: {self.action_button_label or 'No label'}"

class VideoBumperInStreamAdInfo(models.Model):
    companion_banner = models.ForeignKey(
        AdImageAsset, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        help_text="The image assets of the companion banner used with the ad"
    )
    action_button_label = models.CharField(max_length=255, blank=True, help_text="Label on the CTA button taking the user to the video ad's final URL")
    action_headline = models.CharField(max_length=255, blank=True, help_text="Additional text displayed with the CTA button")
    
    def __str__(self):
        return f"VideoBumperInStream: {self.action_button_label or 'No label'}"

class VideoOutstreamAdInfo(models.Model):
    headline = models.CharField(max_length=255, help_text="The headline of the ad")
    description = models.CharField(max_length=255, help_text="The description line")
    
    def __str__(self):
        return f"VideoOutstream: {self.headline[:50]}..."

class VideoNonSkippableInStreamAdInfo(models.Model):
    companion_banner = models.ForeignKey(
        AdImageAsset, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        help_text="The image assets of the companion banner used with the ad"
    )
    action_button_label = models.CharField(max_length=255, blank=True, help_text="Label on the CTA button taking the user to the video ad's final URL")
    action_headline = models.CharField(max_length=255, blank=True, help_text="Additional text displayed with the CTA button")
    
    def __str__(self):
        return f"VideoNonSkippableInStream: {self.action_button_label or 'No label'}"

class InFeedVideoAdInfo(models.Model):
    headline = models.CharField(max_length=255, help_text="The headline of the ad")
    description1 = models.CharField(max_length=255, help_text="First text line for the ad")
    description2 = models.CharField(max_length=255, help_text="Second text line for the ad")
    thumbnail = models.CharField(max_length=30, choices=VideoThumbnail.choices, help_text="Video thumbnail image to use")
    
    def __str__(self):
        return f"InFeedVideo: {self.headline[:50]}..."

class VideoAdInfo(models.Model):
    video_asset = models.ForeignKey(
        AdVideoAsset,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text="The Asset resource name of this video (AdVideoAsset.asset)"
    )
    video_asset_info = models.JSONField(null=True, blank=True, help_text="Additional video asset information")
    
    # VideoAdInfo.format Union field - 只能有一个非空
    format_in_stream = models.OneToOneField(
        VideoTrueViewInStreamAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="VideoTrueViewInStreamAdInfo format"
    )
    format_bumper = models.OneToOneField(
        VideoBumperInStreamAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="VideoBumperInStreamAdInfo format"
    )
    format_out_stream = models.OneToOneField(
        VideoOutstreamAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="VideoOutstreamAdInfo format"
    )
    format_non_skippable = models.OneToOneField(
        VideoNonSkippableInStreamAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="VideoNonSkippableInStreamAdInfo format"
    )
    format_in_feed = models.OneToOneField(
        InFeedVideoAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="InFeedVideoAdInfo format"
    )
    
    def __str__(self):
        return f"VideoAd: {self.video_asset or 'No video asset'}"
    
    def clean(self):
        """验证Union Field约束"""
        super().clean()
        format_fields = [
            self.format_in_stream, self.format_bumper, self.format_out_stream,
            self.format_non_skippable, self.format_in_feed,
        ]
        if sum(1 for field in format_fields if field) > 1:
            raise ValidationError("Only one video format can be set")

class VideoResponsiveAdInfo(models.Model):
    """
    注意：虽然使用 ManyToManyField，但业务逻辑上每个字段只支持一个值。
    """
    headlines = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='video_responsive_ad_headlines',
        help_text="Text asset used for the short headline (only one value supported)"
    )
    long_headlines = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='video_responsive_ad_long_headlines',
        help_text="Text asset used for the long headline (only one value supported)"
    )
    descriptions = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='video_responsive_ad_descriptions',
        help_text="Text asset used for the description (only one value supported)"
    )
    call_to_actions = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='video_responsive_ad_call_to_actions',
        help_text="Text asset used for the button (only one value supported)"
    )
    videos = models.ManyToManyField(
        AdVideoAsset, 
        blank=True, 
        related_name='video_responsive_ad_videos',
        help_text="YouTube video asset used for the ad (only one value supported)"
    )
    companion_banners = models.ManyToManyField(
        AdImageAsset, 
        blank=True, 
        related_name='video_responsive_ad_companion_banners',
        help_text="Image asset used for the companion banner (only one value supported)"
    )
    breadcrumb1 = models.CharField(max_length=255, blank=True, help_text="First part of text that appears in the ad with the displayed URL")
    breadcrumb2 = models.CharField(max_length=255, blank=True, help_text="Second part of text that appears in the ad with the displayed URL")
    
    def clean(self):
        """验证每个字段只支持一个值"""
        super().clean()
        single_value_fields = [
            'headlines', 'long_headlines', 'descriptions', 
            'call_to_actions', 'videos', 'companion_banners'
        ]
        
        for field_name in single_value_fields:
            field = getattr(self, field_name)
            if hasattr(field, 'count') and field.count() > 1:
                raise ValidationError({
                    field_name: f'Only one {field_name.replace("_", " ")} is supported for VideoResponsiveAdInfo'
                })
    
    def __str__(self):
        return f"VideoResponsiveAd: {self.breadcrumb1 or 'No breadcrumb'}"

class ResponsiveSearchAdInfo(models.Model):
    headlines = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='responsive_search_ad_headlines',
        help_text="List of text assets for headlines (max 15)"
    )
    descriptions = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='responsive_search_ad_descriptions',
        help_text="List of text assets for descriptions (max 4)"
    )
    path1 = models.CharField(max_length=15, blank=True, help_text="First part of text that can be appended to the URL in the ad")
    path2 = models.CharField(max_length=15, blank=True, help_text="Second part of text that can be appended to the URL in the ad")
    
    def __str__(self):
        return f"ResponsiveSearchAd: {self.path1 or 'No path'}"
    
    def clean(self):
        """验证字段约束"""
        super().clean()
        if self.path2 and not self.path1:
            raise ValidationError("path2 can only be set when path1 is also set")

class ResponsiveDisplayAdInfo(models.Model):
    marketing_images = models.ManyToManyField(
        AdImageAsset, 
        blank=True, 
        related_name='responsive_display_ad_marketing_images',
        help_text="Marketing images to be used in the ad"
    )
    square_marketing_images = models.ManyToManyField(
        AdImageAsset, 
        blank=True, 
        related_name='responsive_display_ad_square_marketing_images',
        help_text="Square marketing images to be used in the ad"
    )
    logo_images = models.ManyToManyField(
        AdImageAsset, 
        blank=True, 
        related_name='responsive_display_ad_logo_images',
        help_text="Logo images to be used in the ad"
    )
    square_logo_images = models.ManyToManyField(
        AdImageAsset, 
        blank=True, 
        related_name='responsive_display_ad_square_logo_images',
        help_text="Square logo images to be used in the ad"
    )
    headlines = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='responsive_display_ad_headlines',
        help_text="Short format headlines for the ad (1-5 items, max 30 chars each)"
    )
    long_headline = models.ForeignKey(
        AdTextAsset, 
        on_delete=models.SET_NULL, 
        null=True, blank=True,
        related_name='responsive_display_ad_long_headlines',
        help_text="A required long format headline (max 90 chars)"
    )
    descriptions = models.ManyToManyField(
        AdTextAsset, 
        blank=True, 
        related_name='responsive_display_ad_descriptions',
        help_text="Descriptive texts for the ad (1-5 items, max 90 chars each)"
    )
    youtube_videos = models.ManyToManyField(
        AdVideoAsset, 
        blank=True, 
        related_name='responsive_display_ad_youtube_videos',
        help_text="Optional YouTube videos for the ad"
    )
    business_name = models.CharField(max_length=25, blank=True, help_text="The advertiser/brand name")
    main_color = models.CharField(max_length=7, blank=True, help_text="The main color of the ad in hexadecimal")
    accent_color = models.CharField(max_length=7, blank=True, help_text="The accent color of the ad in hexadecimal")
    allow_flexible_color = models.BooleanField(default=True, help_text="Advertiser's consent to allow flexible color")
    call_to_action_text = models.CharField(max_length=30, blank=True, help_text="The call-to-action text for the ad")
    price_prefix = models.CharField(max_length=255, blank=True, help_text="Prefix before price")
    promo_text = models.CharField(max_length=255, blank=True, help_text="Promotion text used for dynamic formats")
    format_setting = models.CharField(max_length=20, choices=DisplayAdFormatSetting.choices, blank=True, help_text="Specifies which format the ad will be served in")
    enable_asset_enhancements = models.BooleanField(
        default=False,
        help_text="Enable asset enhancements for the ad"
    )
    enable_autogen_video = models.BooleanField(
        default=False,
        help_text="Enable automatic video generation"
    )
    control_spec = models.JSONField(
        null=True, blank=True, 
        help_text="Other creative control specifications"
    )

    def clean(self):
        """验证颜色字段的约束条件"""
        super().clean()
        
        # 验证颜色字段
        main_color_set = bool(self.main_color and self.main_color.strip())
        accent_color_set = bool(self.accent_color and self.accent_color.strip())
        
        # 验证颜色必须同时设置或同时为空
        if main_color_set != accent_color_set:
            missing_field = 'accent_color' if main_color_set else 'main_color'
            raise ValidationError({
                missing_field: 'Both main_color and accent_color must be set together'
            })
        
        # 验证未设置颜色时 allow_flexible_color 必须为 True
        if not main_color_set and not self.allow_flexible_color:
            raise ValidationError({
                'allow_flexible_color': 'Must be True if colors are not set'
            })
        
        # 验证颜色格式
        for color_field in ['main_color', 'accent_color']:
            color_value = getattr(self, color_field)
            if color_value and color_value.strip():
                self._validate_hex_color(color_value, color_field)
    
    def _validate_hex_color(self, color_value, field_name):
        """验证十六进制颜色格式"""
        import re
        if not re.match(r'^#[0-9A-Fa-f]{6}$', color_value):
            raise ValidationError({
                field_name: f'Invalid hex color format. Expected format: #RRGGBB, got: {color_value}'
            })
    
    def __str__(self):
        return f"ResponsiveDisplayAd: {self.business_name or 'No business name'}"

# ========== 预览和版本管理模型 ==========

class AdPreview(models.Model):
    """广告预览模型 - 存储预览数据和访问令牌"""
    
    token = models.CharField(
        max_length=64,
        unique=True,
        help_text="预览访问令牌"
    )
    
    # 关联字段
    ad = models.ForeignKey(
        'Ad',
        on_delete=models.CASCADE,
        related_name='previews',
        help_text="关联的广告"
    )
    
    device_type = models.CharField(
        max_length=20,
        choices=Device.choices,
        default=Device.DESKTOP,
        help_text="预览设备类型"
    )
    
    preview_data = models.JSONField(
        help_text="结构化预览数据"
    )
    
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_google_ads_previews',
        help_text="创建预览的用户"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['ad', 'device_type']),
        ]
    
    def __str__(self):
        return f"Preview: Ad {self.ad.id} ({self.device_type})"

class Ad(models.Model):
    """
    Resource Name: customers/{customer_id}/ads/{ad_id}
    """
    
    # ========== 基础字段 ==========
    resource_name = models.CharField(
        max_length=255, 
        unique=True,
        help_text="Resource name of the ad. Ad resource names have the form: customers/{customer_id}/ads/{ad_id}"
    )
    google_ads_id = models.BigIntegerField(
        null=True, blank=True,
        help_text="Output only. The ID of the ad."
    )
    name = models.CharField(
        max_length=255, blank=True,
        help_text="Immutable. The name of the ad. This is only used to be able to identify the ad."
    )
    display_url = models.CharField(
        max_length=255, blank=True,
        help_text="The URL that appears in the ad description for some ad formats."
    )
    added_by_google_ads = models.BooleanField(
        default=False,
        help_text="Output only. Indicates if this ad was automatically added by Google Ads and not by a user."
    )
    type = models.CharField(
        max_length=50, 
        choices=AdType.choices,
        blank=True,
        help_text="Output only. The type of ad."
    )
    device_preference = models.CharField(
        max_length=20, 
        choices=Device.choices,
        blank=True,
        help_text="The device preference for the ad."
    )
    system_managed_resource_source = models.CharField(
        max_length=30, 
        choices=SystemManagedResourceSource.choices,
        blank=True,
        help_text="Output only. If this ad is system managed, then this field will indicate the source."
    )
    
    # ========== URL字段 ==========
    final_urls = ArrayField(
        models.CharField(max_length=2048),
        blank=True, default=list,
        help_text="The list of possible final URLs after all cross-domain redirects for the ad."
    )
    final_mobile_urls = ArrayField(
        models.CharField(max_length=2048),
        blank=True, default=list,
        help_text="The list of possible final mobile URLs after all cross-domain redirects for the ad."
    )
    tracking_url_template = models.CharField(
        max_length=2048, blank=True,
        help_text="The URL template for constructing a tracking URL."
    )
    final_url_suffix = models.CharField(
        max_length=2048, blank=True,
        help_text="The suffix to use when constructing a final URL."
    )
    
    # ========== 广告数据（Union Field）==========
    image_ad = models.OneToOneField(
        ImageAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="ImageAdInfo - Immutable"
    )
    video_ad = models.OneToOneField(
        VideoAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="VideoAdInfo"
    )
    video_responsive_ad = models.OneToOneField(
        VideoResponsiveAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="VideoResponsiveAdInfo"
    )
    responsive_search_ad = models.OneToOneField(
        ResponsiveSearchAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="ResponsiveSearchAdInfo"
    )
    responsive_display_ad = models.OneToOneField(
        ResponsiveDisplayAdInfo,
        on_delete=models.CASCADE,
        null=True, blank=True,
        help_text="ResponsiveDisplayAdInfo"
    )
    
    # ========== 状态管理 ==========
    status = models.CharField(
        max_length=20, 
        choices=AdsStatus.choices,
        default=AdsStatus.DRAFT,
        help_text="Ad status for workflow management"
    )
    
    # ========== 关联字段 ==========
    customer_account = models.ForeignKey(
        'CustomerAccount',
        on_delete=models.CASCADE,
        related_name='ads',
        null=True, blank=True,
        help_text="Google Ads Customer Account"
    )
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='created_google_ads_ads',
        help_text="User who created this ad"
    )
    media_assets = models.ManyToManyField(
        'asset.Asset',
        blank=True,
        related_name='google_ads_ads',
        help_text="Media assets used in this ad"
    )
    
    # ========== 时间戳 ==========
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        customer_id = self.customer_account.customer_id if self.customer_account else "No Account"
        return f"Ad: {self.name or self.type} - {customer_id}"
    
    def clean(self):
        """验证模型数据"""
        super().clean()
        
        # 验证resource_name格式: customers/{customer_id}/ads/{ad_id}
        if self.resource_name:
            import re
            pattern = r'^customers/\d+/ads/\d+$'
            if not re.match(pattern, self.resource_name):
                raise ValidationError({
                    'resource_name': 'Resource name must follow format: customers/{customer_id}/ads/{ad_id}'
                })
        
        # 验证Union Field - 只能有一个广告类型非空
        ad_type_fields = [
            self.image_ad, self.video_ad, self.video_responsive_ad,
            self.responsive_search_ad, self.responsive_display_ad,
        ]
        
        non_empty_count = sum(1 for field in ad_type_fields if field)
        
        if non_empty_count != 1:
            error_msg = "Must set exactly one ad type" if non_empty_count == 0 else "Only one ad type can be set"
            raise ValidationError(error_msg)
    
    def save(self, *args, **kwargs):
        """保存前自动验证"""
        self.full_clean()
        super().save(*args, **kwargs)
