from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0003_alter_sheetcolumn_options_alter_sheetrow_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='cell',
            name='raw_input',
            field=models.TextField(blank=True, help_text="Original user input, including formulas starting with '='", null=True),
        ),
        migrations.AddField(
            model_name='cell',
            name='computed_type',
            field=models.CharField(choices=[('empty', 'Empty'), ('number', 'Number'), ('string', 'String'), ('error', 'Error')], default='empty', help_text='Computed result type for formula or raw input', max_length=20),
        ),
        migrations.AddField(
            model_name='cell',
            name='computed_number',
            field=models.DecimalField(blank=True, decimal_places=10, help_text='Computed numeric result', max_digits=30, null=True),
        ),
        migrations.AddField(
            model_name='cell',
            name='computed_string',
            field=models.TextField(blank=True, help_text='Computed string result', null=True),
        ),
        migrations.AddField(
            model_name='cell',
            name='error_code',
            field=models.CharField(blank=True, help_text='Formula error code (e.g. #DIV/0!, #REF!)', max_length=50, null=True),
        ),
    ]

