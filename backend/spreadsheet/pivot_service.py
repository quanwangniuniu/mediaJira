"""
Pivot table service - recompute pivot sheets from persisted config and source data.
"""
import logging
from django.db import transaction

from .models import Sheet, PivotConfig
from .pivot_engine import build_pivot_and_cell_operations
from .services import SheetService, CellService

logger = logging.getLogger(__name__)


def _get_source_columns(source_sheet: Sheet) -> list:
    """Build columns list [{index, header}, ...] from source sheet. Row 0 = headers."""
    from .models import SheetRow, SheetColumn, Cell

    cols = list(
        source_sheet.columns.filter(is_deleted=False).order_by('position')
    )
    headers = []
    for c in cols:
        cell = Cell.objects.filter(
            sheet=source_sheet,
            row__position=0,
            column=c,
            is_deleted=False,
        ).select_related('row', 'column').first()
        raw = (cell.raw_input or cell.computed_string or '') if cell else ''
        header = str(raw).strip() if raw else SheetService._generate_column_name(c.position)
        headers.append({'index': c.position, 'header': header or f'Col{c.position}'})
    return headers


def _get_source_rows(source_sheet: Sheet, columns: list) -> list:
    """Build source rows as list of {col_index: value}. Row 0 excluded (header)."""
    from .models import Cell

    if not columns:
        return []

    col_positions = [c['index'] for c in columns]
    cells = Cell.objects.filter(
        sheet=source_sheet,
        row__position__gte=1,
        column__position__in=col_positions,
        row__is_deleted=False,
        column__is_deleted=False,
        is_deleted=False,
    ).select_related('row', 'column')

    row_map = {}
    for cell in cells:
        r = cell.row.position
        c = cell.column.position
        val = cell.computed_string or cell.raw_input or ''
        val = str(val).strip() if val else ''
        if r not in row_map:
            row_map[r] = {}
        row_map[r][c] = val

    max_row = max(row_map.keys()) if row_map else 0
    rows = []
    for r in range(1, max_row + 1):
        row_data = row_map.get(r, {})
        has_data = any(
            (row_data.get(c) or '').strip()
            for c in col_positions
        )
        if has_data:
            rows.append(row_data)
    return rows


@transaction.atomic
def recompute_pivot(pivot_config: PivotConfig) -> None:
    """
    Recompute pivot sheet from source data and persisted config.
    Reads source sheet cells, runs pivot engine, writes result to pivot sheet.
    """
    source_sheet = pivot_config.source_sheet
    pivot_sheet = pivot_config.pivot_sheet

    columns = _get_source_columns(source_sheet)
    if not columns:
        logger.warning("PivotConfig %s: source sheet has no columns", pivot_config.id)
        return

    source_rows = _get_source_rows(source_sheet, columns)

    headers, body, operations = build_pivot_and_cell_operations(
        source_rows=source_rows,
        columns=columns,
        rows_config=pivot_config.rows_config or [],
        columns_config=pivot_config.columns_config or [],
        values_config=pivot_config.values_config or [],
        show_grand_total_row=pivot_config.show_grand_total_row,
    )

    if not operations:
        return

    new_row_count = len(headers) + len(body)
    new_col_count = max(len(h) for h in headers) if headers else 0
    for brow in body:
        new_col_count = max(new_col_count, len(brow))

    from .models import SheetRow
    prev_row_count = (
        SheetRow.objects.filter(sheet=pivot_sheet, is_deleted=False).count()
        or 0
    )
    from .models import SheetColumn
    prev_col_count = (
        SheetColumn.objects.filter(sheet=pivot_sheet, is_deleted=False).count()
        or 0
    )

    set_ops = [op for op in operations if op.get('operation') == 'set']
    clear_ops = []
    for r in range(max(new_row_count, prev_row_count)):
        for c in range(new_col_count, prev_col_count):
            clear_ops.append({'operation': 'clear', 'row': r, 'column': c})
    for r in range(new_row_count, prev_row_count):
        for c in range(new_col_count):
            clear_ops.append({'operation': 'clear', 'row': r, 'column': c})

    all_ops = set_ops + clear_ops
    if not all_ops:
        return

    target_rows = max(new_row_count + 10, prev_row_count, 100)
    target_cols = max(new_col_count + 5, prev_col_count, 26)
    SheetService.resize_sheet(
        sheet=pivot_sheet,
        row_count=target_rows,
        column_count=target_cols,
    )

    CellService.batch_update_cells(
        sheet=pivot_sheet,
        operations=all_ops,
        auto_expand=False,
    )


def recompute_pivots_for_source_sheet(source_sheet: Sheet) -> None:
    """Find all pivot configs whose source_sheet is this sheet and recompute them."""
    configs = PivotConfig.objects.filter(
        source_sheet=source_sheet,
        pivot_sheet__is_deleted=False,
    ).select_related('pivot_sheet', 'source_sheet')
    for pc in configs:
        try:
            recompute_pivot(pc)
        except Exception as e:
            logger.exception(
                "Pivot recompute failed for PivotConfig %s: %s",
                pc.id,
                e,
            )
