# Add font_family and font_size to SpreadsheetCellFormat for cell typography.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0004_ensure_spreadsheetcellformat_table'),
    ]

    operations = [
        migrations.AddField(
            model_name='spreadsheetcellformat',
            name='font_family',
            field=models.CharField(blank=True, help_text='Font family e.g. Arial, Helvetica', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='spreadsheetcellformat',
            name='font_size',
            field=models.PositiveSmallIntegerField(blank=True, help_text='Font size in pixels', null=True),
        ),
    ]
