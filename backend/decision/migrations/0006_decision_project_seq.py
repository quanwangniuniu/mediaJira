from django.db import migrations, models


def backfill_project_seq(apps, schema_editor):
    Decision = apps.get_model('decision', 'Decision')

    project_ids = (
        Decision.objects.order_by()
        .values_list('project_id', flat=True)
        .distinct()
    )

    for project_id in project_ids:
        qs = (
            Decision.objects.filter(project_id=project_id)
            .order_by('created_at', 'id')
            .only('id')
        )
        for index, decision in enumerate(qs, start=1):
            Decision.objects.filter(pk=decision.id).update(project_seq=index)


class Migration(migrations.Migration):

    dependencies = [
        ('decision', '0005_decision_edge_is_deleted'),
    ]

    operations = [
        migrations.AddField(
            model_name='decision',
            name='project_seq',
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
        migrations.RunPython(backfill_project_seq, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='decision',
            name='project_seq',
            field=models.PositiveIntegerField(),
        ),
        migrations.AddConstraint(
            model_name='decision',
            constraint=models.UniqueConstraint(
                fields=('project', 'project_seq'),
                name='unique_project_decision_seq',
            ),
        ),
    ]
