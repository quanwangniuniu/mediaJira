import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0002_knowledge_preservation_meeting_metadata"),
    ]

    operations = [
        migrations.AddField(
            model_name="meetingdecisionorigin",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="meetingdecisionorigin",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="meetingtaskorigin",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="meetingtaskorigin",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddConstraint(
            model_name="meetingdecisionorigin",
            constraint=models.UniqueConstraint(
                fields=("meeting", "decision"),
                name="mtgs_dcor_unique_meeting_decision",
            ),
        ),
        migrations.AddConstraint(
            model_name="meetingtaskorigin",
            constraint=models.UniqueConstraint(
                fields=("meeting", "task"),
                name="mtgs_tkor_unique_meeting_task",
            ),
        ),
    ]
