# Merge migration: parallel branches from 0001 (layout/template vs MeetingDocument).
# Resolves: 0003_meetingdocument_yjs_state and 0004_meetingtemplate_* as competing leaves.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0003_meetingdocument_yjs_state"),
        ("meetings", "0004_meetingtemplate_updated_at_meetingtemplate_user_and_more"),
    ]

    operations = []
