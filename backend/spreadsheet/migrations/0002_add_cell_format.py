# Generated manually for SpreadsheetCellFormat

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SpreadsheetCellFormat',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('row_index', models.IntegerField(help_text='0-based row position')),
                ('column_index', models.IntegerField(help_text='0-based column position')),
                ('bold', models.BooleanField(default=False)),
                ('italic', models.BooleanField(default=False)),
                ('strikethrough', models.BooleanField(default=False)),
                ('text_color', models.CharField(blank=True, help_text='Hex color e.g. #333333', max_length=20, null=True)),
                ('sheet', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='cell_formats', to='spreadsheet.sheet')),
            ],
        ),
        migrations.AddConstraint(
            model_name='spreadsheetcellformat',
            constraint=models.UniqueConstraint(
                fields=('sheet', 'row_index', 'column_index'),
                name='unique_sheet_cell_format_position'
            ),
        ),
        migrations.AddIndex(
            model_name='spreadsheetcellformat',
            index=models.Index(fields=['sheet'], name='spreadsheet_cellformat_sheet_idx'),
        ),
    ]
