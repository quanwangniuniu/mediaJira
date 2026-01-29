# Generated manually for Google OAuth fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_rename_core_projec_email_abc123_idx_core_projec_email_45393c_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='google_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='customuser',
            name='google_registered',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='customuser',
            name='password_set',
            field=models.BooleanField(default=True),
        ),
    ]
