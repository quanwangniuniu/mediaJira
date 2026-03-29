from django.db import migrations, models
import django_fsm


class Migration(migrations.Migration):

    dependencies = [
        ('decision', '0002_decision_agent_fields'),
    ]

    operations = [
        migrations.AlterField(
            model_name='decision',
            name='status',
            field=django_fsm.FSMField(
                choices=[
                    ('PREDRAFT', 'Pre-Draft'),
                    ('DRAFT', 'Draft'),
                    ('AWAITING_APPROVAL', 'Awaiting Approval'),
                    ('COMMITTED', 'Committed'),
                    ('REVIEWED', 'Reviewed'),
                    ('ARCHIVED', 'Archived'),
                ],
                default='DRAFT',
                max_length=20,
                protected=True,
            ),
        ),
    ]
