"""
Business logic services for spreadsheet operations
Handles spreadsheet, sheet, row, column, and cell management
"""
from typing import Dict, List, Any, Optional, Tuple
from decimal import Decimal, InvalidOperation
import logging
import re
from django.db import transaction
from django.core.exceptions import ValidationError
from django.db.models import Q, Max, F

from .models import (
    Spreadsheet, Sheet, SheetRow, SheetColumn, Cell, CellValueType, ComputedCellType, CellDependency,
    SheetStructureOperation, WorkflowPattern, WorkflowPatternStep
)
from .formula_engine import evaluate_formula, extract_references, reference_to_indexes, FormulaError
from .formula_rewrite import rewrite_cells_for_operation
from core.models import Project

logger = logging.getLogger(__name__)

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

    @staticmethod
    @transaction.atomic
    def insert_rows(
        sheet: Sheet,
        position: int,
        count: int = 1,
        created_by: Optional[Any] = None
    ) -> Dict[str, int]:
        """
        Insert rows at a given position by shifting existing row positions.
        Does NOT touch Cell records; rows are inserted by position only.
        """
        if count < 1:
            raise ValidationError("count must be a positive integer")

        current_count = SheetRow.objects.filter(sheet=sheet, is_deleted=False).count()
        if position < 0 or position > current_count:
            raise ValidationError("position must be between 0 and current row count")

        shift_qs = SheetRow.objects.filter(
            sheet=sheet,
            is_deleted=False,
            position__gte=position
        )

        offset = 1_000_000
        if shift_qs.exists():
            # Phase 1: move shifted rows out of the way to avoid unique collisions
            shift_qs.update(position=F('position') + offset)

        # Create new rows at insert positions
        new_rows = [
            SheetRow(sheet=sheet, position=position + i)
            for i in range(count)
        ]
        created_rows = SheetRow.objects.bulk_create(new_rows)

        if shift_qs.exists():
            # Phase 2: move shifted rows back into their final positions
            SheetRow.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=position + offset
            ).update(position=F('position') - offset + count)

        operation = SheetStructureOperation.objects.create(
            sheet=sheet,
            op_type=SheetStructureOperation.OperationType.ROW_INSERT,
            anchor_position=position,
            count=count,
            affected_ids=[row.id for row in created_rows],
            affected_positions={},
            created_by=created_by
        )
        rewritten_cells = rewrite_cells_for_operation(sheet.id, 'ROW_INSERT', position, count)
        for cell in rewritten_cells:
            CellService._update_dependencies(cell)
        CellService._recalculate_formula_cells(rewritten_cells)

        return {
            'rows_created': count,
            'total_rows': current_count + count,
            'operation_id': operation.id
        }

    @staticmethod
    @transaction.atomic
    def insert_columns(
        sheet: Sheet,
        position: int,
        count: int = 1,
        created_by: Optional[Any] = None
    ) -> Dict[str, int]:
        """
        Insert columns at a given position by shifting existing column positions.
        Does NOT touch Cell records; columns are inserted by position only.
        """
        if count < 1:
            raise ValidationError("count must be a positive integer")

        current_count = SheetColumn.objects.filter(sheet=sheet, is_deleted=False).count()
        if position < 0 or position > current_count:
            raise ValidationError("position must be between 0 and current column count")

        shift_qs = SheetColumn.objects.filter(
            sheet=sheet,
            is_deleted=False,
            position__gte=position
        )

        offset = 1_000_000
        if shift_qs.exists():
            # Phase 1: move shifted columns out of the way to avoid unique collisions
            shift_qs.update(position=F('position') + offset)

        new_columns = [
            SheetColumn(
                sheet=sheet,
                position=position + i,
                name=SheetService._generate_column_name(position + i)
            )
            for i in range(count)
        ]
        created_columns = SheetColumn.objects.bulk_create(new_columns)

        if shift_qs.exists():
            # Phase 2: move shifted columns back into their final positions
            SheetColumn.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=position + offset
            ).update(position=F('position') - offset + count)

        operation = SheetStructureOperation.objects.create(
            sheet=sheet,
            op_type=SheetStructureOperation.OperationType.COL_INSERT,
            anchor_position=position,
            count=count,
            affected_ids=[column.id for column in created_columns],
            affected_positions={},
            created_by=created_by
        )
        rewritten_cells = rewrite_cells_for_operation(sheet.id, 'COL_INSERT', position, count)
        for cell in rewritten_cells:
            CellService._update_dependencies(cell)
        CellService._recalculate_formula_cells(rewritten_cells)

        return {
            'columns_created': count,
            'total_columns': current_count + count,
            'operation_id': operation.id
        }

    @staticmethod
    @transaction.atomic
    def delete_rows(
        sheet: Sheet,
        position: int,
        count: int = 1,
        created_by: Optional[Any] = None
    ) -> Dict[str, int]:
        """
        Delete rows at a given position by soft-deleting rows and shifting positions.
        Does NOT touch Cell records.
        """
        if count < 1:
            raise ValidationError("count must be a positive integer")

        active_qs = SheetRow.objects.filter(sheet=sheet, is_deleted=False)
        current_count = active_qs.count()
        if position < 0 or position + count > current_count:
            raise ValidationError("position range must be within current row count")

        target_rows = list(
            active_qs.filter(position__gte=position, position__lt=position + count)
            .order_by('position')
        )
        if len(target_rows) != count:
            raise ValidationError("row range is not contiguous or does not exist")

        affected_ids = [row.id for row in target_rows]
        affected_positions = {str(row.id): row.position for row in target_rows}

        # Soft delete target rows
        SheetRow.objects.filter(id__in=affected_ids).update(is_deleted=True)

        # Shift remaining rows down to fill the gap
        shift_qs = SheetRow.objects.filter(
            sheet=sheet,
            is_deleted=False,
            position__gte=position + count
        )
        offset = 1_000_000
        if shift_qs.exists():
            # Phase 1: move shifted rows out of the way
            shift_qs.update(position=F('position') + offset)
            # Phase 2: move to final positions
            SheetRow.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=position + count + offset
            ).update(position=F('position') - offset - count)

        operation = SheetStructureOperation.objects.create(
            sheet=sheet,
            op_type=SheetStructureOperation.OperationType.ROW_DELETE,
            anchor_position=position,
            count=count,
            affected_ids=affected_ids,
            affected_positions=affected_positions,
            created_by=created_by
        )
        rewritten_cells = rewrite_cells_for_operation(sheet.id, 'ROW_DELETE', position, count)
        for cell in rewritten_cells:
            CellService._update_dependencies(cell)
        CellService._recalculate_formula_cells(rewritten_cells)

        return {
            'rows_deleted': count,
            'total_rows': current_count - count,
            'operation_id': operation.id
        }

    @staticmethod
    @transaction.atomic
    def delete_columns(
        sheet: Sheet,
        position: int,
        count: int = 1,
        created_by: Optional[Any] = None
    ) -> Dict[str, int]:
        """
        Delete columns at a given position by soft-deleting columns and shifting positions.
        Does NOT touch Cell records.
        """
        if count < 1:
            raise ValidationError("count must be a positive integer")

        active_qs = SheetColumn.objects.filter(sheet=sheet, is_deleted=False)
        current_count = active_qs.count()
        if position < 0 or position + count > current_count:
            raise ValidationError("position range must be within current column count")

        target_columns = list(
            active_qs.filter(position__gte=position, position__lt=position + count)
            .order_by('position')
        )
        if len(target_columns) != count:
            raise ValidationError("column range is not contiguous or does not exist")

        affected_ids = [column.id for column in target_columns]
        affected_positions = {str(column.id): column.position for column in target_columns}

        # Soft delete target columns
        SheetColumn.objects.filter(id__in=affected_ids).update(is_deleted=True)

        # Shift remaining columns left to fill the gap
        shift_qs = SheetColumn.objects.filter(
            sheet=sheet,
            is_deleted=False,
            position__gte=position + count
        )
        offset = 1_000_000
        if shift_qs.exists():
            # Phase 1: move shifted columns out of the way
            shift_qs.update(position=F('position') + offset)
            # Phase 2: move to final positions
            SheetColumn.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=position + count + offset
            ).update(position=F('position') - offset - count)

        operation = SheetStructureOperation.objects.create(
            sheet=sheet,
            op_type=SheetStructureOperation.OperationType.COL_DELETE,
            anchor_position=position,
            count=count,
            affected_ids=affected_ids,
            affected_positions=affected_positions,
            created_by=created_by
        )
        rewritten_cells = rewrite_cells_for_operation(sheet.id, 'COL_DELETE', position, count)
        for cell in rewritten_cells:
            CellService._update_dependencies(cell)
        CellService._recalculate_formula_cells(rewritten_cells)

        return {
            'columns_deleted': count,
            'total_columns': current_count - count,
            'operation_id': operation.id
        }

    @staticmethod
    @transaction.atomic
    def revert_structure_operation(
        sheet: Sheet,
        operation: SheetStructureOperation
    ) -> Dict[str, int]:
        """
        Revert a previously logged structure operation.
        """
        if operation.is_reverted:
            raise ValidationError("operation has already been reverted")
        if operation.sheet_id != sheet.id:
            raise ValidationError("operation does not belong to this sheet")

        offset = 1_000_000

        if operation.op_type == SheetStructureOperation.OperationType.ROW_INSERT:
            # Soft delete inserted rows and shift back
            SheetRow.objects.filter(id__in=operation.affected_ids).update(is_deleted=True)
            shift_qs = SheetRow.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=operation.anchor_position + operation.count
            )
            if shift_qs.exists():
                shift_qs.update(position=F('position') + offset)
                SheetRow.objects.filter(
                    sheet=sheet,
                    is_deleted=False,
                    position__gte=operation.anchor_position + operation.count + offset
                ).update(position=F('position') - offset - operation.count)
            rewritten_cells = rewrite_cells_for_operation(sheet.id, 'ROW_DELETE', operation.anchor_position, operation.count)
            for cell in rewritten_cells:
                CellService._update_dependencies(cell)
            CellService._recalculate_formula_cells(rewritten_cells)

        elif operation.op_type == SheetStructureOperation.OperationType.COL_INSERT:
            SheetColumn.objects.filter(id__in=operation.affected_ids).update(is_deleted=True)
            shift_qs = SheetColumn.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=operation.anchor_position + operation.count
            )
            if shift_qs.exists():
                shift_qs.update(position=F('position') + offset)
                SheetColumn.objects.filter(
                    sheet=sheet,
                    is_deleted=False,
                    position__gte=operation.anchor_position + operation.count + offset
                ).update(position=F('position') - offset - operation.count)
            rewritten_cells = rewrite_cells_for_operation(sheet.id, 'COL_DELETE', operation.anchor_position, operation.count)
            for cell in rewritten_cells:
                CellService._update_dependencies(cell)
            CellService._recalculate_formula_cells(rewritten_cells)

        elif operation.op_type == SheetStructureOperation.OperationType.ROW_DELETE:
            # Shift rows down to make space, then restore deleted rows to original positions
            shift_qs = SheetRow.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=operation.anchor_position
            )
            if shift_qs.exists():
                shift_qs.update(position=F('position') + offset)
                SheetRow.objects.filter(
                    sheet=sheet,
                    is_deleted=False,
                    position__gte=operation.anchor_position + offset
                ).update(position=F('position') - offset + operation.count)

            for row_id, position in operation.affected_positions.items():
                SheetRow.objects.filter(id=int(row_id)).update(
                    is_deleted=False,
                    position=position
                )
            rewritten_cells = rewrite_cells_for_operation(sheet.id, 'ROW_INSERT', operation.anchor_position, operation.count)
            for cell in rewritten_cells:
                CellService._update_dependencies(cell)
            CellService._recalculate_formula_cells(rewritten_cells)

        elif operation.op_type == SheetStructureOperation.OperationType.COL_DELETE:
            shift_qs = SheetColumn.objects.filter(
                sheet=sheet,
                is_deleted=False,
                position__gte=operation.anchor_position
            )
            if shift_qs.exists():
                shift_qs.update(position=F('position') + offset)
                SheetColumn.objects.filter(
                    sheet=sheet,
                    is_deleted=False,
                    position__gte=operation.anchor_position + offset
                ).update(position=F('position') - offset + operation.count)

            for column_id, position in operation.affected_positions.items():
                SheetColumn.objects.filter(id=int(column_id)).update(
                    is_deleted=False,
                    position=position
                )
            rewritten_cells = rewrite_cells_for_operation(sheet.id, 'COL_INSERT', operation.anchor_position, operation.count)
            for cell in rewritten_cells:
                CellService._update_dependencies(cell)
            CellService._recalculate_formula_cells(rewritten_cells)

        else:
            raise ValidationError("unsupported operation type")

        operation.is_reverted = True
        operation.save(update_fields=['is_reverted'])

        return {'operation_id': operation.id, 'is_reverted': True}


