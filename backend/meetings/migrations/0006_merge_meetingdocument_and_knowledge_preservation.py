# Merge migration: prod-preview (MeetingDocument + yjs_state) diverged from
# knowledge-preservation chain (0002_knowledge_preservation … 0005_alter_meeting_is_deleted).

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0003_meetingdocument_yjs_state"),
        ("meetings", "0005_alter_meeting_is_deleted"),
    ]

    operations = []
