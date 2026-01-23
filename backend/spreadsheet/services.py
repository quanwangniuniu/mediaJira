"""
Business logic services for spreadsheet operations
Handles spreadsheet, sheet, row, column, and cell management
"""
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal, ROUND_HALF_UP
import re
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Q, Max

from .models import (
    Spreadsheet, Sheet, SheetRow, SheetColumn, Cell, CellValueType, ComputedCellType, CellDependency
)
from .formula_engine import evaluate_formula, extract_references, reference_to_indexes, FormulaError
from core.models import Project


class SpreadsheetService:
    """Service class for handling spreadsheet business logic"""
    
    @staticmethod
    @transaction.atomic
    def create_spreadsheet(project: Project, name: str) -> Spreadsheet:
        """
        Create a new spreadsheet
        
        Args:
            project: Project instance
            name: Spreadsheet name
            
        Returns:
            Created Spreadsheet instance
            
        Raises:
            ValidationError: If spreadsheet with same name already exists
        """
        # Check for duplicate name in the same project
        if Spreadsheet.objects.filter(
            project=project,
            name=name,
            is_deleted=False
        ).exists():
            raise ValidationError(
                f"Spreadsheet with name '{name}' already exists in this project"
            )
        
        spreadsheet = Spreadsheet.objects.create(
            project=project,
            name=name
        )
        
        return spreadsheet
    
    @staticmethod
    @transaction.atomic
    def update_spreadsheet(spreadsheet: Spreadsheet, name: str) -> Spreadsheet:
        """
        Update spreadsheet name
        
        Args:
            spreadsheet: Spreadsheet instance to update
            name: New name
            
        Returns:
            Updated Spreadsheet instance
            
        Raises:
            ValidationError: If spreadsheet with same name already exists
        """
        # Check for duplicate name (excluding current spreadsheet)
        if Spreadsheet.objects.filter(
            project=spreadsheet.project,
            name=name,
            is_deleted=False
        ).exclude(id=spreadsheet.id).exists():
            raise ValidationError(
                f"Spreadsheet with name '{name}' already exists in this project"
            )
        
        spreadsheet.name = name
        spreadsheet.save()
        
        return spreadsheet
    
    @staticmethod
    @transaction.atomic
    def delete_spreadsheet(spreadsheet: Spreadsheet) -> None:
        """
        Soft delete a spreadsheet
        
        Args:
            spreadsheet: Spreadsheet instance to delete
        """
        spreadsheet.is_deleted = True
        spreadsheet.save()


