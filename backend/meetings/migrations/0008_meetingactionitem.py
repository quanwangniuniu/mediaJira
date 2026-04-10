# Generated manually for SMP-489

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0007_merge_20260407_0521"),
    ]

    operations = [
        migrations.CreateModel(
            name="MeetingActionItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("order_index", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "meeting",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="action_items",
                        to="meetings.meeting",
                    ),
                ),
            ],
            options={
                "ordering": ["order_index", "id"],
            },
        ),
        migrations.AddIndex(
            model_name="meetingactionitem",
            index=models.Index(fields=["meeting", "order_index"], name="mtgs_actitem_meet_ord"),
        ),
    ]
