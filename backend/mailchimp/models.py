from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# ---------------------------
# Campaign 
# ---------------------------
class Campaign(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="campaigns")
    parent_campaign_id = models.CharField(max_length=100, null=True, blank=True)
    type = models.CharField(max_length=50, default="regular")
    create_time = models.DateTimeField(null=True, blank=True)
    archive_url = models.URLField(null=True, blank=True)
    long_archive_url = models.URLField(null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    emails_sent = models.IntegerField(default=0)
    send_time = models.DateTimeField(null=True, blank=True)
    content_type = models.CharField(max_length=50, null=True, blank=True)
    needs_block_refresh = models.BooleanField(default=False)
    resendable = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Campaign {self.id} - {self.status}"


# ---------------------------
# Recipients
# ---------------------------
class CampaignRecipients(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="recipients")
    list_id = models.CharField(max_length=100)
    list_is_active = models.BooleanField(default=True)
    list_name = models.CharField(max_length=200)
    segment_text = models.TextField(null=True, blank=True)
    segment_opts = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Recipients for {self.campaign.id}"


# ---------------------------
# Settings
# ---------------------------
class CampaignSettings(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="settings")
    subject_line = models.CharField(max_length=255, null=True, blank=True)
    preview_text = models.CharField(max_length=255, null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)
    from_name = models.CharField(max_length=255, null=True, blank=True)
    reply_to = models.EmailField(null=True, blank=True)
    use_conversation = models.BooleanField(default=True)
    to_name = models.CharField(max_length=255, null=True, blank=True)
    folder_id = models.CharField(max_length=100, null=True, blank=True)
    authenticate = models.BooleanField(default=True)
    auto_footer = models.BooleanField(default=True)
    inline_css = models.BooleanField(default=True)
    auto_tweet = models.BooleanField(default=True)
    auto_fb_post = models.JSONField(null=True, blank=True)
    fb_comments = models.BooleanField(default=True)
    timewarp = models.BooleanField(default=True)
    template = models.ForeignKey("mailchimp.Template", on_delete=models.SET_NULL, null=True, blank=True)
    drag_and_drop = models.BooleanField(default=False)

    def __str__(self):
        return f"Settings for {self.campaign.id}"


# ---------------------------
# Variate Settings
# ---------------------------
class CampaignVariateSettings(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="variate_settings")
    winning_combination_id = models.CharField(max_length=100, null=True, blank=True)
    winning_campaign_id = models.CharField(max_length=100, null=True, blank=True)
    winner_criteria = models.CharField(max_length=50, null=True, blank=True)
    wait_time = models.IntegerField(default=0)
    test_size = models.IntegerField(default=0)
    subject_lines = models.JSONField(null=True, blank=True)
    send_times = models.JSONField(null=True, blank=True)
    from_names = models.JSONField(null=True, blank=True)
    reply_to_addresses = models.JSONField(null=True, blank=True)
    contents = models.JSONField(null=True, blank=True)
    combinations = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"VariateSettings for {self.campaign.id}"


# ---------------------------
# Tracking
# ---------------------------
class CampaignTracking(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="tracking")
    opens = models.BooleanField(default=True)
    html_clicks = models.BooleanField(default=True)
    text_clicks = models.BooleanField(default=True)
    goal_tracking = models.BooleanField(default=True)
    ecomm360 = models.BooleanField(default=True)
    google_analytics = models.CharField(max_length=255, null=True, blank=True)
    clicktale = models.CharField(max_length=255, null=True, blank=True)
    salesforce = models.JSONField(null=True, blank=True)
    capsule = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Tracking for {self.campaign.id}"


# ---------------------------
# RSS Options
# ---------------------------
class CampaignRSSOptions(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="rss_opts")
    feed_url = models.URLField(null=True, blank=True)
    frequency = models.CharField(max_length=50, null=True, blank=True)
    schedule = models.JSONField(null=True, blank=True)
    last_sent = models.DateTimeField(null=True, blank=True)
    constrain_rss_img = models.BooleanField(default=True)

    def __str__(self):
        return f"RSS Options for {self.campaign.id}"


# ---------------------------
# AB Split Options
# ---------------------------
class CampaignABSplitOptions(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="ab_split_opts")
    split_test = models.CharField(max_length=50, null=True, blank=True)
    pick_winner = models.CharField(max_length=50, null=True, blank=True)
    wait_units = models.CharField(max_length=50, null=True, blank=True)
    wait_time = models.IntegerField(default=0)
    split_size = models.FloatField(default=1)
    from_name_a = models.CharField(max_length=255, null=True, blank=True)
    from_name_b = models.CharField(max_length=255, null=True, blank=True)
    reply_email_a = models.EmailField(null=True, blank=True)
    reply_email_b = models.EmailField(null=True, blank=True)
    subject_a = models.CharField(max_length=255, null=True, blank=True)
    subject_b = models.CharField(max_length=255, null=True, blank=True)
    send_time_a = models.DateTimeField(null=True, blank=True)
    send_time_b = models.DateTimeField(null=True, blank=True)
    send_time_winner = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"AB Split Options for {self.campaign.id}"


# ---------------------------
# Social Card
# ---------------------------
class CampaignSocialCard(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="social_card")
    image_url = models.URLField(null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    title = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return f"Social Card for {self.campaign.id}"


# ---------------------------
# Report Summary
# ---------------------------
class CampaignEcommerceSummary(models.Model):
    total_orders = models.IntegerField(default=0)
    total_spent = models.FloatField(default=0)
    total_revenue = models.FloatField(default=0)


class CampaignReportSummary(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="report_summary")
    opens = models.IntegerField(default=0)
    unique_opens = models.IntegerField(default=0)
    open_rate = models.FloatField(default=0)
    clicks = models.IntegerField(default=0)
    subscriber_clicks = models.IntegerField(default=0)
    click_rate = models.FloatField(default=0)
    ecommerce = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Report Summary for {self.campaign.id}"


# ---------------------------
# Delivery Status
# ---------------------------
class CampaignDeliveryStatus(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="delivery_status")
    enabled = models.BooleanField(default=True)
    can_cancel = models.BooleanField(default=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    emails_sent = models.IntegerField(default=0)
    emails_canceled = models.IntegerField(default=0)

    def __str__(self):
        return f"Delivery Status for {self.campaign.id}"


# ---------------------------
# Resend Shortcut Eligibility
# ---------------------------
class CampaignResendShortcutEligibility(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="resend_shortcut_eligibility")
    to_non_openers = models.JSONField(null=True, blank=True)
    to_new_subscribers = models.JSONField(null=True, blank=True)
    to_non_clickers = models.JSONField(null=True, blank=True)
    to_non_purchasers = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Resend Eligibility for {self.campaign.id}"


# ---------------------------
# Resend Shortcut Usage
# ---------------------------
class CampaignResendShortcutUsage(models.Model):
    campaign = models.OneToOneField(Campaign, on_delete=models.CASCADE, related_name="resend_shortcut_usage")
    shortcut_campaigns = models.JSONField(null=True, blank=True)
    original_campaign = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Resend Shortcut Usage for {self.campaign.id}"


# ---------------------------
# Template
# ---------------------------
class Template(models.Model):
    id = models.AutoField(primary_key=True, unique=True)
    type = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    drag_and_drop = models.BooleanField(default=False)
    responsive = models.BooleanField(default=False)
    category = models.CharField(max_length=100, null=True, blank=True)
    date_created = models.DateTimeField(null=True, blank=True)
    date_edited = models.DateTimeField(null=True, blank=True)
    created_by = models.CharField(max_length=100, null=True, blank=True)
    edited_by = models.CharField(max_length=100, null=True, blank=True)
    active = models.BooleanField(default=True)
    folder_id = models.CharField(max_length=100, null=True, blank=True)
    thumbnail = models.URLField(null=True, blank=True)
    share_url = models.URLField(null=True, blank=True)
    content_type = models.CharField(max_length=50)
    links = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.id})"


# ---------------------------
# Template Default Content
# ---------------------------
class TemplateDefaultContent(models.Model):
    template = models.OneToOneField(
        Template, on_delete=models.CASCADE, related_name="default_content"
    )
    sections = models.JSONField()
    links = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"Default Content for {self.template.name}"
