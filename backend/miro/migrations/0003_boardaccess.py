from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0001_initial"),
        ("miro", "0002_boarditem_emoji_type"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoardAccess",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("last_accessed_at", models.DateTimeField(auto_now=True)),
                (
                    "board",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="accesses",
                        to="miro.board",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="board_accesses",
                        to="core.project",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=models.deletion.CASCADE,
                        related_name="board_accesses",
                        to="core.customuser",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(fields=["user", "project"], name="miro_boarda_user_id_7fb95b_idx"),
                    models.Index(
                        fields=["project", "last_accessed_at"],
                        name="miro_boarda_project_4e7e98_idx",
                    ),
                ],
                "unique_together": {("user", "project")},
            },
        ),
    ]
