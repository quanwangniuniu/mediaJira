# Generated merge migration to resolve conflict between 0002_add_acknowledged_at and 0002_alerttask_acknowledged_at

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('alerting', '0002_add_acknowledged_at'),
        ('alerting', '0002_alerttask_acknowledged_at'),
    ]

    operations = [
        # No operations needed - both migrations add the same field
    ]