class SheetService:
    """Service class for handling sheet business logic"""
    
    @staticmethod
    def _get_next_sheet_position(spreadsheet: Spreadsheet) -> int:
        """
        Get the next available position for a new sheet
        
        Args:
            spreadsheet: Spreadsheet instance
            
        Returns:
            Next position (0-indexed)
        """
        max_position = Sheet.objects.filter(
            spreadsheet=spreadsheet
        ).aggregate(Max('position'))['position__max']
        
        return (max_position + 1) if max_position is not None else 0
    
    @staticmethod
    @transaction.atomic
    def create_sheet(spreadsheet: Spreadsheet, name: str) -> Sheet:
        """
        Create a new sheet with auto-assigned position
        
        Position is automatically assigned based on creation order (max position + 1).
        Clients cannot provide or update position.
        Uses row-level locking to ensure concurrency-safe position assignment.
        
        Args:
            spreadsheet: Spreadsheet instance
            name: Sheet name
            
        Returns:
            Created Sheet instance
            
        Raises:
            ValidationError: If sheet with same name already exists
        """
        # Lock the spreadsheet row for concurrency-safe position assignment
        locked_spreadsheet = Spreadsheet.objects.select_for_update().get(id=spreadsheet.id)
        
        # Always auto-assign position based on creation order (with lock held)
        position = SheetService._get_next_sheet_position(locked_spreadsheet)
        
        # Check for duplicate name
        if Sheet.objects.filter(
            spreadsheet=locked_spreadsheet,
            name=name,
            is_deleted=False
        ).exists():
            raise ValidationError(
                f"Sheet with name '{name}' already exists in this spreadsheet"
            )
        
        # Check for duplicate position (should not happen with lock, but safety check)
        if Sheet.objects.filter(
            spreadsheet=locked_spreadsheet,
            position=position,
            is_deleted=False
        ).exists():
            raise ValidationError(
                f"Sheet with position {position} already exists in this spreadsheet"
            )
        
        sheet = Sheet.objects.create(
            spreadsheet=locked_spreadsheet,
            name=name,
            position=position
        )
        
        return sheet
    
    @staticmethod
    @transaction.atomic
    def update_sheet(sheet: Sheet, name: str) -> Sheet:
        """
        Update sheet name (position cannot be updated)
        
        Args:
            sheet: Sheet instance to update
            name: New name
            
        Returns:
            Updated Sheet instance
            
        Raises:
            ValidationError: If sheet with same name already exists
        """
        # Check for duplicate name (excluding current sheet)
        if Sheet.objects.filter(
            spreadsheet=sheet.spreadsheet,
            name=name,
            is_deleted=False
        ).exclude(id=sheet.id).exists():
            raise ValidationError(
                f"Sheet with name '{name}' already exists in this spreadsheet"
            )
        
        sheet.name = name
        sheet.save()
        
        return sheet
    
    @staticmethod
    @transaction.atomic
    def delete_sheet(sheet: Sheet) -> None:
        """
        Soft delete a sheet
        
        Args:
            sheet: Sheet instance to delete
        """
        sheet.is_deleted = True
        sheet.save()
    
    @staticmethod
    def _generate_column_name(position: int) -> str:
        """
        Generate column name from position (A, B, C, ..., Z, AA, AB, ...)
        
        Args:
            position: Column position (0-indexed)
            
        Returns:
            Column name (e.g., 'A', 'B', 'AA')
        """
        result = ""
        position += 1  # Convert to 1-indexed for calculation
        while position > 0:
            position -= 1
            result = chr(ord('A') + (position % 26)) + result
            position //= 26
        return result
    
    @staticmethod
    @transaction.atomic
    def resize_sheet(
        sheet: Sheet,
        row_count: int,
        column_count: int
    ) -> Dict[str, int]:
        """
        Ensure sheet has at least the specified number of rows and columns.
        Creates missing rows and columns as needed.
        
        Args:
            sheet: Sheet instance
            row_count: Target number of rows (0-indexed, so row_count=10 means rows 0-9)
            column_count: Target number of columns (0-indexed, so column_count=5 means columns 0-4)
            
        Returns:
            Dict with rows_created, columns_created, total_rows, total_columns
        """
        if row_count < 0 or column_count < 0:
            raise ValidationError("row_count and column_count must be non-negative integers")
        
        # Get existing rows and columns
        # Include deleted rows in max position calculation to avoid reusing deleted positions
        # This matches the behavior of _get_next_sheet_position for sheets
        all_rows = set(
            SheetRow.objects.filter(
                sheet=sheet
            ).values_list('position', flat=True)
        )
        
        existing_rows = set(
            SheetRow.objects.filter(
                sheet=sheet,
                is_deleted=False
            ).values_list('position', flat=True)
        )
        
        existing_columns = set(
            SheetColumn.objects.filter(
                sheet=sheet,
                is_deleted=False
            ).values_list('position', flat=True)
        )
        
        # Calculate max positions including deleted (to avoid reusing deleted positions)
        max_row_position = max(all_rows) if all_rows else -1
        max_column_position = max(
            SheetColumn.objects.filter(sheet=sheet).values_list('position', flat=True)
        ) if SheetColumn.objects.filter(sheet=sheet).exists() else -1
        
        # Calculate rows and columns to create
        # row_count=10 means rows 0-9 (10 rows total), so we need range(row_count)
        # Important: Do NOT reuse deleted positions - always create at max_position + 1
        rows_to_create = []
        for position in range(row_count):
            # Only create if position is not in existing_rows (non-deleted)
            if position not in existing_rows:
                # Don't reuse deleted positions - if position exists in all_rows (deleted),
                # skip it and create at max_position + 1 instead
                if position in all_rows:
                    # Position was deleted, don't reuse - will be created at max_position + 1 later
                    continue
                # Position never existed, create it
                rows_to_create.append(position)
        
        # If we need more rows beyond max_position (due to deleted positions not being reused),
        # create new rows starting from max_position + 1
        target_total_active = row_count
        current_active_count = len(existing_rows)
        needed_new_positions = target_total_active - current_active_count - len(rows_to_create)
        
        if needed_new_positions > 0:
            # Create new rows starting from max_row_position + 1
            # Don't reuse deleted positions - always create at positions beyond max
            next_position = max_row_position + 1
            for i in range(needed_new_positions):
                new_pos = next_position + i
                # Ensure we don't add duplicates
                if new_pos not in rows_to_create:
                    rows_to_create.append(new_pos)
        
        columns_to_create = []
        for position in range(column_count):
            if position not in existing_columns:
                columns_to_create.append(position)
        
        # Create rows
        rows_created = 0
        for position in rows_to_create:
            SheetRow.objects.create(
                sheet=sheet,
                position=position
            )
            rows_created += 1
        
        # Create columns
        columns_created = 0
        for position in columns_to_create:
            SheetColumn.objects.create(
                sheet=sheet,
                name=SheetService._generate_column_name(position),
                position=position
            )
            columns_created += 1
        
        # Get total counts
        total_rows = SheetRow.objects.filter(
            sheet=sheet,
            is_deleted=False
        ).count()
        
        total_columns = SheetColumn.objects.filter(
            sheet=sheet,
            is_deleted=False
        ).count()
        
        return {
            'rows_created': rows_created,
            'columns_created': columns_created,
            'total_rows': total_rows,
            'total_columns': total_columns
        }


