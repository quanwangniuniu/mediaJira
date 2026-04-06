# Legacy DBs may have a meetings_meetingtemplate.block_config column (NOT NULL) from manual
# or pre-migration schema; Django models only use layout_config. Drop the orphan column.

from django.db import migrations


def drop_block_config_column(apps, schema_editor):
    conn = schema_editor.connection
    table = "meetings_meetingtemplate"
    column = "block_config"

    with conn.cursor() as cursor:
        if conn.vendor == "postgresql":
            cursor.execute(
                f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "{column}";'
            )
        elif conn.vendor == "sqlite":
            cursor.execute(f'PRAGMA table_info("{table}");')
            cols = [row[1] for row in cursor.fetchall()]
            if column in cols:
                cursor.execute(f'ALTER TABLE "{table}" DROP COLUMN "{column}";')
        else:
            raise NotImplementedError(
                f"meetings.0003: drop block_config for DB vendor {conn.vendor!r} is not "
                "handled; run SQL from meetings/sql/drop_meetingtemplate_block_config.sql."
            )


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("meetings", "0002_meeting_layout_and_template"),
    ]

    operations = [
        migrations.RunPython(drop_block_config_column, noop_reverse),
    ]
