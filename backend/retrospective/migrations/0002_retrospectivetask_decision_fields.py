from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ("retrospective", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="retrospectivetask",
            name="decision",
            field=models.CharField(
                default="",
                help_text="Decision made for this retrospective task",
                max_length=255,
            ),
        ),
        migrations.AddField(
            model_name="retrospectivetask",
            name="confidence_level",
            field=models.IntegerField(
                choices=[(1, "1"), (2, "2"), (3, "3"), (4, "4"), (5, "5")],
                default=3,
                help_text="Confidence level for the decision (1-5)",
                validators=[
                    django.core.validators.MinValueValidator(1),
                    django.core.validators.MaxValueValidator(5),
                ],
            ),
        ),
        migrations.AddField(
            model_name="retrospectivetask",
            name="primary_assumption",
            field=models.TextField(
                default="",
                help_text="Primary assumption behind the decision",
            ),
        ),
        migrations.AddField(
            model_name="retrospectivetask",
            name="key_risk_ignore",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Optional key risk to explicitly ignore",
            ),
        ),
    ]
