from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from core.models import Organization, Project
from spreadsheet.models import Cell, ComputedCellType, Sheet, SheetColumn, SheetRow, Spreadsheet
from spreadsheet.services import CellService, SheetService

User = get_user_model()


def create_test_user(username='testuser', email='test@example.com'):
    return User.objects.create_user(
        username=username,
        email=email,
        password='testpass123'
    )


def create_test_organization(name='Test Organization'):
    return Organization.objects.create(name=name)


def create_test_project(organization, name='Test Project', owner=None):
    return Project.objects.create(
        name=name,
        organization=organization,
        owner=owner
    )


class FormulaEngineTest(TestCase):
    def setUp(self):
        self.user = create_test_user()
        self.organization = create_test_organization()
        self.project = create_test_project(self.organization, owner=self.user)
        self.spreadsheet = Spreadsheet.objects.create(project=self.project, name='Test Spreadsheet')
        self.sheet = Sheet.objects.create(spreadsheet=self.spreadsheet, name='Sheet1', position=0)

        self.row1 = SheetRow.objects.create(sheet=self.sheet, position=0)
        self.row2 = SheetRow.objects.create(sheet=self.sheet, position=1)
        self.col_a = SheetColumn.objects.create(
            sheet=self.sheet,
            position=0,
            name=SheetService._generate_column_name(0)
        )
        self.col_b = SheetColumn.objects.create(
            sheet=self.sheet,
            position=1,
            name=SheetService._generate_column_name(1)
        )
        self.col_c = SheetColumn.objects.create(
            sheet=self.sheet,
            position=2,
            name=SheetService._generate_column_name(2)
        )
        self.col_d = SheetColumn.objects.create(
            sheet=self.sheet,
            position=3,
            name=SheetService._generate_column_name(3)
        )

    def test_formula_division(self):
        operations = [
            {'operation': 'set', 'row': 1, 'column': 1, 'raw_input': '10'},
            {'operation': 'set', 'row': 1, 'column': 2, 'raw_input': '2'},
            {'operation': 'set', 'row': 1, 'column': 3, 'raw_input': '=B2/C2'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row2, column=self.col_d)
        self.assertEqual(cell.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell.computed_number, Decimal('5'))

    def test_formula_multiplication_literal(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': '=2*3'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_a)
        self.assertEqual(cell.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell.computed_number, Decimal('6'))

    def test_formula_precision_quantized(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': '=0.1*0.2'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_a)
        self.assertEqual(cell.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell.computed_number, Decimal('0.02'))

    def test_formula_multiplication_reference(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': '5'},
            {'operation': 'set', 'row': 0, 'column': 1, 'raw_input': '=A1*2'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_b)
        self.assertEqual(cell.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell.computed_number, Decimal('10'))

    def test_formula_divide_by_zero(self):
        operations = [
            {'operation': 'set', 'row': 1, 'column': 1, 'raw_input': '10'},
            {'operation': 'set', 'row': 1, 'column': 2, 'raw_input': '0'},
            {'operation': 'set', 'row': 1, 'column': 3, 'raw_input': '=B2/C2'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row2, column=self.col_d)
        self.assertEqual(cell.computed_type, ComputedCellType.ERROR)
        self.assertEqual(cell.error_code, '#DIV/0!')

    def test_formula_invalid_reference(self):
        operations = [
            {'operation': 'set', 'row': 1, 'column': 3, 'raw_input': '=ZZ999999'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row2, column=self.col_d)
        self.assertEqual(cell.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell.error_code, None)
        self.assertEqual(cell.computed_number, Decimal('0'))

    def test_formula_invalid_operand_does_not_500(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': 'abc'},
            {'operation': 'set', 'row': 0, 'column': 1, 'raw_input': '=A1*2'},
        ]

        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_b)
        self.assertEqual(cell.computed_type, ComputedCellType.ERROR)
        self.assertEqual(cell.error_code, '#VALUE!')

    def test_comparison_and_if_basic(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': '=1=1'},
            {'operation': 'set', 'row': 1, 'column': 0, 'raw_input': '6'},
            {'operation': 'set', 'row': 1, 'column': 1, 'raw_input': '=A2*2>10'},
            {'operation': 'set', 'row': 2, 'column': 0, 'raw_input': '1'},
            {'operation': 'set', 'row': 2, 'column': 1, 'raw_input': '2'},
            {'operation': 'set', 'row': 2, 'column': 2, 'raw_input': '=A3<>B3'},
        ]
        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell_a1 = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_a)
        self.assertEqual(cell_a1.computed_type, ComputedCellType.BOOLEAN)
        self.assertEqual(cell_a1.computed_string, 'TRUE')

        cell_b2 = Cell.objects.get(sheet=self.sheet, row=self.row2, column=self.col_b)
        self.assertEqual(cell_b2.computed_type, ComputedCellType.BOOLEAN)
        self.assertEqual(cell_b2.computed_string, 'TRUE')

        cell_c3 = Cell.objects.get(sheet=self.sheet, row__position=2, column=self.col_c)
        self.assertEqual(cell_c3.computed_type, ComputedCellType.BOOLEAN)
        self.assertEqual(cell_c3.computed_string, 'TRUE')

    def test_if_short_circuit_and_strings(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': 'abc'},
            {'operation': 'set', 'row': 0, 'column': 1, 'raw_input': '=A1/0'},
            {'operation': 'set', 'row': 0, 'column': 2, 'raw_input': '=IF(A1="abc",1,0)'},
            {'operation': 'set', 'row': 0, 'column': 3, 'raw_input': '=IF(1=0,B1,2)'},
            {'operation': 'set', 'row': 1, 'column': 0, 'raw_input': ''},
            {'operation': 'set', 'row': 1, 'column': 1, 'raw_input': '=IF(A2,1,2)'},
        ]
        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell_c1 = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_c)
        self.assertEqual(cell_c1.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell_c1.computed_number, Decimal('1'))

        cell_d1 = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_d)
        self.assertEqual(cell_d1.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell_d1.computed_number, Decimal('2'))

        row2 = SheetRow.objects.get(sheet=self.sheet, position=1)
        cell_b2 = Cell.objects.get(sheet=self.sheet, row=row2, column=self.col_b)
        self.assertEqual(cell_b2.computed_type, ComputedCellType.NUMBER)
        self.assertEqual(cell_b2.computed_number, Decimal('2'))

    def test_string_comparison_invalid_operator(self):
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': 'abc'},
            {'operation': 'set', 'row': 0, 'column': 1, 'raw_input': '=A1>"a"'},
        ]
        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell_b1 = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_b)
        self.assertEqual(cell_b1.computed_type, ComputedCellType.ERROR)
        self.assertEqual(cell_b1.error_code, '#VALUE!')

    def test_long_decimal_comparison(self):
        long_decimal = '9.7654322457898765'
        operations = [
            {'operation': 'set', 'row': 0, 'column': 0, 'raw_input': long_decimal},
            {'operation': 'set', 'row': 0, 'column': 1, 'raw_input': f'=A1={long_decimal}'},
        ]
        CellService.batch_update_cells(self.sheet, operations, auto_expand=True)

        cell_b1 = Cell.objects.get(sheet=self.sheet, row=self.row1, column=self.col_b)
        self.assertEqual(cell_b1.computed_type, ComputedCellType.BOOLEAN)
        self.assertEqual(cell_b1.computed_string, 'TRUE')

