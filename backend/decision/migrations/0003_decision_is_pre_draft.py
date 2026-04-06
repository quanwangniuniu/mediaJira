from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decision', '0002_decision_agent_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='decision',
            name='is_pre_draft',
            field=models.BooleanField(default=False),
        ),
    ]
