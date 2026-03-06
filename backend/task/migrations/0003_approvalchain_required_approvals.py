from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('task', '0002_add_approval_chain_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='approvalchain',
            name='required_approvals',
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                help_text=(
                    'Minimum number of approved ApprovalRecords required before the task can be locked. '
                    'Defaults to total_steps (all steps must be approved) when null.'
                ),
            ),
        ),
    ]
