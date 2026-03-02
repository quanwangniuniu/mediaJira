# Add number_format to SpreadsheetCellFormat for numeric display (currency, percent, decimals).

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0005_spreadsheetcellformat_font_family_font_size'),
    ]

    operations = [
        migrations.AddField(
            model_name='spreadsheetcellformat',
            name='number_format',
            field=models.JSONField(blank=True, help_text='Display format for numeric cells (type, currency_code, decimal_places)', null=True),
        ),
    ]
