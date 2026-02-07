from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('decision', '0004_decision_edge'),
    ]

    operations = [
        migrations.AddField(
            model_name='decisionedge',
            name='is_deleted',
            field=models.BooleanField(default=False),
        ),
    ]
