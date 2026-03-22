# Add pivot persistence: Sheet.kind and PivotConfig model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0007_sheet_frozen_row_count_frozen_column_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='sheet',
            name='kind',
            field=models.CharField(
                choices=[('normal', 'Normal'), ('pivot', 'Pivot')],
                default='normal',
                help_text='normal = standard sheet, pivot = pivot table sheet',
                max_length=20
            ),
        ),
        migrations.CreateModel(
            name='PivotConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(db_index=True, default=False)),
                ('rows_config', models.JSONField(default=list, help_text='List of row field names')),
                ('columns_config', models.JSONField(default=list, help_text='List of column configs (field or {field, sort})')),
                ('values_config', models.JSONField(default=list, help_text='List of {field, aggregation, display}')),
                ('filters_config', models.JSONField(blank=True, default=dict, help_text='Optional filters')),
                ('show_grand_total_row', models.BooleanField(default=True)),
                ('show_grand_total_column', models.BooleanField(default=True)),
                ('pivot_sheet', models.OneToOneField(help_text='Pivot sheet that displays aggregated results', on_delete=django.db.models.deletion.CASCADE, related_name='pivot_config', to='spreadsheet.sheet')),
                ('source_sheet', models.ForeignKey(help_text='Source sheet whose data is aggregated', on_delete=django.db.models.deletion.CASCADE, related_name='pivot_sources', to='spreadsheet.sheet')),
            ],
            options={
                'indexes': [
                    models.Index(fields=['source_sheet'], name='pivotconfig_source_sheet_idx'),
                ],
            },
        ),
    ]
