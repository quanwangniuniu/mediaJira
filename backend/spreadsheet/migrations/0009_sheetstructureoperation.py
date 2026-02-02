from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0008_alter_cell_computed_type'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='SheetStructureOperation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('op_type', models.CharField(choices=[('ROW_INSERT', 'Row Insert'), ('COL_INSERT', 'Column Insert'), ('ROW_DELETE', 'Row Delete'), ('COL_DELETE', 'Column Delete')], max_length=20)),
                ('anchor_position', models.IntegerField(help_text='Anchor position for the operation (insert/delete start index)')),
                ('count', models.IntegerField(help_text='Number of rows/columns inserted or deleted')),
                ('affected_ids', models.JSONField(default=list, help_text='List of affected row/column IDs')),
                ('affected_positions', models.JSONField(default=dict, help_text='Mapping of affected ID to original position')),
                ('is_reverted', models.BooleanField(default=False)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sheet_structure_operations', to=settings.AUTH_USER_MODEL)),
                ('sheet', models.ForeignKey(help_text='Sheet this operation belongs to', on_delete=django.db.models.deletion.CASCADE, related_name='structure_operations', to='spreadsheet.sheet')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='sheetstructureoperation',
            index=models.Index(fields=['sheet', 'op_type'], name='spreadsheet_sheet_op_type_idx'),
        ),
        migrations.AddIndex(
            model_name='sheetstructureoperation',
            index=models.Index(fields=['sheet', 'is_reverted'], name='spreadsheet_sheet_is_reverted_idx'),
        ),
    ]

