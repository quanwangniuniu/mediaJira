from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('agent', '0005_agentworkflowrun_miro_board_and_more'),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
