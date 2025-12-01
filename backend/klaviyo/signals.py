from django.db.models.signals import pre_save
from django.dispatch import receiver

from .models import EmailDraft
from . import services


@receiver(pre_save, sender=EmailDraft)
def email_draft_status_change_trigger(sender, instance: EmailDraft, **kwargs):
    """
    Signal: fires BEFORE an EmailDraft is saved.

    Purpose:
        Detect when the 'status' field changes and becomes "ready".
        If that happens, delegate to the service layer to trigger workflows.

    We explicitly:
        - Ignore new objects (no previous state available)
        - Compare previous.status with instance.status
        - Only call the service when transitioning INTO "ready"
    """

    # New draft (no existing row in DB) → nothing to compare, so skip
    if not instance.pk:
        return

    # Fetch previous state from DB
    try:
        previous = EmailDraft.objects.get(pk=instance.pk)
    except EmailDraft.DoesNotExist:
        # In theory shouldn't happen, but we guard against it anyway
        return

    # If status has not changed at all → nothing to do
    if previous.status == instance.status:
        return

    # Only trigger when status becomes READY
    if instance.status != EmailDraft.STATUS_READY:
        return

    # Delegate to service layer
    services.execute_workflow_trigger(
        email_draft=instance,
        previous_status=previous.status,
    )
