# Knowledge preservation: structured meeting metadata, provenance links, and discovery indexes.

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def forwards_backfill_meeting_types(apps, schema_editor):
    from django.utils.text import slugify

    Meeting = apps.get_model("meetings", "Meeting")
    MeetingTypeDefinition = apps.get_model("meetings", "MeetingTypeDefinition")

    for m in Meeting.objects.all().iterator():
        raw = (m.meeting_type or "general").strip() or "general"
        safe_label = raw[:160]
        base_slug = (slugify(raw)[:80] or "general")[:80]
        base_slug = base_slug[:80]
        chosen = None
        for i in range(1000):
            slug = base_slug if i == 0 else (base_slug[: 80 - len(f"-{i}")] + f"-{i}")[:80]
            mtd, created = MeetingTypeDefinition.objects.get_or_create(
                project_id=m.project_id,
                slug=slug,
                defaults={"label": safe_label},
            )
            if created or mtd.label == safe_label:
                chosen = mtd
                break
        if chosen is None:
            raise RuntimeError("Meeting type slug allocation failed")
        m.type_definition_id = chosen.id
        m.save(update_fields=["type_definition_id"])


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0001_initial"),
        ("decision", "0004_merge_predraft_migrations"),
        ("task", "0005_alter_approvalrecord_options_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="MeetingTypeDefinition",
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
                ("slug", models.SlugField(max_length=80)),
                ("label", models.CharField(max_length=160)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meeting_type_definitions",
                        to="core.project",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["project", "slug"],
                        name="mtgs_typedef_prj_slug",
                    ),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name="meetingtypedefinition",
            constraint=models.UniqueConstraint(
                fields=("project", "slug"),
                name="meetings_type_def_unique_project_slug",
            ),
        ),
        migrations.CreateModel(
            name="MeetingTagDefinition",
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
                ("slug", models.SlugField(max_length=80)),
                ("label", models.CharField(max_length=160)),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meeting_tag_definitions",
                        to="core.project",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["project", "slug"],
                        name="mtgs_tagdef_prj_slug",
                    ),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name="meetingtagdefinition",
            constraint=models.UniqueConstraint(
                fields=("project", "slug"),
                name="meetings_tag_def_unique_project_slug",
            ),
        ),
        migrations.AddField(
            model_name="meeting",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="meeting",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="meeting",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="meeting",
            name="summary",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Concise outcomes / takeaways for scanning and search snippets.",
            ),
        ),
        migrations.AddField(
            model_name="meeting",
            name="is_archived",
            field=models.BooleanField(
                db_index=True,
                default=False,
                help_text="Archived meetings are treated as immutable knowledge records.",
            ),
        ),
        migrations.AddField(
            model_name="meeting",
            name="type_definition",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="meetings",
                to="meetings.meetingtypedefinition",
            ),
        ),
        migrations.RunPython(forwards_backfill_meeting_types, noop_reverse),
        migrations.RemoveField(
            model_name="meeting",
            name="meeting_type",
        ),
        migrations.AlterField(
            model_name="meeting",
            name="type_definition",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="meetings",
                to="meetings.meetingtypedefinition",
            ),
        ),
        migrations.AddIndex(
            model_name="meeting",
            index=models.Index(
                fields=["project", "-created_at"],
                name="mtgs_mtg_prj_crtd_d",
            ),
        ),
        migrations.AddIndex(
            model_name="meeting",
            index=models.Index(
                fields=["project", "is_archived", "-updated_at"],
                name="mtgs_mtg_prj_arch_u",
            ),
        ),
        migrations.AddIndex(
            model_name="meeting",
            index=models.Index(
                fields=["project", "scheduled_date"],
                name="mtgs_mtg_prj_sched",
            ),
        ),
        migrations.AddIndex(
            model_name="meeting",
            index=models.Index(
                fields=["project", "type_definition"],
                name="mtgs_mtg_prj_type",
            ),
        ),
        migrations.CreateModel(
            name="MeetingTagAssignment",
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
                (
                    "meeting",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="tag_assignments",
                        to="meetings.meeting",
                    ),
                ),
                (
                    "tag_definition",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="assignments",
                        to="meetings.meetingtagdefinition",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["tag_definition", "meeting"],
                        name="mtgs_tagas_tag_mtg",
                    ),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name="meetingtagassignment",
            constraint=models.UniqueConstraint(
                fields=("meeting", "tag_definition"),
                name="meetings_tag_assign_unique_meeting_tag",
            ),
        ),
        migrations.CreateModel(
            name="MeetingDecisionOrigin",
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
                (
                    "decision",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meeting_origin",
                        to="decision.decision",
                    ),
                ),
                (
                    "meeting",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="decision_origins",
                        to="meetings.meeting",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["meeting", "decision"],
                        name="mtgs_dcor_mtg_dec",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="MeetingTaskOrigin",
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
                (
                    "meeting",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="task_origins",
                        to="meetings.meeting",
                    ),
                ),
                (
                    "task",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="meeting_origin",
                        to="task.task",
                    ),
                ),
            ],
            options={
                "indexes": [
                    models.Index(
                        fields=["meeting", "task"],
                        name="mtgs_tkor_mtg_tsk",
                    ),
                ],
            },
        ),
        migrations.AddIndex(
            model_name="participantlink",
            index=models.Index(
                fields=["user", "meeting"],
                name="mtgs_prt_usr_mtg",
            ),
        ),
    ]
