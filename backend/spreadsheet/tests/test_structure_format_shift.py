import uuid

from django.test import TestCase

from spreadsheet.models import (
    Cell,
    CellValueType,
    SheetColumn,
    SheetRow,
    SpreadsheetCellFormat,
    SpreadsheetHighlight,
    SpreadsheetHighlightScope,
)
from spreadsheet.services import SheetService
from spreadsheet.tests.test_services import (
    create_test_organization,
    create_test_project,
    create_test_sheet,
    create_test_spreadsheet,
    create_test_user,
)


class TestStructureDecorationShift(TestCase):
    def setUp(self):
        suffix = uuid.uuid4().hex[:8]
        self.user = create_test_user(
            username=f"shift_{suffix}",
            email=f"shift_{suffix}@test.com",
        )
        organization = create_test_organization(name=f"Shift Org {suffix}")
        project = create_test_project(organization, owner=self.user)
        spreadsheet = create_test_spreadsheet(project)
        self.sheet = create_test_sheet(spreadsheet)
        self.spreadsheet = spreadsheet
        self.rows = [
            SheetRow.objects.create(sheet=self.sheet, position=i)
            for i in range(4)
        ]
        self.cols = [
            SheetColumn.objects.create(
                sheet=self.sheet,
                position=i,
                name=SheetService._generate_column_name(i),
            )
            for i in range(4)
        ]

    def _value(self, row_index, column_index, raw):
        return Cell.objects.create(
            sheet=self.sheet,
            row=self.rows[row_index],
            column=self.cols[column_index],
            value_type=CellValueType.STRING,
            raw_input=raw,
            string_value=raw,
        )

    def _format(self, row_index, column_index):
        return SpreadsheetCellFormat.objects.create(
            sheet=self.sheet,
            row_index=row_index,
            column_index=column_index,
            bold=True,
        )

    def _highlight(self, scope, row_index, col_index, color):
        return SpreadsheetHighlight.objects.create(
            spreadsheet=self.spreadsheet,
            sheet=self.sheet,
            scope=scope,
            row_index=row_index,
            col_index=col_index,
            color=color,
        )

    def test_insert_column_moves_value_format_and_highlights(self):
        value = self._value(1, 2, "hello")
        moved = self._format(1, 2)
        earlier = self._format(1, 0)
        cell_highlight = self._highlight(SpreadsheetHighlightScope.CELL, 1, 2, "#FDE047")
        column_highlight = self._highlight(SpreadsheetHighlightScope.COLUMN, 0, 2, "#BBF7D0")
        row_highlight = self._highlight(SpreadsheetHighlightScope.ROW, 1, 0, "#BFDBFE")

        SheetService.insert_columns(self.sheet, position=2, count=1, created_by=self.user)

        value.refresh_from_db()
        value.column.refresh_from_db()
        moved.refresh_from_db()
        earlier.refresh_from_db()
        cell_highlight.refresh_from_db()
        column_highlight.refresh_from_db()
        row_highlight.refresh_from_db()

        self.assertEqual(value.column_id, self.cols[2].id)
        self.assertEqual(value.column.position, 3)
        self.assertEqual((moved.row_index, moved.column_index), (1, 3))
        self.assertEqual((earlier.row_index, earlier.column_index), (1, 0))
        self.assertEqual((cell_highlight.row_index, cell_highlight.col_index), (1, 3))
        self.assertEqual((column_highlight.row_index, column_highlight.col_index), (0, 3))
        self.assertEqual((row_highlight.row_index, row_highlight.col_index), (1, 0))

    def test_delete_column_before_formatted_cell_shifts_left(self):
        value = self._value(1, 2, "hello")
        moved = self._format(1, 2)
        earlier = self._format(1, 0)
        cell_highlight = self._highlight(SpreadsheetHighlightScope.CELL, 1, 2, "#FDE047")

        SheetService.delete_columns(self.sheet, position=1, count=1, created_by=self.user)

        value.refresh_from_db()
        value.column.refresh_from_db()
        moved.refresh_from_db()
        earlier.refresh_from_db()
        cell_highlight.refresh_from_db()

        self.assertEqual(value.column_id, self.cols[2].id)
        self.assertEqual(value.column.position, 1)
        self.assertEqual((moved.row_index, moved.column_index), (1, 1))
        self.assertEqual(earlier.column_index, 0)
        self.assertEqual(cell_highlight.col_index, 1)

    def test_delete_formatted_column_removes_its_metadata(self):
        removed = self._format(1, 2)
        removed_highlight = self._highlight(SpreadsheetHighlightScope.CELL, 1, 2, "#FDE047")
        removed_column = self._highlight(SpreadsheetHighlightScope.COLUMN, 0, 2, "#BBF7D0")
        later = self._format(1, 3)
        earlier = self._format(1, 0)

        SheetService.delete_columns(self.sheet, position=2, count=1, created_by=self.user)

        self.assertFalse(SpreadsheetCellFormat.objects.filter(pk=removed.pk).exists())
        self.assertFalse(SpreadsheetHighlight.objects.filter(pk=removed_highlight.pk).exists())
        self.assertFalse(SpreadsheetHighlight.objects.filter(pk=removed_column.pk).exists())
        later.refresh_from_db()
        earlier.refresh_from_db()
        self.assertEqual(later.column_index, 2)
        self.assertEqual(earlier.column_index, 0)

    def test_insert_row_moves_value_format_and_highlights(self):
        value = self._value(2, 1, "hello")
        moved = self._format(2, 1)
        earlier = self._format(0, 1)
        cell_highlight = self._highlight(SpreadsheetHighlightScope.CELL, 2, 1, "#FDE047")
        row_highlight = self._highlight(SpreadsheetHighlightScope.ROW, 2, 0, "#BFDBFE")
        column_highlight = self._highlight(SpreadsheetHighlightScope.COLUMN, 0, 1, "#BBF7D0")

        SheetService.insert_rows(self.sheet, position=2, count=1, created_by=self.user)

        value.refresh_from_db()
        value.row.refresh_from_db()
        moved.refresh_from_db()
        earlier.refresh_from_db()
        cell_highlight.refresh_from_db()
        row_highlight.refresh_from_db()
        column_highlight.refresh_from_db()

        self.assertEqual(value.row_id, self.rows[2].id)
        self.assertEqual(value.row.position, 3)
        self.assertEqual((moved.row_index, moved.column_index), (3, 1))
        self.assertEqual(earlier.row_index, 0)
        self.assertEqual((cell_highlight.row_index, cell_highlight.col_index), (3, 1))
        self.assertEqual((row_highlight.row_index, row_highlight.col_index), (3, 0))
        self.assertEqual((column_highlight.row_index, column_highlight.col_index), (0, 1))

    def test_delete_row_before_formatted_cell_shifts_up(self):
        value = self._value(2, 1, "hello")
        moved = self._format(2, 1)
        earlier = self._format(0, 1)
        cell_highlight = self._highlight(SpreadsheetHighlightScope.CELL, 2, 1, "#FDE047")

        SheetService.delete_rows(self.sheet, position=1, count=1, created_by=self.user)

        value.refresh_from_db()
        value.row.refresh_from_db()
        moved.refresh_from_db()
        earlier.refresh_from_db()
        cell_highlight.refresh_from_db()

        self.assertEqual(value.row_id, self.rows[2].id)
        self.assertEqual(value.row.position, 1)
        self.assertEqual((moved.row_index, moved.column_index), (1, 1))
        self.assertEqual(earlier.row_index, 0)
        self.assertEqual(cell_highlight.row_index, 1)

    def test_delete_formatted_row_removes_its_metadata(self):
        removed = self._format(2, 1)
        removed_highlight = self._highlight(SpreadsheetHighlightScope.CELL, 2, 1, "#FDE047")
        removed_row = self._highlight(SpreadsheetHighlightScope.ROW, 2, 0, "#BFDBFE")
        later = self._format(3, 1)
        earlier = self._format(0, 1)

        SheetService.delete_rows(self.sheet, position=2, count=1, created_by=self.user)

        self.assertFalse(SpreadsheetCellFormat.objects.filter(pk=removed.pk).exists())
        self.assertFalse(SpreadsheetHighlight.objects.filter(pk=removed_highlight.pk).exists())
        self.assertFalse(SpreadsheetHighlight.objects.filter(pk=removed_row.pk).exists())
        later.refresh_from_db()
        earlier.refresh_from_db()
        self.assertEqual(later.row_index, 2)
        self.assertEqual(earlier.row_index, 0)