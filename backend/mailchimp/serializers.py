from rest_framework import serializers
from .models import (
    Campaign, CampaignRecipients, CampaignSettings, CampaignVariateSettings,
    CampaignTracking, CampaignRSSOptions, CampaignABSplitOptions,
    CampaignSocialCard, CampaignEcommerceSummary, CampaignReportSummary,
    CampaignDeliveryStatus, CampaignResendShortcutEligibility, CampaignResendShortcutUsage,
    Template, TemplateDefaultContent
)

# ---------------------------
# Template Serializer
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
# Campaign Subtables Serializers
# ---------------------------
class CampaignRecipientsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CampaignRecipients
        fields = '__all__'

class CampaignSettingsSerializer(serializers.ModelSerializer):
    template = TemplateSerializer(read_only=True)
    template_id = serializers.PrimaryKeyRelatedField(
        queryset=Template.objects.all(), source='template', write_only=True, required=False
    )
    template_data = serializers.JSONField(write_only=True, required=False)  # 用于创建新template

    class Meta:
        model = CampaignSettings
        fields = '__all__'

    def create(self, validated_data):
        template_data = validated_data.pop('template_data', None)
        if template_data:
            template = Template.objects.create(**template_data['template'])
            TemplateDefaultContent.objects.create(template=template, **template_data['default_content'])
            validated_data['template'] = template
        return super().create(validated_data)

    def update(self, instance, validated_data):
        template_data = validated_data.pop('template_data', None)
        if template_data:
            template = Template.objects.create(**template_data['template'])
            TemplateDefaultContent.objects.create(template=template, **template_data['default_content'])
            validated_data['template'] = template
        return super().update(instance, validated_data)

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

    def create(self, validated_data):
        settings_data = validated_data.pop('settings')
        recipients_data = validated_data.pop('recipients', None)
        campaign = Campaign.objects.create(**validated_data)

        # create subtable settings 
        CampaignSettingsSerializer().create({**settings_data, 'campaign': campaign})
        if recipients_data:
            CampaignRecipients.objects.create(campaign=campaign, **recipients_data)
        return campaign

    def update(self, instance, validated_data):
        settings_data = validated_data.pop('settings', None)
        recipients_data = validated_data.pop('recipients', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # update settings
        if settings_data:
            CampaignSettingsSerializer().update(instance.settings, settings_data)

        # update recipients
        if recipients_data:
            if hasattr(instance, 'recipients'):
                for attr, value in recipients_data.items():
                    setattr(instance.recipients, attr, value)
                instance.recipients.save()
            else:
                CampaignRecipients.objects.create(campaign=instance, **recipients_data)
        return instance
