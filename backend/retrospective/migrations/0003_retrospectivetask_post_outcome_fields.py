from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("retrospective", "0002_retrospectivetask_decision_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="retrospectivetask",
            name="outcome_compared_to_expectation",
            field=models.CharField(
                blank=True,
                choices=[
                    ("better", "Better"),
                    ("worse", "Worse"),
                    ("as_expected", "As expected"),
                ],
                help_text="Post-outcome: result compared to initial expectation",
                max_length=20,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="retrospectivetask",
            name="biggest_wrong_assumption",
            field=models.TextField(
                blank=True,
                help_text="Post-outcome: biggest assumption that proved wrong",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="retrospectivetask",
            name="would_make_same_decision_again",
            field=models.CharField(
                blank=True,
                choices=[("yes", "Yes"), ("no", "No")],
                help_text="Post-outcome: whether the same decision would be made again",
                max_length=3,
                null=True,
            ),
        ),
    ]
