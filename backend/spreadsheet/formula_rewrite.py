import re
from typing import List

from django.db import transaction
from django.db.models import Q

from .models import Cell, CellValueType

_CELL_REF_RE = re.compile(r'(?<![A-Z0-9_])([A-Z]+)(\d+)(?![A-Z0-9_])')
_COL_RANGE_RE = re.compile(r'(?<![A-Z0-9_])([A-Z]+):([A-Z]+)(?![A-Z0-9_])')


def _col_label_to_index(label: str) -> int:
    index = 0
    for char in label:
        index = index * 26 + (ord(char) - 64)
    return index - 1


def _index_to_col_label(index: int) -> str:
    if index < 0:
        return ''
    result = ''
    index += 1
    while index > 0:
        index -= 1
        result = chr(ord('A') + (index % 26)) + result
        index //= 26
    return result


def _rewrite_index(index: int, op_type: str, anchor_pos: int, count: int) -> str:
    if op_type.endswith('_INSERT'):
        if index >= anchor_pos:
            return str(index + count)
        return str(index)
    if op_type.endswith('_DELETE'):
        if anchor_pos <= index <= anchor_pos + count - 1:
            return '#REF!'
        if index > anchor_pos + count - 1:
            return str(index - count)
        return str(index)
    return str(index)


def rewrite_formula_text(formula: str, op_type: str, anchor_pos: int, count: int) -> str:
    if not isinstance(formula, str) or not formula:
        return formula

    def rewrite_col_range(match: re.Match) -> str:
        start_label = match.group(1)
        end_label = match.group(2)
        if op_type.startswith('ROW_'):
            return f"{start_label}:{end_label}"

        start_index = _col_label_to_index(start_label)
        end_index = _col_label_to_index(end_label)
        new_start = _rewrite_index(start_index, op_type, anchor_pos, count)
        new_end = _rewrite_index(end_index, op_type, anchor_pos, count)
        new_start_label = new_start if new_start == '#REF!' else _index_to_col_label(int(new_start))
        new_end_label = new_end if new_end == '#REF!' else _index_to_col_label(int(new_end))
        return f"{new_start_label}:{new_end_label}"

    def rewrite_cell(match: re.Match) -> str:
        col_label = match.group(1)
        row_number = int(match.group(2))
        col_index = _col_label_to_index(col_label)
        row_index = row_number - 1

        if op_type.startswith('COL_'):
            new_col = _rewrite_index(col_index, op_type, anchor_pos, count)
            if new_col == '#REF!':
                return '#REF!'
            return f"{_index_to_col_label(int(new_col))}{row_number}"

        if op_type.startswith('ROW_'):
            new_row = _rewrite_index(row_index, op_type, anchor_pos, count)
            if new_row == '#REF!':
                return '#REF!'
            return f"{col_label}{int(new_row) + 1}"

        return match.group(0)

    rewritten = _COL_RANGE_RE.sub(rewrite_col_range, formula)
    rewritten = _CELL_REF_RE.sub(rewrite_cell, rewritten)
    return rewritten


@transaction.atomic
def rewrite_cells_for_operation(sheet_id: int, op_type: str, anchor_pos: int, count: int) -> List[Cell]:
    cells = Cell.objects.filter(
        sheet_id=sheet_id,
        is_deleted=False,
        row__is_deleted=False,
        column__is_deleted=False
    ).filter(
        Q(raw_input__startswith='=') |
        Q(value_type=CellValueType.FORMULA) |
        Q(formula_value__isnull=False)
    )

    changed: List[Cell] = []
    for cell in cells:
        raw_input = cell.raw_input or ''
        formula_value = cell.formula_value
        updated = False

        if raw_input.startswith('='):
            new_formula = rewrite_formula_text(raw_input, op_type, anchor_pos, count)
            if new_formula != raw_input:
                cell.raw_input = new_formula
                updated = True
            if cell.formula_value is not None or cell.value_type == CellValueType.FORMULA:
                if cell.formula_value != new_formula:
                    cell.formula_value = new_formula
                    updated = True
        elif formula_value:
            new_formula = rewrite_formula_text(formula_value, op_type, anchor_pos, count)
            if new_formula != formula_value:
                cell.formula_value = new_formula
                updated = True

        if updated:
            changed.append(cell)

    if changed:
        Cell.objects.bulk_update(changed, ['raw_input', 'formula_value'])
    return changed

