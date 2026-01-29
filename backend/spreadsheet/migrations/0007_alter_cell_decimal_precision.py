from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0006_rename_spreadsheet_to_cell_3a2b86_idx_spreadsheet_to_cell_1f9b73_idx'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cell',
            name='number_value',
            field=models.DecimalField(blank=True, decimal_places=500, help_text='Numeric value', max_digits=1000, null=True),
        ),
        migrations.AlterField(
            model_name='cell',
            name='computed_number',
            field=models.DecimalField(blank=True, decimal_places=500, help_text='Computed numeric result', max_digits=1000, null=True),
        ),
    ]

