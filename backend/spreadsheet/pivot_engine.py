"""
Pivot table engine - Python port of frontend pivot logic.
Builds pivot table from source data and produces cell operations.
"""
from typing import Any
from decimal import Decimal


def _round_precision(value: float, decimals: int = 10) -> float:
    if not (isinstance(value, (int, float)) and abs(value) != float('inf')):
        return 0.0
    factor = 10 ** decimals
    return round(value * factor) / factor


def _normalize_column_config(columns: list) -> list:
    """Normalize columns to [{field, sort}, ...]. Strings become {field, sort: 'asc'}."""
    out = []
    for c in columns:
        if isinstance(c, dict):
            out.append({'field': c.get('field', ''), 'sort': c.get('sort') or 'asc'})
        else:
            out.append({'field': str(c), 'sort': 'asc'})
    return out


def _aggregate(values: list, agg: str) -> float:
    if not values:
        return 0.0
    numeric = []
    for v in values:
        try:
            n = float(v) if v is not None and str(v).strip() else 0.0
        except (TypeError, ValueError):
            n = 0.0
        numeric.append(n)
    if agg == 'SUM':
        return _round_precision(sum(numeric))
    if agg == 'COUNT':
        return float(len(numeric))
    if agg == 'AVG':
        return _round_precision(sum(numeric) / len(numeric)) if numeric else 0.0
    if agg == 'MIN':
        return _round_precision(min(numeric))
    if agg == 'MAX':
        return _round_precision(max(numeric))
    if agg == 'MEDIAN':
        s = sorted(numeric)
        mid = len(s) // 2
        if len(s) % 2 == 0:
            return _round_precision((s[mid - 1] + s[mid]) / 2)
        return _round_precision(s[mid])
    return 0.0


def _build_composite_key(row: dict, field_indices: list) -> str:
    """row is dict[col_index, value]. Build key from values at field_indices."""
    parts = []
    for idx in field_indices:
        val = row.get(idx, '') or ''
        parts.append(str(val).strip())
    return '|||'.join(parts)


def _format_number_for_cell(value: float) -> str:
    v = _round_precision(value, 10)
    s = f'{v:.15g}'
    try:
        return str(float(s))
    except (ValueError, TypeError):
        return str(v)


