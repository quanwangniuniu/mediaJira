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
    default_content = TemplateDefaultContentSerializer(read_only=True)

    class Meta:
        model = Template
        fields = '__all__'


# ---------------------------
# Campaign Settings Serializer
# ---------------------------
class CampaignSettingsSerializer(serializers.ModelSerializer):
    template = TemplateSerializer(read_only=True)
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=Template.objects.all(),
        source='template',
        write_only=True,
        required=False
    )
    template_data = serializers.JSONField(write_only=True, required=False)

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

    def create(self, validated_data):
        """create settings + template copy for the campaign"""
        template_data = validated_data.pop('template_data', None)
        source_template = validated_data.pop('template', None)
        campaign = validated_data.get('campaign')
        template_name = self._build_template_name(campaign, validated_data)

        if template_data:
            validated_data['template'] = self._create_template_from_data(
                template_data, template_name, campaign
            )
        elif source_template:
            validated_data['template'] = self._clone_existing_template(
                source_template, template_name, campaign
            )

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """update settings, cloning templates when needed"""
        template_data = validated_data.pop('template_data', None)
        source_template = validated_data.pop('template', None)
        campaign = instance.campaign
        template_name = self._build_template_name(
            campaign, validated_data, current_settings=instance
        )

        if template_data:
            if instance.template:
                self._update_template_from_data(
                    instance.template, template_data, template_name
                )
                validated_data['template'] = instance.template
            else:
                validated_data['template'] = self._create_template_from_data(
                    template_data, template_name, campaign
                )
        elif source_template:
            validated_data['template'] = self._clone_existing_template(
                source_template, template_name, campaign
            )

        return super().update(instance, validated_data)

    def _create_template_from_data(self, template_data, template_name=None, campaign=None):
        """create Template + DefaultContent from JSON data"""
        template_info = template_data.get('template', {})
        default_content = template_data.get('default_content', {})

        # Ensure required fields for template
        if not template_info.get('name'):
            template_info['name'] = f"Template {template_info.get('type', 'custom')}"
        if not template_info.get('type'):
            template_info['type'] = 'custom'
        if not template_info.get('content_type'):
            template_info['content_type'] = 'template'
        if not template_info.get('category'):
            template_info['category'] = 'custom'

        request = self.context.get('request') if hasattr(self, 'context') else None
        if campaign and campaign.user:
            template_info['user'] = campaign.user
        if request and request.user and request.user.is_authenticated:
            template_info.setdefault('user', request.user)
        template_info.setdefault('active', True)
        if template_name:
            template_info['name'] = template_name

        template = Template.objects.create(**template_info)
        
        # Create default content if provided
        if default_content:
            TemplateDefaultContent.objects.create(
                template=template,
                **default_content
            )
        return template

    def _clone_existing_template(self, template, template_name, campaign=None):
        """Clone an existing template (and default content) for the campaign."""
        new_template = Template.objects.create(
            user=(campaign.user if campaign and campaign.user else template.user),
            type=template.type,
            name=template_name or template.name,
            drag_and_drop=template.drag_and_drop,
            responsive=template.responsive,
            category='custom',
            date_created=timezone.now(),
            date_edited=timezone.now(),
            created_by=template.created_by,
            edited_by=template.edited_by,
            active=True,
            folder_id=template.folder_id,
            thumbnail=template.thumbnail,
            share_url=template.share_url,
            content_type=template.content_type,
            links=template.links,
        )

        default_content = getattr(template, 'default_content', None)
        if default_content:
            TemplateDefaultContent.objects.create(
                template=new_template,
                sections=default_content.sections,
                links=default_content.links,
            )

        return new_template

    def _build_template_name(self, campaign, validated_data, current_settings=None):
        """Determine the template name that should mirror the campaign name."""
        candidate_fields = [
            validated_data.get('title'),
            getattr(current_settings, 'title', None) if current_settings else None,
            validated_data.get('subject_line'),
            getattr(current_settings, 'subject_line', None) if current_settings else None,
        ]

        for value in candidate_fields:
            if value:
                return value

        if campaign:
            return f"Campaign {campaign.id}"
        return "Campaign Template"

    def _update_template_from_data(self, template, template_data, template_name=None):
        """Mutate an existing template/default content in place."""
        template_info = template_data.get('template', {})
        default_content = template_data.get('default_content', {})

        updated_name = template_name or template_info.get('name') or template.name
        template.name = updated_name
        if 'type' in template_info:
            template.type = template_info['type'] or template.type
        if 'content_type' in template_info:
            template.content_type = template_info['content_type'] or template.content_type
        if 'category' in template_info:
            template.category = template_info['category'] or 'custom'
        elif not template.category:
            template.category = 'custom'
        template.active = True
        template.save()

        if default_content:
            TemplateDefaultContent.objects.update_or_create(
                template=template,
                defaults={
                    'sections': default_content.get('sections', {}),
                    'links': default_content.get('links'),
                },
            )


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

        campaign = Campaign.objects.create(**validated_data)

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