class CellService:
    """Service class for handling cell business logic"""

    _NUMERIC_RE = re.compile(r'^[+-]?(\d+(\.\d*)?|\.\d+)$')

    @staticmethod
    def _normalize_decimal(value: Decimal) -> Decimal:
        return value

    @staticmethod
    def _log_position_duplicates(model, sheet: Sheet, position: int, label: str) -> None:
        matches = list(
            model.objects.filter(sheet=sheet, position=position).values('id', 'is_deleted')
        )
        if len(matches) > 1:
            logger.info(
                "Duplicate %s position detected sheet_id=%s position=%s matches=%s",
                label,
                sheet.id,
                position,
                matches
            )

    @staticmethod
    def _update_dependencies(cell: Cell) -> None:
        CellDependency.objects.filter(from_cell=cell).update(is_deleted=True)

        raw_input = cell.raw_input or ''
        if not raw_input.startswith('='):
            formula_value = cell.formula_value or ''
            if cell.value_type == CellValueType.FORMULA and formula_value.startswith('='):
                raw_input = formula_value
            else:
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
            cell for cell in changed_cells
            if (cell.raw_input or '').startswith('=')
            or (cell.value_type == CellValueType.FORMULA and (cell.formula_value or '').startswith('='))
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
            formula_source = raw_input
            if not raw_input.startswith('='):
                formula_value = cell.formula_value or ''
                if cell.value_type == CellValueType.FORMULA and formula_value.startswith('='):
                    formula_source = formula_value
                else:
                    continue
            result = evaluate_formula(formula_source, cell.sheet)
            cell.computed_type = result.computed_type
            if result.computed_type == ComputedCellType.NUMBER and result.computed_number is not None:
                cell.computed_number = Decimal(str(result.computed_number))
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
            cell.computed_type = ComputedCellType.EMPTY
            cell.computed_number = None
            cell.computed_string = None
            cell.error_code = None
            return

        if CellService._NUMERIC_RE.match(raw_input_stripped):
            try:
                number_value = Decimal(raw_input_stripped)
            except InvalidOperation:
                raise ValidationError('Invalid numeric value')
            cell.value_type = CellValueType.NUMBER
            cell.string_value = None
            cell.number_value = number_value
            cell.boolean_value = None
            cell.formula_value = None
            cell.computed_type = ComputedCellType.NUMBER
            cell.computed_number = number_value
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
            if number_value is not None:
                try:
                    number_value = Decimal(str(number_value))
                except InvalidOperation:
                    raise ValidationError('Invalid numeric value')
            raw_input_override = op.get('raw_input')
            if isinstance(raw_input_override, str):
                cell.raw_input = raw_input_override
            else:
                cell.raw_input = '' if number_value is None else str(number_value)
            cell.value_type = CellValueType.NUMBER
            cell.string_value = None
            cell.number_value = number_value
            cell.boolean_value = None
            cell.formula_value = None
            if number_value is not None:
                cell.computed_type = ComputedCellType.NUMBER
                cell.computed_number = number_value
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
            cell.computed_type = ComputedCellType.EMPTY
            cell.computed_number = None
            cell.computed_string = None
            cell.error_code = None
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
        CellService._log_position_duplicates(SheetRow, sheet, position, 'row')
        row = SheetRow.objects.filter(
            sheet=sheet,
            position=position,
            is_deleted=False
        ).first()
        if row:
            return row

        return SheetRow.objects.create(
            sheet=sheet,
            position=position,
            is_deleted=False
        )
    
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
        CellService._log_position_duplicates(SheetColumn, sheet, position, 'column')
        column = SheetColumn.objects.filter(
            sheet=sheet,
            position=position,
            is_deleted=False
        ).first()
        if column:
            return column

        return SheetColumn.objects.create(
            sheet=sheet,
            position=position,
            name=SheetService._generate_column_name(position),
            is_deleted=False
        )
    
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
            row__is_deleted=False,
            column__is_deleted=False,
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
                    if 'value_type' not in op:
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
            CellService._log_position_duplicates(SheetRow, sheet, row_pos, 'row')
            row = SheetRow.objects.filter(
                sheet=sheet,
                position=row_pos,
                is_deleted=False
            ).first()
            if row is None:
                SheetRow.objects.create(
                    sheet=sheet,
                    position=row_pos,
                    is_deleted=False
                )
                rows_expanded += 1
        
        for col_pos in columns_to_create:
            CellService._log_position_duplicates(SheetColumn, sheet, col_pos, 'column')
            column = SheetColumn.objects.filter(
                sheet=sheet,
                position=col_pos,
                is_deleted=False
            ).first()
            if column is None:
                SheetColumn.objects.create(
                    sheet=sheet,
                    position=col_pos,
                    name=SheetService._generate_column_name(col_pos),
                    is_deleted=False
                )
                columns_expanded += 1
        
        # Execute all operations (no exception handling - let exceptions propagate)
        # Optimize by prefetching rows/columns that will be accessed
        # Collect all unique row/column positions from operations
        row_positions = set()
        column_positions = set()
        for op in operations:
            row_positions.add(op['row'])
            column_positions.add(op['column'])

        for row_pos in row_positions:
            CellService._log_position_duplicates(SheetRow, sheet, row_pos, 'row')
        for col_pos in column_positions:
            CellService._log_position_duplicates(SheetColumn, sheet, col_pos, 'column')
        
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
            logger.info(
                "batch_update_cells write sheet_id=%s row_position=%s column_position=%s",
                sheet.id,
                row_pos,
                col_pos
            )
            
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
                row__is_deleted=False,
                column__is_deleted=False,
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
                value_type = op.get('value_type')
                if raw_input is not None and value_type is None:
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