def build_pivot_and_cell_operations(
    source_rows: list[dict],
    columns: list[dict],
    rows_config: list,
    columns_config: list,
    values_config: list,
    show_grand_total_row: bool = True,
) -> tuple[list[list], list[list], list[dict]]:
    """
    Build pivot headers, body, and cell operations.
    source_rows: list of {col_index: value} or {header_name: value} - we use header names from columns
    columns: list of {index, header}
    Returns: (headers, body, operations) where operations are [{operation, row, column, raw_input}, ...]
    """
    headers_out: list[list] = []
    body_out: list[list] = []
    operations: list[dict] = []

    row_fields = list(rows_config) if rows_config else []
    col_configs = _normalize_column_config(columns_config or [])
    value_configs = list(values_config or [])
    if not row_fields or not value_configs:
        return headers_out, body_out, operations

    header_names = [c['header'] for c in columns]
    col_field_names = [c['field'] for c in col_configs]
    col_sort = col_configs[0]['sort'] if col_configs else 'asc'

    row_indices = [next((i for i, h in enumerate(header_names) if h == f), -1) for f in row_fields]
    col_indices = [next((i for i, h in enumerate(header_names) if h == f), -1) for f in col_field_names]
    row_indices = [i for i in row_indices if i >= 0]
    col_indices = [i for i in col_indices if i >= 0]

    value_fields = []
    for vc in value_configs:
        vc = vc if isinstance(vc, dict) else {}
        field = vc.get('field', '')
        agg = vc.get('aggregation', 'SUM')
        disp = vc.get('display', 'VALUE')
        idx = next((c['index'] for c in columns if c.get('header') == field), -1)
        if idx >= 0:
            value_fields.append({'index': idx, 'field': field, 'aggregation': agg, 'display': disp})

    if not row_indices or not value_fields:
        return headers_out, body_out, operations

    unique_row_keys = set()
    unique_col_keys = set()
    data_map = {}  # rowKey -> colKey -> valueIndex -> list of numbers

    for row in source_rows:
        row_key = _build_composite_key(row, row_indices)
        if any(not (str(row.get(i, '') or '').strip()) for i in row_indices):
            continue
        unique_row_keys.add(row_key)

        col_key = '__TOTAL__'
        if col_indices:
            col_key = _build_composite_key(row, col_indices)
            if all(k for k in col_key.split('|||')):
                unique_col_keys.add(col_key)
            else:
                col_key = '__TOTAL__'

        map_key = f'{row_key}:::${col_key}'
        if map_key not in data_map:
            data_map[map_key] = {}
        vmap = data_map[map_key]

        for vi, vf in enumerate(value_fields):
            raw = row.get(vf['index'], '') or ''
            raw = str(raw).strip() if raw is not None else ''
            try:
                num = float(raw) if raw else 0.0
            except (TypeError, ValueError):
                num = 0.0
            if vi not in vmap:
                vmap[vi] = []
            vmap[vi].append(num)

    sorted_row_keys = sorted(unique_row_keys)
    sorted_col_keys = (
        sorted(unique_col_keys, reverse=(col_sort == 'desc'))
        if unique_col_keys
        else ['__TOTAL__']
    )

    has_col_fields = bool(col_indices) and sorted_col_keys[0] != '__TOTAL__'
    row_header_count = len(row_fields)
    display_modes = [vf.get('display', 'VALUE') for vf in value_fields]

    base_values = []
    row_totals = []
    col_totals = [{} for _ in sorted_col_keys]
    grand_totals = [0.0] * len(value_fields)

    for ri, row_key in enumerate(sorted_row_keys):
        base_values.append([[] for _ in sorted_col_keys])
        row_totals.append([0.0] * len(value_fields))
        for ci, col_key in enumerate(sorted_col_keys):
            map_key = f'{row_key}:::${col_key}'
            vmap = data_map.get(map_key, {})
            for vi in range(len(value_fields)):
                vals = vmap.get(vi, [])
                agg_val = _aggregate(vals, value_fields[vi]['aggregation'])
                base_values[ri][ci].append(agg_val)
                row_totals[ri][vi] += agg_val
                col_totals[ci][vi] = col_totals[ci].get(vi, 0) + agg_val
                grand_totals[vi] += agg_val

    if has_col_fields:
        hr1 = list(row_fields)
        for col_key in sorted_col_keys:
            label = ' / '.join(col_key.split('|||')) if '|||' in col_key else col_key
            for vi in range(len(value_fields)):
                hr1.append(label if vi == 0 else '')
        headers_out.append(hr1)
        hr2 = [''] * len(row_fields)
        for _ in sorted_col_keys:
            for vf in value_fields:
                hr2.append(f"{vf['aggregation']}({vf['field']})")
        headers_out.append(hr2)
    else:
        hr = list(row_fields)
        for vf in value_fields:
            hr.append(f"{vf['aggregation']}({vf['field']})")
        headers_out.append(hr)

    for ri, row_key in enumerate(sorted_row_keys):
        row_parts = row_key.split('|||')
        row_data = list(row_parts)
        for ci in range(len(sorted_col_keys)):
            for vi in range(len(value_fields)):
                base = base_values[ri][ci][vi] if ri < len(base_values) and ci < len(base_values[0]) else 0.0
                mode = display_modes[vi] if vi < len(display_modes) else 'VALUE'
                val = base
                if mode == 'ROW_PERCENT':
                    denom = row_totals[ri][vi]
                    val = (base / denom * 100) if denom else 0.0
                elif mode == 'COLUMN_PERCENT':
                    denom = col_totals[ci].get(vi, 0)
                    val = (base / denom * 100) if denom else 0.0
                elif mode == 'TOTAL_PERCENT':
                    denom = grand_totals[vi]
                    val = (base / denom * 100) if denom else 0.0
                if mode == 'VALUE':
                    row_data.append(_round_precision(val))
                else:
                    row_data.append(f'{_round_precision(val, 2):.2f}%')
        body_out.append(row_data)

    if show_grand_total_row and sorted_row_keys:
        total_row = ['Total'] + [''] * (row_header_count - 1)
        for ci in range(len(sorted_col_keys)):
            for vi in range(len(value_fields)):
                mode = display_modes[vi] if vi < len(display_modes) else 'VALUE'
                if mode == 'VALUE':
                    total_row.append(_round_precision(col_totals[ci].get(vi, 0)))
                else:
                    total_row.append('100.00%')
        body_out.append(total_row)

    for hi, hrow in enumerate(headers_out):
        for col, val in enumerate(hrow):
            operations.append({
                'operation': 'set',
                'row': hi,
                'column': col,
                'raw_input': str(val) if val is not None else '',
            })

    header_offset = len(headers_out)
    for row_idx, brow in enumerate(body_out):
        for col_idx, cell_val in enumerate(brow):
            if isinstance(cell_val, (int, float)):
                raw = '' if cell_val == 0 else _format_number_for_cell(float(cell_val))
            else:
                raw = str(cell_val) if cell_val is not None else ''
            operations.append({
                'operation': 'set',
                'row': header_offset + row_idx,
                'column': col_idx,
                'raw_input': raw,
            })

    return headers_out, body_out, operations
