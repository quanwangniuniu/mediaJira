# Meeting.layout_config + MeetingTemplate — must stay in sync with meetings/models.py
#
# If migrate fails with DuplicateTable on meetings_meetingtemplate: the table already exists
# in the DB (e.g. created manually or from a partial run). Align schema, then either:
#   python manage.py migrate meetings 0002_meeting_layout_and_template --fake
# or drop the empty/wrong table only in dev, then migrate again.

import uuid

from django.db import migrations, models


def _meeting_template_id() -> str:
    """Same semantics as meetings.models._meeting_template_id (uuid4 hex)."""
    return uuid.uuid4().hex


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0001_initial"),
    ]

    operations = [
        # Meeting.layout_config — matches models.Meeting.layout_config
        migrations.AddField(
            model_name="meeting",
            name="layout_config",
            field=models.JSONField(default=list, null=True, blank=True),
        ),
        # MeetingTemplate — matches models.MeetingTemplate
        migrations.CreateModel(
            name="MeetingTemplate",
            fields=[
                (
                    "id",
                    models.CharField(
                        primary_key=True,
                        max_length=64,
                        default=_meeting_template_id,
                        editable=False,
                        serialize=False,
                    ),
                ),
                ("name", models.CharField(max_length=255)),
                (
                    "layout_config",
                    models.JSONField(default=dict, null=True, blank=True),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