class WorkflowPatternService:
    """Service for applying workflow patterns to sheets."""

    @staticmethod
    def _column_label_to_index(label: str) -> int:
        result = 0
        for char in label:
            if not char.isalpha():
                raise ValueError(f"Invalid column label: {label}")
            result = result * 26 + (ord(char.upper()) - 64)
        return result - 1

    @staticmethod
    def _adjust_formula_references(formula: str, row_delta: int, col_delta: int) -> str:
        if not formula.startswith('=') or (row_delta == 0 and col_delta == 0):
            return formula

        def replace(match: re.Match) -> str:
            prefix, col_label, row_str = match.groups()
            try:
                row = int(row_str)
                if row <= 0:
                    return match.group(0)
                col_index = WorkflowPatternService._column_label_to_index(col_label)
                next_col = col_index + col_delta
                next_row = row + row_delta
                if next_col < 0 or next_row <= 0:
                    return match.group(0)
                next_label = SheetService._generate_column_name(next_col)
                return f"{prefix}{next_label}{next_row}"
            except Exception:
                return match.group(0)

        return re.sub(r'(^|[^A-Z0-9$])([A-Z]+)(\d+)', replace, formula)

    @staticmethod
    def apply_pattern(
        pattern: WorkflowPattern,
        sheet: Sheet,
        created_by: Optional[Any] = None,
        progress_callback: Optional[Any] = None
    ) -> None:
        steps = list(
            WorkflowPatternStep.objects.filter(pattern=pattern, is_deleted=False).order_by('seq')
        )
        total_steps = len(steps)
        if total_steps == 0:
            if progress_callback:
                progress_callback(0, 0, 0)
            return

        completed = 0
        for step in steps:
            if progress_callback:
                progress_callback(step.seq, completed, total_steps)

            if step.disabled:
                completed += 1
                if progress_callback:
                    progress_callback(step.seq, completed, total_steps)
                continue

            step_type = step.type
            params = step.params or {}

            if step_type == 'APPLY_FORMULA':
                target = params.get('target') or {}
                formula = params.get('formula')
                if not formula or not isinstance(formula, str):
                    raise ValidationError("Missing formula for APPLY_FORMULA step")
                row = target.get('row')
                col = target.get('col')
                if row is None or col is None:
                    raise ValidationError("Missing target cell for APPLY_FORMULA step")
                row_position = int(row) - 1
                col_position = int(col) - 1
                if row_position < 0 or col_position < 0:
                    raise ValidationError("Invalid target cell for APPLY_FORMULA step")
                CellService.batch_update_cells(
                    sheet=sheet,
                    operations=[
                        {
                            'operation': 'set',
                            'row': row_position,
                            'column': col_position,
                            'raw_input': formula,
                        }
                    ],
                    auto_expand=True
                )
            elif step_type == 'INSERT_ROW':
                index = params.get('index')
                position = params.get('position')
                if index is None or position not in ['above', 'below']:
                    raise ValidationError("Invalid INSERT_ROW params")
                insert_position = int(index) - 1 if position == 'above' else int(index)
                if insert_position < 0:
                    raise ValidationError("Invalid row index for INSERT_ROW step")
                SheetService.insert_rows(sheet=sheet, position=insert_position, count=1, created_by=created_by)
            elif step_type == 'INSERT_COLUMN':
                index = params.get('index')
                position = params.get('position')
                if index is None or position not in ['left', 'right']:
                    raise ValidationError("Invalid INSERT_COLUMN params")
                insert_position = int(index) - 1 if position == 'left' else int(index)
                if insert_position < 0:
                    raise ValidationError("Invalid column index for INSERT_COLUMN step")
                SheetService.insert_columns(sheet=sheet, position=insert_position, count=1, created_by=created_by)
            elif step_type == 'DELETE_COLUMN':
                index = params.get('index')
                if index is None:
                    raise ValidationError("Invalid DELETE_COLUMN params")
                delete_position = int(index) - 1
                if delete_position < 0:
                    raise ValidationError("Invalid column index for DELETE_COLUMN step")
                SheetService.delete_columns(sheet=sheet, position=delete_position, count=1, created_by=created_by)
            elif step_type == 'FILL_SERIES':
                source = params.get('source') or {}
                fill_range = params.get('range') or {}
                source_row = source.get('row')
                source_col = source.get('col')
                start_row = fill_range.get('start_row')
                end_row = fill_range.get('end_row')
                start_col = fill_range.get('start_col')
                end_col = fill_range.get('end_col')
                if None in [source_row, source_col, start_row, end_row, start_col, end_col]:
                    raise ValidationError("Invalid FILL_SERIES params")
                source_row = int(source_row) - 1
                source_col = int(source_col) - 1
                start_row = int(start_row) - 1
                end_row = int(end_row) - 1
                start_col = int(start_col) - 1
                end_col = int(end_col) - 1
                if source_row < 0 or source_col < 0:
                    raise ValidationError("Invalid source cell for FILL_SERIES step")
                if min(start_row, end_row, start_col, end_col) < 0:
                    raise ValidationError("Invalid range for FILL_SERIES step")

                row_start = min(start_row, end_row)
                row_end = max(start_row, end_row)
                col_start = min(start_col, end_col)
                col_end = max(start_col, end_col)

                source_cell = Cell.objects.filter(
                    sheet=sheet,
                    row__position=source_row,
                    column__position=source_col,
                    row__is_deleted=False,
                    column__is_deleted=False,
                    is_deleted=False
                ).select_related('row', 'column').first()
                source_raw_input = ''
                if source_cell is not None:
                    source_raw_input = (
                        source_cell.raw_input
                        or source_cell.formula_value
                        or source_cell.string_value
                        or ''
                    )

                operations = []
                for row in range(row_start, row_end + 1):
                    for col in range(col_start, col_end + 1):
                        if row == source_row and col == source_col:
                            continue
                        row_delta = row - source_row
                        col_delta = col - source_col
                        next_raw_input = (
                            WorkflowPatternService._adjust_formula_references(source_raw_input, row_delta, col_delta)
                            if source_raw_input.startswith('=')
                            else source_raw_input
                        )
                        operations.append({
                            'operation': 'clear' if next_raw_input.strip() == '' else 'set',
                            'row': row,
                            'column': col,
                            'raw_input': next_raw_input,
                        })

                if operations:
                    CellService.batch_update_cells(sheet=sheet, operations=operations, auto_expand=True)
            else:
                raise ValidationError(f"Unsupported step type {step_type}")

            completed += 1
            if progress_callback:
                progress_callback(step.seq, completed, total_steps)

