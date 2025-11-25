from rest_framework import serializers
from django.db.models import Q
from django.utils import timezone
import re
from .models import (
    Campaign,
    CampaignRecipients,
    CampaignSettings,
    CampaignVariateSettings,
    CampaignTracking,
    CampaignRSSOptions,
    CampaignABSplitOptions,
    CampaignSocialCard,
    CampaignEcommerceSummary,
    CampaignReportSummary,
    CampaignDeliveryStatus,
    CampaignResendShortcutEligibility,
    CampaignResendShortcutUsage,
    CampaignComment,
    Template,
    TemplateDefaultContent,
)

# ---------------------------
# Template Serializers
# ---------------------------
class TemplateDefaultContentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateDefaultContent
        fields = ['sections', 'links']


class TemplateSerializer(serializers.ModelSerializer):
    """Read-only serializer for Template (used in nested contexts)"""
    default_content = TemplateDefaultContentSerializer(read_only=True)

    class Meta:
        model = Template
        fields = '__all__'


class TemplateCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating Template with default_content"""
    default_content = TemplateDefaultContentSerializer(required=False)

    class Meta:
        model = Template
        fields = '__all__'
        read_only_fields = ['id', 'date_created', 'date_edited']

    def create(self, validated_data):
        """Create Template with default_content"""
        default_content_data = validated_data.pop('default_content', None)
        
        # Set user if not provided
        if 'user' not in validated_data:
            request = self.context.get('request')
            if request and request.user and request.user.is_authenticated:
                validated_data['user'] = request.user
        
        # Set default values
        validated_data.setdefault('type', 'custom')
        validated_data.setdefault('content_type', 'template')
        validated_data.setdefault('active', True)
        validated_data.setdefault('date_created', timezone.now())
        validated_data.setdefault('date_edited', timezone.now())
        
        # Extract thumbnail if provided
        thumbnail = validated_data.pop('thumbnail', None)
        
        # Create template
        template = Template.objects.create(**validated_data)
        
        # Set thumbnail if provided
        if thumbnail is not None:
            template.thumbnail = thumbnail
            template.save(update_fields=['thumbnail'])
        
        # Create default content if provided
        if default_content_data:
            TemplateDefaultContent.objects.create(
                template=template,
                **default_content_data
            )
        
        return template

    def update(self, instance, validated_data):
        """Update Template and default_content"""
        default_content_data = validated_data.pop('default_content', None)
        
        # Extract thumbnail if provided (handle both None and empty string)
        # Use pop with a sentinel value to detect if thumbnail was explicitly provided
        thumbnail_sentinel = object()
        thumbnail = validated_data.pop('thumbnail', thumbnail_sentinel)
        
        # Track which fields need to be updated
        fields_to_update = set()
        
        # Update template fields (including name)
        for attr, value in validated_data.items():
            old_value = getattr(instance, attr, None)
            setattr(instance, attr, value)
            # Only track if value actually changed
            if old_value != value:
                fields_to_update.add(attr)
        
        # Update thumbnail if explicitly provided (including None to clear it)
        if thumbnail is not thumbnail_sentinel:
            old_thumbnail = instance.thumbnail
            instance.thumbnail = thumbnail
            if old_thumbnail != thumbnail:
                fields_to_update.add('thumbnail')
        
        # Always update date_edited
        instance.date_edited = timezone.now()
        fields_to_update.add('date_edited')
        
        # Save with update_fields to ensure all changed fields are persisted
        if fields_to_update:
            instance.save(update_fields=list(fields_to_update))
        else:
            instance.save()
        
        # Update default content if provided
        if default_content_data is not None:
            TemplateDefaultContent.objects.update_or_create(
                template=instance,
                defaults={
                    'sections': default_content_data.get('sections', {}),
                    'links': default_content_data.get('links'),
                },
            )
        
        return instance


# ---------------------------
# Campaign Settings Serializer
# ---------------------------
class CampaignSettingsSerializer(serializers.ModelSerializer):
    """Serializer for CampaignSettings - only handles settings, not template creation/update"""
    template = TemplateSerializer(read_only=True)
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=Template.objects.all(),
        source='template',
        write_only=True,
        required=False
    )

    class Meta:
        model = CampaignSettings
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        template_field = self.fields.get('template_id')
        request = self.context.get('request') if hasattr(self, 'context') else None
        if template_field and request and request.user and request.user.is_authenticated:
            template_field.queryset = Template.objects.filter(
                Q(user=request.user) | Q(user__isnull=True)
            )

    def validate(self, data):
        """check if there are any unreplaced Mailchimp placeholders in subject_line / preview_text."""
        placeholder_pattern = r"\*\|[A-Z_]+\|\*"
        subject = data.get("subject_line") or ""
        preview = data.get("preview_text") or ""
        if re.search(placeholder_pattern, subject) or re.search(placeholder_pattern, preview):
            raise serializers.ValidationError({
                "placeholders": "Unreplaced placeholders found in subject or preview text."
            })
        return data


# ---------------------------
# Campaign subtable serializers
# ---------------------------
class CampaignRecipientsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRecipients
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignVariateSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignVariateSettings
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignTracking
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignRSSOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRSSOptions
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignABSplitOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignABSplitOptions
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignSocialCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignSocialCard
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignEcommerceSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignEcommerceSummary
        fields = '__all__'


class CampaignReportSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignReportSummary
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignDeliveryStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignDeliveryStatus
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignResendShortcutEligibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignResendShortcutEligibility
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


class CampaignResendShortcutUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignResendShortcutUsage
        fields = '__all__'
        extra_kwargs = {
            'campaign': {'write_only': True, 'required': False}
        }


# ---------------------------
# Campaign Serializer
# ---------------------------
class CampaignSerializer(serializers.ModelSerializer):
    recipients = CampaignRecipientsSerializer(required=False)
    settings = CampaignSettingsSerializer()
    variate_settings = CampaignVariateSettingsSerializer(required=False)
    tracking = CampaignTrackingSerializer(required=False)
    rss_opts = CampaignRSSOptionsSerializer(required=False)
    ab_split_opts = CampaignABSplitOptionsSerializer(required=False)
    social_card = CampaignSocialCardSerializer(required=False)
    report_summary = CampaignReportSummarySerializer(required=False)
    delivery_status = CampaignDeliveryStatusSerializer(required=False)
    resend_shortcut_eligibility = CampaignResendShortcutEligibilitySerializer(required=False)
    resend_shortcut_usage = CampaignResendShortcutUsageSerializer(required=False)

    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'user': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        settings_data = validated_data.pop('settings')
        recipients_data = validated_data.pop('recipients', None)
        variate_settings_data = validated_data.pop('variate_settings', None)
        tracking_data = validated_data.pop('tracking', None)
        rss_opts_data = validated_data.pop('rss_opts', None)
        ab_split_opts_data = validated_data.pop('ab_split_opts', None)
        social_card_data = validated_data.pop('social_card', None)
        report_summary_data = validated_data.pop('report_summary', None)
        delivery_status_data = validated_data.pop('delivery_status', None)
        resend_shortcut_eligibility_data = validated_data.pop('resend_shortcut_eligibility', None)
        resend_shortcut_usage_data = validated_data.pop('resend_shortcut_usage', None)

        # Extract template_id before validation (it might be converted to template object)
        source_template_id = None
        if 'template_id' in settings_data:
            source_template_id = settings_data['template_id']
            # If it's already a Template object, get its ID
            if hasattr(source_template_id, 'id'):
                source_template_id = source_template_id.id
        elif 'template' in settings_data:
            # If template_id was converted to template object
            template_obj = settings_data.get('template')
            if template_obj:
                source_template_id = template_obj.id if hasattr(template_obj, 'id') else None

        if not source_template_id:
            raise serializers.ValidationError(
                {'settings': {'template_id': 'template_id is required to create a campaign'}}
            )

        # Remove template_id/template from settings_data temporarily
        settings_data.pop('template_id', None)
        settings_data.pop('template', None)

        campaign = Campaign.objects.create(**validated_data)

        # Clone template
        try:
            source_template = Template.objects.get(id=source_template_id)
            # Build template name from campaign
            template_name = self._build_campaign_template_name(campaign, settings_data)
            # Clone the template
            cloned_template = self._clone_template_for_campaign(
                source_template, template_name, campaign
            )
            settings_data['template_id'] = cloned_template.id
        except Template.DoesNotExist:
            raise serializers.ValidationError(
                {'settings': {'template_id': f'Template with id {source_template_id} does not exist'}}
            )

        # Create settings (required)
        settings_data['campaign'] = campaign
        CampaignSettingsSerializer(context=self.context).create(settings_data)

        # Create optional related objects
        if recipients_data:
            CampaignRecipients.objects.create(campaign=campaign, **recipients_data)
        if variate_settings_data:
            CampaignVariateSettings.objects.create(campaign=campaign, **variate_settings_data)
        if tracking_data:
            CampaignTracking.objects.create(campaign=campaign, **tracking_data)
        if rss_opts_data:
            CampaignRSSOptions.objects.create(campaign=campaign, **rss_opts_data)
        if ab_split_opts_data:
            CampaignABSplitOptions.objects.create(campaign=campaign, **ab_split_opts_data)
        if social_card_data:
            CampaignSocialCard.objects.create(campaign=campaign, **social_card_data)
        if report_summary_data:
            CampaignReportSummary.objects.create(campaign=campaign, **report_summary_data)
        if delivery_status_data:
            CampaignDeliveryStatus.objects.create(campaign=campaign, **delivery_status_data)
        if resend_shortcut_eligibility_data:
            CampaignResendShortcutEligibility.objects.create(campaign=campaign, **resend_shortcut_eligibility_data)
        if resend_shortcut_usage_data:
            CampaignResendShortcutUsage.objects.create(campaign=campaign, **resend_shortcut_usage_data)

        return campaign

    def update(self, instance, validated_data):
        settings_data = validated_data.pop('settings', None)
        recipients_data = validated_data.pop('recipients', None)
        variate_settings_data = validated_data.pop('variate_settings', None)
        tracking_data = validated_data.pop('tracking', None)
        rss_opts_data = validated_data.pop('rss_opts', None)
        ab_split_opts_data = validated_data.pop('ab_split_opts', None)
        social_card_data = validated_data.pop('social_card', None)
        report_summary_data = validated_data.pop('report_summary', None)
        delivery_status_data = validated_data.pop('delivery_status', None)
        resend_shortcut_eligibility_data = validated_data.pop('resend_shortcut_eligibility', None)
        resend_shortcut_usage_data = validated_data.pop('resend_shortcut_usage', None)

        # Update Campaign fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update settings (required)
        if settings_data:
            settings_serializer = CampaignSettingsSerializer(
                instance.settings,
                data=settings_data,
                partial=True,
                context=self.context,
            )
            settings_serializer.is_valid(raise_exception=True)
            settings_serializer.save()

        # Update optional related objects
        self._update_related_object(instance, 'recipients', CampaignRecipients, recipients_data)
        self._update_related_object(instance, 'variate_settings', CampaignVariateSettings, variate_settings_data)
        self._update_related_object(instance, 'tracking', CampaignTracking, tracking_data)
        self._update_related_object(instance, 'rss_opts', CampaignRSSOptions, rss_opts_data)
        self._update_related_object(instance, 'ab_split_opts', CampaignABSplitOptions, ab_split_opts_data)
        self._update_related_object(instance, 'social_card', CampaignSocialCard, social_card_data)
        self._update_related_object(instance, 'report_summary', CampaignReportSummary, report_summary_data)
        self._update_related_object(instance, 'delivery_status', CampaignDeliveryStatus, delivery_status_data)
        self._update_related_object(instance, 'resend_shortcut_eligibility', CampaignResendShortcutEligibility, resend_shortcut_eligibility_data)
        self._update_related_object(instance, 'resend_shortcut_usage', CampaignResendShortcutUsage, resend_shortcut_usage_data)

        return instance

    def _update_related_object(self, instance, attr_name, model_class, data):
        """Helper method to update or create related objects"""
        if data is not None:
            if hasattr(instance, attr_name):
                related_obj = getattr(instance, attr_name)
                for attr, value in data.items():
                    setattr(related_obj, attr, value)
                related_obj.save()
            else:
                model_class.objects.create(campaign=instance, **data)

    def _clone_template_for_campaign(self, source_template, template_name, campaign):
        """Clone an existing template for a campaign"""
        new_template = Template.objects.create(
            user=campaign.user if campaign and campaign.user else source_template.user,
            type=source_template.type,
            name=template_name or source_template.name,
            drag_and_drop=source_template.drag_and_drop,
            responsive=source_template.responsive,
            category='custom',
            date_created=timezone.now(),
            date_edited=timezone.now(),
            created_by=source_template.created_by,
            edited_by=source_template.edited_by,
            active=True,
            folder_id=source_template.folder_id,
            thumbnail=source_template.thumbnail,
            share_url=source_template.share_url,
            content_type=source_template.content_type,
            links=source_template.links,
        )

        default_content = getattr(source_template, 'default_content', None)
        if default_content:
            TemplateDefaultContent.objects.create(
                template=new_template,
                sections=default_content.sections,
                links=default_content.links,
            )

        return new_template

    def _build_campaign_template_name(self, campaign, settings_data):
        """Build template name from campaign settings"""
        candidate_fields = [
            settings_data.get('title'),
            settings_data.get('subject_line'),
        ]
        for value in candidate_fields:
            if value:
                return value
        return f"Campaign {campaign.id}"


class CampaignCommentSerializer(serializers.ModelSerializer):
    author_id = serializers.IntegerField(source="author.id", read_only=True)
    author_name = serializers.SerializerMethodField()
    resolved_by_id = serializers.IntegerField(
        source="resolved_by.id", read_only=True, allow_null=True
    )
    resolved_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CampaignComment
        fields = [
            "id",
            "campaign",
            "author_id",
            "author_name",
            "body",
            "status",
            "target_block_id",
            "resolved_by_id",
            "resolved_by_name",
            "resolved_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "campaign",
            "author_id",
            "author_name",
            "resolved_by_id",
            "resolved_by_name",
            "resolved_at",
            "created_at",
            "updated_at",
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() or obj.author.get_username()

    def get_resolved_by_name(self, obj):
        if not obj.resolved_by:
            return None
        return obj.resolved_by.get_full_name() or obj.resolved_by.get_username()
