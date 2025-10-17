from django.db import models

class Plan(models.Model):
    name = models.CharField(max_length=255, null=False, blank=False)
    max_team_members = models.IntegerField(null=False, blank=False)
    max_previews_per_day = models.IntegerField(null=False, blank=False)
    max_tasks_per_day = models.IntegerField(null=False, blank=False)
    stripe_price_id = models.CharField(max_length=255, null=True, blank=False)

    def __str__(self):
        return self.name

class Subscription(models.Model):
    organization = models.ForeignKey('core.Organization', on_delete=models.CASCADE, null=False, blank=False)
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, null=False, blank=False)
    stripe_customer_id = models.CharField(max_length=255, null=False, blank=False)
    stripe_subscription_id = models.CharField(max_length=255, null=False, blank=False)
    start_date = models.DateTimeField(null=False, blank=False)
    end_date = models.DateTimeField(null=False, blank=False)
    is_active = models.BooleanField(default=True)

class UsageDaily(models.Model):
    user = models.ForeignKey('core.CustomUser', on_delete=models.CASCADE, null=False, blank=False)
    date = models.DateField(null=False, blank=False)
    previews_used = models.IntegerField(default=0, null=False, blank=False)
    tasks_used = models.IntegerField(default=0, null=False, blank=False)
