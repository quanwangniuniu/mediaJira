# Add frozen_row_count and frozen_column_count to Sheet for freeze header/panes.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0006_spreadsheetcellformat_number_format'),
    ]

    operations = [
        migrations.AddField(
            model_name='sheet',
            name='frozen_row_count',
            field=models.PositiveSmallIntegerField(default=0, help_text='Number of rows to freeze (0 = none, 1 = freeze first row, etc.)'),
        ),
        migrations.AddField(
            model_name='sheet',
            name='frozen_column_count',
            field=models.PositiveSmallIntegerField(default=0, help_text='Number of columns to freeze (0 = none)'),
        ),
    ]
