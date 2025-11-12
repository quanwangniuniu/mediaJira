# Generated manually to add expires_at field to PublicPreview

from django.db import migrations, models
from django.utils import timezone
from datetime import timedelta


def set_expires_at_for_existing_previews(apps, schema_editor):
    """
    Set expires_at to 7 days from now for existing PublicPreview records.
    This ensures all existing previews get a valid expiration date.
    """
    PublicPreview = apps.get_model('tiktok', 'PublicPreview')
    # Only update if there are existing records
    if PublicPreview.objects.exists():
        # Set expires_at to 7 days from now for all existing previews
        expires_at = timezone.now() + timedelta(days=7)
        PublicPreview.objects.all().update(expires_at=expires_at)


def reverse_set_expires_at(apps, schema_editor):
    """
    Reverse migration - nothing to do since we're removing the field.
    """
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('tiktok', '0002_publicpreview'),
    ]

    operations = [
        # Step 1: Add expires_at field as nullable first
        migrations.AddField(
            model_name='publicpreview',
            name='expires_at',
            field=models.DateTimeField(help_text='Expiration date of the preview', null=True, blank=True),
        ),
        # Step 2: Set expires_at for existing records (7 days from now)
        migrations.RunPython(set_expires_at_for_existing_previews, reverse_set_expires_at),
        # Step 3: Make expires_at non-nullable
        migrations.AlterField(
            model_name='publicpreview',
            name='expires_at',
            field=models.DateTimeField(help_text='Expiration date of the preview', null=False, blank=False),
        ),
        # Step 4: Add index on expires_at for cleanup queries
        migrations.AddIndex(
            model_name='publicpreview',
            index=models.Index(fields=['expires_at'], name='tiktok_publ_expires_abc123_idx'),
        ),
    ]

