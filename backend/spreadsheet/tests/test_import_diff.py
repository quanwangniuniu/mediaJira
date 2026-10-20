from django.test import TestCase

from spreadsheet.import_baseline import build_import_baseline
from spreadsheet.import_diff import (
    _id_prefix_status,
    diff_cell_highlights,
    diff_cells,
    diff_formats,
    diff_sheet,
)
from spreadsheet.models import (
    Cell,
    SheetColumn,
    SheetRow,
    SpreadsheetCellFormat,
    SpreadsheetHighlight,
)
from spreadsheet.tests.test_views import (
    create_test_organization,
    create_test_project,
    create_test_sheet,
    create_test_spreadsheet,
    create_test_user,
)


def _source(baseline, sheet=None):
    class Source:
        pass
    source = Source()
    source.baseline = baseline
    source.sheet = sheet
    return source


class TestImportDiff(TestCase):
    def test_id_prefix(self):
        self.assertEqual(_id_prefix_status([501, 502, 503], [501, 502, 503]), 'same')
        self.assertEqual(_id_prefix_status([501, 502, 503], [501, 502, 503, 900]), 'append')
        self.assertEqual(_id_prefix_status([501, 502, 503], [900, 501, 502, 503]), 'unsafe')
        self.assertEqual(_id_prefix_status([501, 502, 503], [501, 900, 502, 503]), 'unsafe')
        self.assertEqual(_id_prefix_status([501, 502, 503], [501, 503]), 'unsafe')
        self.assertEqual(_id_prefix_status([501, 502, 503], [503, 502, 501]), 'unsafe')

    def test_cell_changes(self):
        changes, outside = diff_cells(
            {'0,0': {'raw_input': '100'}, '0,1': {'raw_input': '=A1*2'}},
            {'0,0': {'raw_input': '200'}, '1,0': {'raw_input': '9'}},
            2,
            2,
        )
        self.assertFalse(outside)
        self.assertEqual(changes['0,0'], {'raw_input': '200'})
        self.assertEqual(changes['0,1'], {'raw_input': None})
        self.assertEqual(changes['1,0'], {'raw_input': '9'})

        formula, _ = diff_cells(
            {'0,0': {'raw_input': '=A1*2'}},
            {'0,0': {'raw_input': '5'}},
            1,
            1,
        )
        self.assertEqual(formula['0,0'], {'raw_input': '5'})

        unchanged, _ = diff_cells(
            {'0,0': {'raw_input': '100'}},
            {'0,0': {'raw_input': '100'}},
            1,
            1,
        )
        self.assertEqual(unchanged, {})

        outside_changes, outside = diff_cells({}, {'3,0': {'raw_input': 'new'}}, 3, 2)
        self.assertTrue(outside)
        self.assertEqual(outside_changes, {})

    def test_format_returns_only_changed_fields(self):
        changes, outside = diff_formats(
            {'0,0': {'bold': False, 'font_size': 12, 'text_color': '#112233'}},
            {'0,0': {'bold': True, 'font_size': 12, 'text_color': None}},
            1,
            1,
        )
        self.assertFalse(outside)
        self.assertEqual(changes['0,0'], {'bold': True, 'text_color': None})

        same, _ = diff_formats({}, {'0,0': {'bold': False, 'font_size': None}}, 1, 1)
        self.assertEqual(same, {})

        number_change, _ = diff_formats(
            {'0,0': {'number_format': {'type': 'CURRENCY', 'currency_code': 'USD', 'decimal_places': 2}}},
            {'0,0': {'number_format': {'type': 'PERCENT', 'decimal_places': 0}}},
            1,
            1,
        )
        self.assertEqual(
            number_change['0,0']['number_format'],
            {'type': 'PERCENT', 'decimal_places': 0},
        )

    def test_cell_highlights(self):
        changes, outside = diff_cell_highlights(
            {'cells': {'0,0': '#111111', '0,1': '#222222'}},
            {'cells': {'0,0': '#111111', '0,1': '#333333', '1,0': '#444444'}},
            2,
            2,
        )
        self.assertFalse(outside)
        self.assertNotIn('0,0', changes)
        self.assertEqual(changes['0,1'], '#333333')
        self.assertEqual(changes['1,0'], '#444444')

        cleared, _ = diff_cell_highlights(
            {'cells': {'0,0': '#111111'}},
            {'cells': {}},
            1,
            1,
        )
        self.assertEqual(cleared['0,0'], None)

    def test_missing_and_bad_baseline(self):
        missing = diff_sheet(_source(None))
        self.assertEqual(missing['rebuild_reasons'], ['missing_baseline'])
        self.assertTrue(missing['requires_rebuild'])
        self.assertEqual(missing['cells'], {})

        bad = diff_sheet(_source({'version': 2}))
        self.assertEqual(bad['rebuild_reasons'], ['unsupported_baseline_version'])

    def test_live_sheet_no_edit_then_value_change(self):
        owner = create_test_user('diff-owner', 'diff-owner@example.com')
        organization = create_test_organization()
        project = create_test_project(organization, owner=owner)
        spreadsheet = create_test_spreadsheet(project)
        sheet = create_test_sheet(spreadsheet)
        row = SheetRow.objects.create(sheet=sheet, position=0)
        column = SheetColumn.objects.create(sheet=sheet, position=0, name='A')
        Cell.objects.create(sheet=sheet, row=row, column=column, raw_input='100')
        SpreadsheetCellFormat.objects.create(
            sheet=sheet, row_index=0, column_index=0, bold=False, font_size=12,
        )

        baseline = build_import_baseline(sheet)
        unchanged = diff_sheet(_source(baseline, sheet))
        self.assertFalse(unchanged['requires_rebuild'])
        self.assertFalse(unchanged['has_changes'])
        self.assertEqual(unchanged['cells'], {})

        cell = Cell.objects.get(sheet=sheet)
        cell.raw_input = '200'
        cell.save(update_fields=['raw_input'])
        changed = diff_sheet(_source(baseline, sheet))
        self.assertEqual(changed['cells']['0,0'], {'raw_input': '200'})
        self.assertTrue(changed['has_changes'])
        self.assertFalse(changed['requires_rebuild'])

    def test_row_highlight_forces_rebuild(self):
        owner = create_test_user('diff-owner-2', 'diff-owner-2@example.com')
        organization = create_test_organization()
        project = create_test_project(organization, owner=owner)
        spreadsheet = create_test_spreadsheet(project)
        sheet = create_test_sheet(spreadsheet)
        SheetRow.objects.create(sheet=sheet, position=0)
        SheetColumn.objects.create(sheet=sheet, position=0, name='A')
        highlight = SpreadsheetHighlight.objects.create(
            spreadsheet=spreadsheet,
            sheet=sheet,
            scope='ROW',
            row_index=0,
            col_index=0,
            color='#111111',
        )
        baseline = build_import_baseline(sheet)
        highlight.color = '#222222'
        highlight.save(update_fields=['color'])
        result = diff_sheet(_source(baseline, sheet))
        self.assertTrue(result['structure_safe'])
        self.assertTrue(result['requires_rebuild'])
        self.assertIn('row_highlight_changed', result['rebuild_reasons'])
        self.assertEqual(result['cells'], {})
        self.assertEqual(result['highlights']['cells'], {})

    def test_appended_cell_forces_rebuild(self):
        owner = create_test_user('diff-owner-3', 'diff-owner-3@example.com')
        organization = create_test_organization()
        project = create_test_project(organization, owner=owner)
        spreadsheet = create_test_spreadsheet(project)
        sheet = create_test_sheet(spreadsheet)
        row = SheetRow.objects.create(sheet=sheet, position=0)
        column = SheetColumn.objects.create(sheet=sheet, position=0, name='A')
        Cell.objects.create(sheet=sheet, row=row, column=column, raw_input='100')
        baseline = build_import_baseline(sheet)
        extra = SheetRow.objects.create(sheet=sheet, position=1)
        Cell.objects.create(sheet=sheet, row=extra, column=column, raw_input='new')
        result = diff_sheet(_source(baseline, sheet))
        self.assertTrue(result['structure_safe'])
        self.assertTrue(result['requires_rebuild'])
        self.assertIn('appended_region_change', result['rebuild_reasons'])
        self.assertEqual(result['cells'], {})