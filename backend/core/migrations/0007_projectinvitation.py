# Generated manually for ProjectInvitation model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("core", "0006_customuser_active_project_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectInvitation",
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
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("is_deleted", models.BooleanField(default=False)),
                (
                    "email",
                    models.EmailField(
                        help_text="Email address of the invited user", max_length=254
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        default="member",
                        help_text="Role the user will have in the project (e.g., 'owner', 'member', 'viewer')",
                        max_length=50,
                    ),
                ),
                (
                    "token",
                    models.CharField(
                        help_text="Unique token for accepting the invitation",
                        max_length=64,
                        unique=True,
                    ),
                ),
                (
                    "accepted",
                    models.BooleanField(
                        default=False, help_text="Whether the invitation has been accepted"
                    ),
                ),
                (
                    "accepted_at",
                    models.DateTimeField(
                        blank=True,
                        help_text="When the invitation was accepted",
                        null=True,
                    ),
                ),
                (
                    "expires_at",
                    models.DateTimeField(
                        help_text="When the invitation expires"
                    ),
                ),
                (
                    "invited_by",
                    models.ForeignKey(
                        help_text="User who sent the invitation",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="sent_invitations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        help_text="Project the user is being invited to",
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="invitations",
                        to="core.project",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="projectinvitation",
            index=models.Index(
                fields=["email", "accepted"], name="core_projec_email_abc123_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="projectinvitation",
            index=models.Index(fields=["token"], name="core_projec_token_abc123_idx"),
        ),
        migrations.AlterUniqueTogether(
            name="projectinvitation",
            unique_together={("email", "project", "accepted")},
        ),
    ]

