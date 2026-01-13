# Generated manually to add MVP fields to Optimization

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("optimization", "0003_optimization"),
    ]

    operations = [
        migrations.AddField(
            model_name="optimization",
            name="affected_entity_ids",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Affected campaign/ad set ids, e.g. {'campaign_ids': ['fb:123'], 'ad_set_ids': ['fb:456']}",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="triggered_metrics",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Metrics that triggered optimization, e.g. {'CPA': {'delta_pct': 35, 'window': '24h'}}",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="baseline_metrics",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Baseline metrics before adjustments, e.g. {'CPA': 12.3, 'CTR': 0.9}",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="observed_metrics",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Observed metrics after action, for monitoring/outcome tracking",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="action_type",
            field=models.CharField(
                choices=[
                    ("pause", "Pause"),
                    ("scale", "Scale"),
                    ("duplicate", "Duplicate"),
                    ("edit", "Edit"),
                ],
                default="pause",
                help_text="Planned action type (pause/scale/duplicate/edit)",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="planned_action",
            field=models.TextField(
                blank=True,
                help_text="Planned action details (what will be changed and how)",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="execution_status",
            field=models.CharField(
                choices=[
                    ("detected", "Detected"),
                    ("planned", "Planned"),
                    ("executed", "Executed"),
                    ("monitoring", "Monitoring"),
                    ("completed", "Completed"),
                    ("cancelled", "Cancelled"),
                ],
                default="detected",
                help_text="Execution status from detection to monitoring/outcome",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="executed_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="When the optimization action was executed",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="monitored_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="When post-adjustment monitoring/outcome was last updated",
            ),
        ),
        migrations.AddField(
            model_name="optimization",
            name="outcome_notes",
            field=models.TextField(
                blank=True,
                help_text="Notes about outcome and performance changes after optimization",
            ),
        ),
    ]


