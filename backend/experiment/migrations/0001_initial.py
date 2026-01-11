import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('task', '0015_add_experiment_task_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='Experiment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='The name of the experiment', max_length=255)),
                ('hypothesis', models.TextField(help_text='The hypothesis being tested in this experiment')),
                ('expected_outcome', models.TextField(blank=True, help_text="Expected outcome of the experiment (e.g., '10% increase in CTR')", null=True)),
                ('description', models.TextField(blank=True, help_text='Additional description of the experiment', null=True)),
                ('control_group', models.JSONField(blank=True, default=dict, help_text="Control group configuration: {'campaigns': [...], 'ad_set_ids': [...], 'ad_ids': [...]}", null=True)),
                ('variant_group', models.JSONField(blank=True, default=dict, help_text="Variant group configuration: {'campaigns': [...], 'ad_set_ids': [...], 'ad_ids': [...]}", null=True)),
                ('success_metric', models.CharField(blank=True, help_text="Metric used to measure success (e.g., 'CTR', 'CPA', 'ROAS')", max_length=100, null=True)),
                ('constraints', models.TextField(blank=True, help_text='Constraints or considerations relevant to the experiment', null=True)),
                ('start_date', models.DateField(help_text='Planned start date of the experiment')),
                ('end_date', models.DateField(help_text='Planned end date of the experiment')),
                ('started_at', models.DateTimeField(blank=True, help_text='Actual execution start time when experiment began', null=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('running', 'Running'), ('paused', 'Paused'), ('completed', 'Completed'), ('cancelled', 'Cancelled')], default='draft', help_text='Current status of the experiment', max_length=20)),
                ('experiment_outcome', models.CharField(blank=True, choices=[('win', 'Win'), ('lose', 'Lose'), ('inconclusive', 'Inconclusive')], help_text='Final outcome of the experiment', max_length=20, null=True)),
                ('outcome_notes', models.TextField(blank=True, help_text='Notes summarizing learnings and conclusions from the experiment', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(db_column='created_by', help_text='The user who created the experiment', on_delete=django.db.models.deletion.CASCADE, related_name='created_experiments', to=settings.AUTH_USER_MODEL)),
                ('task', models.OneToOneField(blank=True, help_text='The task that owns this experiment (1:1 relationship)', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='experiment', to='task.task')),
            ],
            options={
                'db_table': 'experiment',
            },
        ),
        migrations.CreateModel(
            name='ExperimentProgressUpdate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('update_date', models.DateTimeField(default=django.utils.timezone.now, help_text='When this progress update was created')),
                ('notes', models.TextField(help_text='Progress update notes/description')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(db_column='created_by', help_text='The user who created this progress update', on_delete=django.db.models.deletion.CASCADE, related_name='created_experiment_progress_updates', to=settings.AUTH_USER_MODEL)),
                ('experiment', models.ForeignKey(help_text='The experiment this progress update belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='progress_updates', to='experiment.experiment')),
            ],
            options={
                'db_table': 'experiment_progress_update',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='experiment',
            index=models.Index(fields=['status'], name='experiment_status_idx'),
        ),
        migrations.AddIndex(
            model_name='experiment',
            index=models.Index(fields=['start_date', 'end_date'], name='experiment_dates_idx'),
        ),
        migrations.AddIndex(
            model_name='experimentprogressupdate',
            index=models.Index(fields=['experiment', 'created_at'], name='exp_progress_time_idx'),
        ),
    ]

