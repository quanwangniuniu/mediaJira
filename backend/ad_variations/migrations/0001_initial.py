from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("core", "0009_projectinvitation_approval_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AdGroup",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                (
                    "campaign",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ad_groups", to="core.project"),
                ),
            ],
        ),
        migrations.CreateModel(
            name="AdVariation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                (
                    "creative_type",
                    models.CharField(
                        choices=[("image", "Image"), ("video", "Video"), ("carousel", "Carousel"), ("collection", "Collection"), ("email", "Email")],
                        max_length=30,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("Draft", "Draft"), ("Live", "Live"), ("Testing", "Testing"), ("Winner", "Winner"), ("Loser", "Loser"), ("Paused", "Paused")],
                        default="Draft",
                        max_length=20,
                    ),
                ),
                ("tags", models.JSONField(blank=True, default=list)),
                ("notes", models.TextField(blank=True, default="")),
                ("format_payload", models.JSONField(blank=True, default=dict)),
                ("delivery", models.CharField(blank=True, default="", max_length=100)),
                ("bid_strategy", models.CharField(blank=True, default="", max_length=100)),
                ("budget", models.DecimalField(blank=True, decimal_places=2, max_digits=12, null=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
                (
                    "ad_group",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="variations",
                        to="ad_variations.adgroup",
                    ),
                ),
                (
                    "campaign",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ad_variations",
                        to="core.project",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="CopyElement",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("element_key", models.CharField(max_length=120)),
                ("value", models.TextField()),
                ("locale", models.CharField(blank=True, max_length=40, null=True)),
                ("position", models.PositiveIntegerField(blank=True, null=True)),
                ("meta", models.JSONField(blank=True, null=True)),
                (
                    "variation",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="copy_elements", to="ad_variations.advariation"),
                ),
            ],
            options={"ordering": ["created_at"]},
        ),
        migrations.CreateModel(
            name="VariationPerformance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("recorded_at", models.DateTimeField()),
                ("metrics", models.JSONField(default=dict)),
                ("trend_indicator", models.CharField(blank=True, max_length=120, null=True)),
                ("observations", models.TextField(blank=True, null=True)),
                (
                    "created_by",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
                ),
                (
                    "variation",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="performance_entries", to="ad_variations.advariation"),
                ),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
        migrations.CreateModel(
            name="VariationStatusHistory",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "from_status",
                    models.CharField(
                        choices=[("Draft", "Draft"), ("Live", "Live"), ("Testing", "Testing"), ("Winner", "Winner"), ("Loser", "Loser"), ("Paused", "Paused")],
                        max_length=20,
                    ),
                ),
                (
                    "to_status",
                    models.CharField(
                        choices=[("Draft", "Draft"), ("Live", "Live"), ("Testing", "Testing"), ("Winner", "Winner"), ("Loser", "Loser"), ("Paused", "Paused")],
                        max_length=20,
                    ),
                ),
                ("reason", models.TextField(blank=True, null=True)),
                ("changed_at", models.DateTimeField()),
                (
                    "changed_by",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL),
                ),
                (
                    "variation",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="status_history", to="ad_variations.advariation"),
                ),
            ],
            options={"ordering": ["-changed_at"]},
        ),
    ]