class CellService:
    """Service class for handling cell business logic"""

    _NUMERIC_RE = re.compile(r'^[+-]?(\d+(\.\d*)?|\.\d+)$')

    @staticmethod
    def _normalize_decimal(value: Decimal) -> Decimal:
        field = Cell._meta.get_field('computed_number')
        decimal_places = field.decimal_places
        quantizer = Decimal('1').scaleb(-decimal_places)
        return value.quantize(quantizer, rounding=ROUND_HALF_UP)

    @staticmethod
    def _update_dependencies(cell: Cell) -> None:
        CellDependency.objects.filter(from_cell=cell).update(is_deleted=True)

        raw_input = cell.raw_input or ''
        if not raw_input.startswith('='):
            return

        references = extract_references(raw_input)
        dependencies = []
        for ref in references:
            try:
                row_index, col_index = reference_to_indexes(ref)
            except FormulaError:
                continue

            row = CellService._get_or_create_row(cell.sheet, row_index)
            column = CellService._get_or_create_column(cell.sheet, col_index)
            to_cell, _ = Cell.objects.get_or_create(
                sheet=cell.sheet,
                row=row,
                column=column,
                defaults={
                    'is_deleted': False,
                    'value_type': CellValueType.EMPTY,
                    'raw_input': '',
                    'computed_type': ComputedCellType.EMPTY
                }
            )
            if to_cell.is_deleted:
                to_cell.is_deleted = False
                to_cell.save()

            dependencies.append(CellDependency(from_cell=cell, to_cell=to_cell))

        if dependencies:
            CellDependency.objects.bulk_create(dependencies, ignore_conflicts=True)

    @staticmethod
    def _collect_dependent_formula_cells(changed_cells: List[Cell]) -> List[Cell]:
        from collections import deque

        affected = {}
        queue = deque(changed_cells)

        while queue:
            current = queue.popleft()
            deps = CellDependency.objects.filter(
                to_cell=current,
                is_deleted=False
            ).select_related('from_cell')
            for dependency in deps:
                from_cell = dependency.from_cell
                if from_cell.is_deleted:
                    continue
                if from_cell.id not in affected:
                    affected[from_cell.id] = from_cell
                    queue.append(from_cell)

        return list(affected.values())

    @staticmethod
    def _recalculate_formula_cells(changed_cells: List[Cell]) -> List[Cell]:
        affected_cells = CellService._collect_dependent_formula_cells(changed_cells)
        changed_formula_cells = [
            cell for cell in changed_cells if (cell.raw_input or '').startswith('=')
        ]
        all_cells = {cell.id: cell for cell in affected_cells + changed_formula_cells}

        if not all_cells:
            return []

        affected_ids = set(all_cells.keys())
        dependencies = CellDependency.objects.filter(
            from_cell_id__in=affected_ids,
            to_cell_id__in=affected_ids,
            is_deleted=False
        )

        in_degree = {cell_id: 0 for cell_id in affected_ids}
        adjacency = {cell_id: [] for cell_id in affected_ids}

        for dependency in dependencies:
            from_id = dependency.from_cell_id
            to_id = dependency.to_cell_id
            in_degree[from_id] += 1
            adjacency[to_id].append(from_id)

        from collections import deque
        queue = deque([cell_id for cell_id, degree in in_degree.items() if degree == 0])
        ordered = []

        while queue:
            current_id = queue.popleft()
            ordered.append(current_id)
            for dependent_id in adjacency.get(current_id, []):
                in_degree[dependent_id] -= 1
                if in_degree[dependent_id] == 0:
                    queue.append(dependent_id)

        ordered_set = set(ordered)
        cycle_ids = affected_ids - ordered_set
        updated_cells = []

        for cell_id in ordered:
            cell = all_cells[cell_id]
            raw_input = cell.raw_input or ''
            if not raw_input.startswith('='):
                continue
            result = evaluate_formula(raw_input, cell.sheet)
            cell.computed_type = result.computed_type
            if result.computed_type == ComputedCellType.NUMBER and result.computed_number is not None:
                cell.computed_number = CellService._normalize_decimal(
                    Decimal(str(result.computed_number))
                )
            else:
                cell.computed_number = None
            cell.computed_string = result.computed_string
            cell.error_code = result.error_code
            cell.save()
            updated_cells.append(cell)

        for cell_id in cycle_ids:
            cell = all_cells[cell_id]
            cell.computed_type = ComputedCellType.ERROR
            cell.computed_number = None
            cell.computed_string = None
            cell.error_code = "#CYCLE!"
            cell.save()
            updated_cells.append(cell)

        return updated_cells

    @staticmethod
    def _clear_cell(cell: Cell) -> None:
        cell.is_deleted = True
        cell.value_type = CellValueType.EMPTY
        cell.string_value = None
        cell.number_value = None
        cell.boolean_value = None
        cell.formula_value = None
        cell.raw_input = ''
        cell.computed_type = ComputedCellType.EMPTY
        cell.computed_number = None
        cell.computed_string = None
        cell.error_code = None
        cell.save()
        CellDependency.objects.filter(from_cell=cell).update(is_deleted=True)

    @staticmethod
    def _apply_raw_input(cell: Cell, raw_input: Optional[str]) -> None:
        raw_input_value = raw_input or ''
        raw_input_stripped = raw_input_value.strip()

        cell.raw_input = raw_input_value
        cell.error_code = None
        cell.computed_number = None
        cell.computed_string = None
        cell.computed_type = ComputedCellType.EMPTY

        if raw_input_stripped == '':
            cell.value_type = CellValueType.EMPTY
            cell.string_value = None
            cell.number_value = None
            cell.boolean_value = None
            cell.formula_value = None
            return

        if raw_input_value.startswith('='):
            cell.value_type = CellValueType.FORMULA
            cell.string_value = None
            cell.number_value = None
            cell.boolean_value = None
            cell.formula_value = raw_input_value
            result = evaluate_formula(raw_input_value, cell.sheet)
            cell.computed_type = result.computed_type
            if result.computed_type == ComputedCellType.NUMBER and result.computed_number is not None:
                cell.computed_number = CellService._normalize_decimal(
                    Decimal(str(result.computed_number))
                )
            else:
                cell.computed_number = None
            cell.computed_string = result.computed_string
            cell.error_code = result.error_code
            return

        if CellService._NUMERIC_RE.match(raw_input_stripped):
            try:
                number_value = Decimal(raw_input_stripped)
            except Exception:
                number_value = None
            if number_value is not None:
                cell.value_type = CellValueType.NUMBER
                cell.string_value = None
                cell.number_value = number_value
                cell.boolean_value = None
                cell.formula_value = None
                cell.computed_type = ComputedCellType.NUMBER
                cell.computed_number = CellService._normalize_decimal(
                    Decimal(str(number_value))
                )
                return

        cell.value_type = CellValueType.STRING
        cell.string_value = raw_input_value
        cell.number_value = None
        cell.boolean_value = None
        cell.formula_value = None
        cell.computed_type = ComputedCellType.STRING
        cell.computed_string = raw_input_value

    @staticmethod
    def _apply_value_type(cell: Cell, value_type: str, op: Dict[str, Any]) -> None:
        cell.error_code = None
        cell.computed_number = None
        cell.computed_string = None
        cell.computed_type = ComputedCellType.EMPTY

        if value_type == CellValueType.STRING:
            raw_input = op.get('string_value') or ''
            cell.raw_input = raw_input
            cell.value_type = CellValueType.STRING
            cell.string_value = raw_input
            cell.number_value = None
            cell.boolean_value = None
            cell.formula_value = None
            cell.computed_type = ComputedCellType.STRING
            cell.computed_string = raw_input
            return

        if value_type == CellValueType.NUMBER:
            number_value = op.get('number_value')
            cell.raw_input = '' if number_value is None else str(number_value)
            cell.value_type = CellValueType.NUMBER
            cell.string_value = None
            cell.number_value = number_value
            cell.boolean_value = None
            cell.formula_value = None
            if number_value is not None:
                cell.computed_type = ComputedCellType.NUMBER
                cell.computed_number = CellService._normalize_decimal(
                    Decimal(str(number_value))
                )
            return

        if value_type == CellValueType.BOOLEAN:
            boolean_value = op.get('boolean_value')
            cell.raw_input = '' if boolean_value is None else ('TRUE' if boolean_value else 'FALSE')
            cell.value_type = CellValueType.BOOLEAN
            cell.string_value = None
            cell.number_value = None
            cell.boolean_value = boolean_value
            cell.formula_value = None
            if boolean_value is not None:
                cell.computed_type = ComputedCellType.STRING
                cell.computed_string = 'TRUE' if boolean_value else 'FALSE'
            return

        if value_type == CellValueType.FORMULA:
            formula = op.get('formula_value', '')
            cell.raw_input = formula
            cell.value_type = CellValueType.FORMULA
            cell.string_value = None
            cell.number_value = None
            cell.boolean_value = None
            cell.formula_value = formula
            result = evaluate_formula(formula, cell.sheet)
            cell.computed_type = result.computed_type
            if result.computed_type == ComputedCellType.NUMBER and result.computed_number is not None:
                cell.computed_number = CellService._normalize_decimal(
                    Decimal(str(result.computed_number))
                )
            else:
                cell.computed_number = None
            cell.computed_string = result.computed_string
            cell.error_code = result.error_code
            return

        cell.raw_input = ''
        cell.value_type = CellValueType.EMPTY
        cell.string_value = None
        cell.number_value = None
        cell.boolean_value = None
        cell.formula_value = None
    
    @staticmethod
    def _get_or_create_row(sheet: Sheet, position: int) -> SheetRow:
        """
        Get existing row or create a new one
        
        Args:
            sheet: Sheet instance
            position: Row position
            
        Returns:
            SheetRow instance
        """
        row, created = SheetRow.objects.get_or_create(
            sheet=sheet,
            position=position,
            defaults={'is_deleted': False}
        )
        
        if row.is_deleted:
            row.is_deleted = False
            row.save()
        
        return row
    
    @staticmethod
    def _get_or_create_column(sheet: Sheet, position: int) -> SheetColumn:
        """
        Get existing column or create a new one
        
        Args:
            sheet: Sheet instance
            position: Column position
            
        Returns:
            SheetColumn instance
        """
        column, created = SheetColumn.objects.get_or_create(
            sheet=sheet,
            position=position,
            defaults={
                'name': SheetService._generate_column_name(position),
                'is_deleted': False
            }
        )
        
        if column.is_deleted:
            column.is_deleted = False
            column.save()
        
        return column
    
    @staticmethod
    def read_cell_range(
        sheet: Sheet,
        start_row: int,
        end_row: int,
        start_column: int,
        end_column: int
    ) -> Dict[str, Any]:
        """
        Read cells within a specified range.
        Returns a sparse array containing only cells that have values.
        
        Args:
            sheet: Sheet instance
            start_row: Starting row position (inclusive)
            end_row: Ending row position (inclusive)
            start_column: Starting column position (inclusive)
            end_column: Ending column position (inclusive)
            
        Returns:
            Dict with cells array, row_count, and column_count
        """
        if start_row > end_row:
            raise ValidationError("start_row must be less than or equal to end_row")
        if start_column > end_column:
            raise ValidationError("start_column must be less than or equal to end_column")
        
        # Get rows and columns in range
        rows = SheetRow.objects.filter(
            sheet=sheet,
            position__gte=start_row,
            position__lte=end_row,
            is_deleted=False
        ).select_related('sheet')
        
        columns = SheetColumn.objects.filter(
            sheet=sheet,
            position__gte=start_column,
            position__lte=end_column,
            is_deleted=False
        ).select_related('sheet')
        
        # Get cells in range (only non-empty cells)
        # Use select_related to avoid N+1 queries when accessing sheet.id, row.id, column.id, row.position, column.position
        cells = Cell.objects.filter(
            sheet=sheet,
            row__position__gte=start_row,
            row__position__lte=end_row,
            column__position__gte=start_column,
            column__position__lte=end_column,
            is_deleted=False
        ).exclude(
            value_type=CellValueType.EMPTY
        ).select_related('sheet', 'row', 'column')
        
        return {
            'cells': list(cells),
            'row_count': end_row - start_row + 1,
            'column_count': end_column - start_column + 1
        }
    
    @staticmethod
    @transaction.atomic
    def batch_update_cells(
        sheet: Sheet,
        operations: List[Dict[str, Any]],
        auto_expand: bool = True
    ) -> Dict[str, Any]:
        """
        Perform multiple cell operations (set or clear) in a single atomic transaction.
        
        This method is Google Sheets-style atomic: if ANY operation fails, the entire batch
        is rolled back (all-or-nothing).
        
        Operation semantics:
        - 'clear': Soft-deletes existing cells (sets is_deleted=True) and wipes all content fields.
                  If row/column/cell does not exist, this is a NO-OP (preserves sparse storage).
                  Does NOT trigger auto-expand of rows/columns.
        - 'set': Creates or updates a cell with the specified value.
                 If value_type is EMPTY, treats as clear operation (soft-delete + wipe, no-op if cell doesn't exist,
                 no auto-expand of rows/columns).
                 Auto-expand of rows/columns only applies when value_type is NOT EMPTY and auto_expand=True.
        
        Args:
            sheet: Sheet instance
            operations: List of operation dicts with keys:
                - operation: 'set' or 'clear'
                - row: Row position
                - column: Column position
                - value_type: Required for 'set' operation (EMPTY is treated as clear)
                - string_value, number_value, boolean_value, formula_value: Value-specific fields
            auto_expand: Whether to automatically create missing rows/columns (only for 'set' operations with non-EMPTY value_type)
            
        Returns:
            Dict with updated, cleared, rows_expanded, columns_expanded
            
        Raises:
            ValidationError: If any operation is invalid. The error detail contains:
                - code: "INVALID_ARGUMENT"
                - details: List of error dicts with index, row, column, field, message
        """
        # PHASE 1: VALIDATION (no DB writes)
        # Validate all operations and collect errors
        validation_errors = []
        rows_to_create = set()
        columns_to_create = set()
        
        for index, op in enumerate(operations):
            # Validate required fields
            if 'operation' not in op:
                validation_errors.append({
                    'index': index,
                    'row': op.get('row'),
                    'column': op.get('column'),
                    'field': 'operation',
                    'message': 'operation is required'
                })
                continue
            
            operation = op['operation']
            if operation not in ['set', 'clear']:
                validation_errors.append({
                    'index': index,
                    'row': op.get('row'),
                    'column': op.get('column'),
                    'field': 'operation',
                    'message': f'operation must be "set" or "clear", got "{operation}"'
                })
                continue
            
            # Validate row and column positions
            if 'row' not in op:
                validation_errors.append({
                    'index': index,
                    'row': None,
                    'column': op.get('column'),
                    'field': 'row',
                    'message': 'row is required'
                })
                continue
            
            if 'column' not in op:
                validation_errors.append({
                    'index': index,
                    'row': op.get('row'),
                    'column': None,
                    'field': 'column',
                    'message': 'column is required'
                })
                continue
            
            row_pos = op['row']
            col_pos = op['column']
            
            if not isinstance(row_pos, int) or row_pos < 0:
                validation_errors.append({
                    'index': index,
                    'row': row_pos,
                    'column': col_pos,
                    'field': 'row',
                    'message': 'row must be a non-negative integer'
                })
                continue
            
            if not isinstance(col_pos, int) or col_pos < 0:
                validation_errors.append({
                    'index': index,
                    'row': row_pos,
                    'column': col_pos,
                    'field': 'column',
                    'message': 'column must be a non-negative integer'
                })
                continue
            
            # Validate 'set' operation requirements first
            # Auto-expand collection happens AFTER value_type validation
            if operation == 'set':
                raw_input = op.get('raw_input', None)
                raw_input_stripped = raw_input.strip() if isinstance(raw_input, str) else None
                if raw_input is not None:
                    if raw_input_stripped is None:
                        validation_errors.append({
                            'index': index,
                            'row': row_pos,
                            'column': col_pos,
                            'field': 'raw_input',
                            'message': 'raw_input must be a string'
                        })
                        continue

                    # Auto-expand collection only when raw_input is non-empty
                    if raw_input_stripped:
                        if not auto_expand:
                            row_exists = SheetRow.objects.filter(
                                sheet=sheet,
                                position=row_pos,
                                is_deleted=False
                            ).exists()

                            if not row_exists:
                                validation_errors.append({
                                    'index': index,
                                    'row': row_pos,
                                    'column': col_pos,
                                    'field': 'row',
                                    'message': f'Row {row_pos} does not exist and auto_expand is disabled'
                                })
                                continue

                            col_exists = SheetColumn.objects.filter(
                                sheet=sheet,
                                position=col_pos,
                                is_deleted=False
                            ).exists()

                            if not col_exists:
                                validation_errors.append({
                                    'index': index,
                                    'row': row_pos,
                                    'column': col_pos,
                                    'field': 'column',
                                    'message': f'Column {col_pos} does not exist and auto_expand is disabled'
                                })
                                continue
                        else:
                            rows_to_create.add(row_pos)
                            columns_to_create.add(col_pos)
                    continue

                if 'value_type' not in op:
                    validation_errors.append({
                        'index': index,
                        'row': row_pos,
                        'column': col_pos,
                        'field': 'value_type',
                        'message': 'value_type is required when operation is "set"'
                    })
                    continue
                
                value_type = op['value_type']
                if value_type not in [choice[0] for choice in CellValueType.choices]:
                    validation_errors.append({
                        'index': index,
                        'row': row_pos,
                        'column': col_pos,
                        'field': 'value_type',
                        'message': f'Invalid value_type: {value_type}'
                    })
                    continue
                
                # Validate value_type-specific fields
                if value_type == CellValueType.STRING:
                    if 'string_value' not in op:
                        validation_errors.append({
                            'index': index,
                            'row': row_pos,
                            'column': col_pos,
                            'field': 'string_value',
                            'message': 'string_value is required when value_type is "string"'
                        })
                
                elif value_type == CellValueType.NUMBER:
                    if 'number_value' not in op or op.get('number_value') is None:
                        validation_errors.append({
                            'index': index,
                            'row': row_pos,
                            'column': col_pos,
                            'field': 'number_value',
                            'message': 'number_value is required when value_type is "number"'
                        })
                
                elif value_type == CellValueType.BOOLEAN:
                    if 'boolean_value' not in op or op.get('boolean_value') is None:
                        validation_errors.append({
                            'index': index,
                            'row': row_pos,
                            'column': col_pos,
                            'field': 'boolean_value',
                            'message': 'boolean_value is required when value_type is "boolean"'
                        })
                
                elif value_type == CellValueType.FORMULA:
                    formula = op.get('formula_value', '')
                    if not formula:
                        validation_errors.append({
                            'index': index,
                            'row': row_pos,
                            'column': col_pos,
                            'field': 'formula_value',
                            'message': 'formula_value is required when value_type is "formula"'
                        })
                    elif not formula.startswith('='):
                        validation_errors.append({
                            'index': index,
                            'row': row_pos,
                            'column': col_pos,
                            'field': 'formula_value',
                            'message': 'formula_value must start with "="'
                        })
                
                # Auto-expand collection: only AFTER value_type is validated and confirmed != EMPTY
                # set+EMPTY must never trigger expansion (treated as clear)
                if value_type != CellValueType.EMPTY:
                    # Check if row/column exists (for non-auto-expand mode)
                    if not auto_expand:
                        row_exists = SheetRow.objects.filter(
                            sheet=sheet,
                            position=row_pos,
                            is_deleted=False
                        ).exists()
                        
                        if not row_exists:
                            validation_errors.append({
                                'index': index,
                                'row': row_pos,
                                'column': col_pos,
                                'field': 'row',
                                'message': f'Row {row_pos} does not exist and auto_expand is disabled'
                            })
                            continue
                        
                        col_exists = SheetColumn.objects.filter(
                            sheet=sheet,
                            position=col_pos,
                            is_deleted=False
                        ).exists()
                        
                        if not col_exists:
                            validation_errors.append({
                                'index': index,
                                'row': row_pos,
                                'column': col_pos,
                                'field': 'column',
                                'message': f'Column {col_pos} does not exist and auto_expand is disabled'
                            })
                            continue
                    else:
                        # Track rows/columns to create (only for validated non-EMPTY 'set' operations)
                        rows_to_create.add(row_pos)
                        columns_to_create.add(col_pos)
        
        # If validation errors exist, raise before any DB writes (triggers rollback)
        if validation_errors:
            raise ValidationError({
                'code': 'INVALID_ARGUMENT',
                'details': validation_errors
            })
        
        # PHASE 2: EXECUTION (all operations in single transaction)
        # Create missing rows and columns
        rows_expanded = 0
        columns_expanded = 0
        
        for row_pos in rows_to_create:
            # Use get_or_create return value to determine if row was created
            # This is concurrency-safe: if another transaction creates the row first,
            # get_or_create will return the existing row with created=False
            row, created = SheetRow.objects.get_or_create(
                sheet=sheet,
                position=row_pos,
                defaults={'is_deleted': False}
            )
            # Restore deleted row if needed
            if row.is_deleted:
                row.is_deleted = False
                row.save()
                rows_expanded += 1
            elif created:
                # New row was created
                rows_expanded += 1
        
        for col_pos in columns_to_create:
            # Use get_or_create return value to determine if column was created
            # This is concurrency-safe: if another transaction creates the column first,
            # get_or_create will return the existing column with created=False
            column, created = SheetColumn.objects.get_or_create(
                sheet=sheet,
                position=col_pos,
                defaults={
                    'name': SheetService._generate_column_name(col_pos),
                    'is_deleted': False
                }
            )
            # Restore deleted column if needed
            if column.is_deleted:
                column.is_deleted = False
                column.save()
                columns_expanded += 1
            elif created:
                # New column was created
                columns_expanded += 1
        
        # Execute all operations (no exception handling - let exceptions propagate)
        # Optimize by prefetching rows/columns that will be accessed
        # Collect all unique row/column positions from operations
        row_positions = set()
        column_positions = set()
        for op in operations:
            row_positions.add(op['row'])
            column_positions.add(op['column'])
        
        # Prefetch all rows/columns that might be needed (for non-set operations)
        # For set operations, we'll use _get_or_create which handles caching
        existing_rows = {
            row.position: row
            for row in SheetRow.objects.filter(
                sheet=sheet,
                position__in=row_positions,
                is_deleted=False
            ).select_related('sheet')
        }
        existing_columns = {
            col.position: col
            for col in SheetColumn.objects.filter(
                sheet=sheet,
                position__in=column_positions,
                is_deleted=False
            ).select_related('sheet')
        }
        
        # Bulk prefetch cells for clear operations to avoid N+1 queries
        # Collect (row, column) pairs for clear operations (including set+EMPTY)
        cell_keys_for_clear = []
        for op in operations:
            row_pos = op['row']
            col_pos = op['column']
            operation = op['operation']
            
            # Collect keys for clear and set+EMPTY operations
            if operation == 'clear':
                row = existing_rows.get(row_pos)
                column = existing_columns.get(col_pos)
                if row is not None and column is not None:
                    cell_keys_for_clear.append((row, column))
            elif operation == 'set' and op.get('value_type') == CellValueType.EMPTY:
                row = existing_rows.get(row_pos)
                column = existing_columns.get(col_pos)
                if row is not None and column is not None:
                    cell_keys_for_clear.append((row, column))
            elif operation == 'set' and op.get('raw_input') is not None:
                raw_input = op.get('raw_input', '')
                if isinstance(raw_input, str) and raw_input.strip() == '':
                    row = existing_rows.get(row_pos)
                    column = existing_columns.get(col_pos)
                    if row is not None and column is not None:
                        cell_keys_for_clear.append((row, column))
        
        # Bulk query cells for clear operations using Q objects for precise filtering
        # This avoids N+1 queries while only fetching cells we actually need
        existing_cells = {}
        if cell_keys_for_clear:
            # Build Q object for each (row, column) pair
            q_objects = Q()
            for row, column in cell_keys_for_clear:
                q_objects |= Q(row=row, column=column)
            
            cells = Cell.objects.filter(
                sheet=sheet,
                is_deleted=False
            ).filter(q_objects).select_related('row', 'column')
            
            # Create lookup dict: (row_id, column_id) -> cell
            for cell in cells:
                existing_cells[(cell.row_id, cell.column_id)] = cell
        
        updated = 0
        cleared = 0
        updated_cells: Dict[int, Cell] = {}
        
        for op in operations:
            row_pos = op['row']
            col_pos = op['column']
            operation = op['operation']
            
            if operation == 'clear':
                # Clear: soft-delete + wipe content fields, NO-OP if cell doesn't exist
                # Do NOT auto-expand rows/columns for clear operations
                # Use prefetched rows/columns
                row = existing_rows.get(row_pos)
                column = existing_columns.get(col_pos)
                
                # If row/column don't exist, clear is a NO-OP (preserves sparse storage)
                if row is None or column is None:
                    continue
                
                # Use bulk-prefetched cell
                cell = existing_cells.get((row.id, column.id))
                
                if cell is not None:
                    CellService._clear_cell(cell)
                    cleared += 1
                    updated_cells[cell.id] = cell
                # If cell doesn't exist, this is a NO-OP (preserves sparse storage)
            
            elif operation == 'set':
                raw_input = op.get('raw_input', None)
                if raw_input is not None:
                    raw_input_stripped = raw_input.strip() if isinstance(raw_input, str) else ''
                    if raw_input_stripped == '':
                        # Treat empty raw_input as clear
                        row = existing_rows.get(row_pos)
                        column = existing_columns.get(col_pos)
                        if row is None or column is None:
                            continue
                        cell = existing_cells.get((row.id, column.id))
                        if cell is not None:
                            CellService._clear_cell(cell)
                            cleared += 1
                            updated_cells[cell.id] = cell
                        continue

                    # Regular set operation: ensure row/column exist (auto-expand if needed)
                    row = existing_rows.get(row_pos)
                    if row is None:
                        row = CellService._get_or_create_row(sheet, row_pos)
                        existing_rows[row_pos] = row

                    column = existing_columns.get(col_pos)
                    if column is None:
                        column = CellService._get_or_create_column(sheet, col_pos)
                        existing_columns[col_pos] = column

                    cell, created = Cell.objects.get_or_create(
                        sheet=sheet,
                        row=row,
                        column=column,
                        defaults={'is_deleted': False}
                    )

                    if cell.is_deleted:
                        cell.is_deleted = False

                    CellService._apply_raw_input(cell, raw_input)
                    cell.save()
                    CellService._update_dependencies(cell)
                    updated += 1
                    updated_cells[cell.id] = cell
                    continue

                value_type = op['value_type']
                
                # Treat set+EMPTY as clear operation (same semantics as 'clear')
                if value_type == CellValueType.EMPTY:
                    # Clear behavior: soft-delete + wipe, NO-OP if cell doesn't exist
                    # Do NOT create/restore rows/columns for set+EMPTY (same as clear)
                    # Use prefetched rows/columns
                    row = existing_rows.get(row_pos)
                    column = existing_columns.get(col_pos)
                    
                    # If row/column don't exist, this is a NO-OP (preserves sparse storage)
                    if row is None or column is None:
                        continue
                    
                    # Use bulk-prefetched cell
                    cell = existing_cells.get((row.id, column.id))
                    
                    if cell is not None:
                        CellService._clear_cell(cell)
                        cleared += 1
                        updated_cells[cell.id] = cell
                    # If cell doesn't exist, this is a NO-OP (preserves sparse storage)
                else:
                    # Regular set operation: ensure row/column exist (auto-expand if needed)
                    # Check prefetched first, then use get_or_create
                    row = existing_rows.get(row_pos)
                    if row is None:
                        row = CellService._get_or_create_row(sheet, row_pos)
                        existing_rows[row_pos] = row  # Cache for potential reuse
                    
                    column = existing_columns.get(col_pos)
                    if column is None:
                        column = CellService._get_or_create_column(sheet, col_pos)
                        existing_columns[col_pos] = column  # Cache for potential reuse
                    
                    # Regular set operation: create or update cell
                    cell, created = Cell.objects.get_or_create(
                        sheet=sheet,
                        row=row,
                        column=column,
                        defaults={'is_deleted': False}
                    )
                    
                    if cell.is_deleted:
                        cell.is_deleted = False
                    
                    cell.value_type = value_type
                    CellService._apply_value_type(cell, value_type, op)
                    
                    # All validation was done in Phase 1, safe to save
                    cell.save()
                    CellService._update_dependencies(cell)
                    updated += 1
                    updated_cells[cell.id] = cell
        
        recalculated_cells = CellService._recalculate_formula_cells(list(updated_cells.values()))
        for cell in recalculated_cells:
            updated_cells[cell.id] = cell

        return {
            'updated': updated,
            'cleared': cleared,
            'rows_expanded': rows_expanded,
            'columns_expanded': columns_expanded,
            'cells': list(updated_cells.values())
        }

