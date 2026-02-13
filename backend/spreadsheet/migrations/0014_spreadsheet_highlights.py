from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('spreadsheet', '0013_rename_spreadsheet_created_96ee1a_idx_spreadsheet_created_58d676_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpreadsheetHighlight',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('scope', models.CharField(choices=[('CELL', 'Cell'), ('ROW', 'Row'), ('COLUMN', 'Column')], max_length=10)),
                ('row_index', models.IntegerField(blank=True, null=True)),
                ('col_index', models.IntegerField(blank=True, null=True)),
                ('color', models.CharField(max_length=20)),
                ('sheet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='highlights', to='spreadsheet.sheet')),
                ('spreadsheet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='highlights', to='spreadsheet.spreadsheet')),
            ],
            options={
                'indexes': [models.Index(fields=['sheet', 'scope'], name='spreadsheet_sheet__ac1c74_idx')],
            },
        ),
        migrations.AddConstraint(
            model_name='spreadsheethighlight',
            constraint=models.UniqueConstraint(fields=('sheet', 'scope', 'row_index', 'col_index'), name='unique_sheet_highlight_scope_position'),
        ),
    ]
