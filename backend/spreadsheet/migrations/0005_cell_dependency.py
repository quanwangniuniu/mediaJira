from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('spreadsheet', '0004_cell_formula_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='CellDependency',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False)),
                ('from_cell', models.ForeignKey(help_text='Formula cell that depends on another cell', on_delete=django.db.models.deletion.CASCADE, related_name='formula_dependencies', to='spreadsheet.cell')),
                ('to_cell', models.ForeignKey(help_text='Referenced cell that a formula depends on', on_delete=django.db.models.deletion.CASCADE, related_name='formula_dependents', to='spreadsheet.cell')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddConstraint(
            model_name='celldependency',
            constraint=models.UniqueConstraint(condition=models.Q(('is_deleted', False)), fields=('from_cell', 'to_cell'), name='unique_cell_dependency_active'),
        ),
        migrations.AddIndex(
            model_name='celldependency',
            index=models.Index(fields=['to_cell', 'is_deleted'], name='spreadsheet_to_cell_3a2b86_idx'),
        ),
    ]


