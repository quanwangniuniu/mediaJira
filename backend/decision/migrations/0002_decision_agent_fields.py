from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decision', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='decision',
            name='created_by_agent',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='decision',
            name='agent_session_id',
            field=models.UUIDField(blank=True, null=True),
        ),
    ]
