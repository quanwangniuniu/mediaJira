from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from core.models import Organization
from .models import Plan, Subscription
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Organization)
def create_default_subscription(sender, instance, created, **kwargs):
    """
    Automatically assign a Free plan subscription to new organizations.
    """
    if created:
        try:
            # 1. Get the Free Plan (seeded in migration 0002)
            try:
                free_plan = Plan.objects.get(name="Free")
            except Plan.DoesNotExist:
                logger.error(f"Free plan not found. Auto-subscription failed for organization '{instance.name}'.")
                return

            # 2. Create a default subscription
            Subscription.objects.create(
                organization=instance,
                plan=free_plan,
                stripe_subscription_id="sub_free_internal", # Dummy ID for internal free plan
                start_date=timezone.now(),
                end_date=timezone.now() + timedelta(days=365*100), # Effectively forever (100 years)
                is_active=True
            )
            
            logger.info(f"Auto-subscribed organization '{instance.name}' (ID: {instance.id}) to Free plan.")

        except Exception as e:
            logger.error(f"Failed to auto-subscribe organization '{instance.name}': {str(e)}")
