from rest_framework import serializers
from .models import (
    Campaign, CampaignRecipients, CampaignSettings, CampaignVariateSettings,
    CampaignTracking, CampaignRSSOptions, CampaignABSplitOptions,
    CampaignSocialCard, CampaignEcommerceSummary, CampaignReportSummary,
    CampaignDeliveryStatus, CampaignResendShortcutEligibility, CampaignResendShortcutUsage,
    Template, TemplateDefaultContent
)
import re

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

    def validate(self, data):
        """检查 subject_line / preview_text 中是否有未替换的 Mailchimp 占位符。"""
        placeholder_pattern = r"\*\|[A-Z_]+\|\*"
        subject = data.get("subject_line") or ""
        preview = data.get("preview_text") or ""
        if re.search(placeholder_pattern, subject) or re.search(placeholder_pattern, preview):
            raise serializers.ValidationError({
                "placeholders": "Unreplaced placeholders found in subject or preview text."
            })
        return data

    def create(self, validated_data):
        """创建 settings + 可能的新 template。"""
        template_data = validated_data.pop('template_data', None)
        if template_data:
            template = self._create_template_from_data(template_data)
            validated_data['template'] = template
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """更新 settings，若传入新的 template_data 则新建 Template 并替换。"""
        template_data = validated_data.pop('template_data', None)
        if template_data:
            new_template = self._create_template_from_data(template_data)
            validated_data['template'] = new_template
        return super().update(instance, validated_data)

    def _create_template_from_data(self, template_data):
        """从 JSON 数据创建 Template + DefaultContent"""
        template_info = template_data.get('template', {})
        default_content = template_data.get('default_content', {})

        # Ensure required fields for template
        if not template_info.get('name'):
            template_info['name'] = f"Template {template_info.get('type', 'custom')}"
        if not template_info.get('type'):
            template_info['type'] = 'custom'
        if not template_info.get('content_type'):
            template_info['content_type'] = 'template'

        template = Template.objects.create(**template_info)
        
        # Create default content if provided
        if default_content:
            TemplateDefaultContent.objects.create(
                template=template,
                **default_content
            )
        return template


# ---------------------------
# Campaign subtable serializers
# ---------------------------
class CampaignRecipientsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRecipients
        fields = '__all__'


class CampaignVariateSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignVariateSettings
        fields = '__all__'


class CampaignTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignTracking
        fields = '__all__'


class CampaignRSSOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRSSOptions
        fields = '__all__'


class CampaignABSplitOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignABSplitOptions
        fields = '__all__'


class CampaignSocialCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignSocialCard
        fields = '__all__'


class CampaignEcommerceSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignEcommerceSummary
        fields = '__all__'


class CampaignReportSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignReportSummary
        fields = '__all__'


class CampaignDeliveryStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignDeliveryStatus
        fields = '__all__'


class CampaignResendShortcutEligibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignResendShortcutEligibility
        fields = '__all__'


class CampaignResendShortcutUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignResendShortcutUsage
        fields = '__all__'


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
        CampaignSettingsSerializer().create(settings_data)

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
                partial=True
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
