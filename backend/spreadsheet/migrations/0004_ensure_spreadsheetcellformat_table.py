# Safe migration: create SpreadsheetCellFormat table only if it does not exist.
# Use this when 0002_add_cell_format was faked and the table was never created.

from django.db import migrations, connection


def create_table_if_not_exists(apps, schema_editor):
    """Create spreadsheet_spreadsheetcellformat table only if it doesn't exist."""
    if schema_editor.connection.vendor != "postgresql":
        # Only PostgreSQL supported for this raw SQL; skip for sqlite/tests
        return
    table_name = "spreadsheet_spreadsheetcellformat"
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = %s
            );
        """, [table_name])
        exists = cursor.fetchone()[0]

    if exists:
        return

    # Create table (PostgreSQL). Use same structure as 0002_add_cell_format.
    schema_editor.execute("""
        CREATE TABLE spreadsheet_spreadsheetcellformat (
            id BIGSERIAL PRIMARY KEY,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            row_index INTEGER NOT NULL,
            column_index INTEGER NOT NULL,
            bold BOOLEAN NOT NULL DEFAULT FALSE,
            italic BOOLEAN NOT NULL DEFAULT FALSE,
            strikethrough BOOLEAN NOT NULL DEFAULT FALSE,
            text_color VARCHAR(20) NULL,
            sheet_id BIGINT NOT NULL REFERENCES spreadsheet_sheet(id) ON DELETE CASCADE
        );
    """)
    schema_editor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS unique_sheet_cell_format_position
        ON spreadsheet_spreadsheetcellformat (sheet_id, row_index, column_index);
    """)
    schema_editor.execute("""
        CREATE INDEX IF NOT EXISTS spreadsheet_sheet_i_c79485_idx
        ON spreadsheet_spreadsheetcellformat (sheet_id);
    """)


def reverse_noop(apps, schema_editor):
    """No reverse - we don't drop the table in case it was created by 0002."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("spreadsheet", "0003_rename_spreadsheet_cellformat_sheet_idx_spreadsheet_sheet_i_c79485_idx"),
    ]

    operations = [
        migrations.RunPython(create_table_if_not_exists, reverse_noop),
    ]
