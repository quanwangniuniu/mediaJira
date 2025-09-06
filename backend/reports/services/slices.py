# apps/reports/services/slices.py
from __future__ import annotations
from typing import Any, Dict, List, Iterable, Tuple, Optional
import base64, csv, io, math
from collections import defaultdict

Number = float | int

# ============================================================
# Entry: normalize Report.slice_config to a canonical "slices" map
# ============================================================

def canonicalize_slice_config(sc: Dict[str, Any] | None) -> Dict[str, Any]:
    """
    Canonicalize various slice_config shapes into:
        {"slices": { <slice_id>: <slice_dict> }}

    Supported inputs:
      1) Already canonical:
            {"slices": {...}}                       -> return as-is
      2) Legacy single-slice at top-level (dataset/dimensions/...):
            {"dataset":..., "dimensions":..., ...}  -> wrap into "default"
      3) Legacy inline_result (most important for your case):
         - Single table:
             {"inline_result": {"columns":[...], "rows":[...]}}
               → {"slices": {"default": {"data_root": <columns/rows>}}}
         - Map of slices:
             {"inline_result": {"default": {...}, "foo": {...}}}
               For each value:
                   - columns/rows → {"data_root": ...}
                   - list[dict]  → {"inline_rows": ...}
                   - {"rows_long": [...] } → {"rows_long": [...]}
    Note:
      - Top-level keys like dataset/dimensions/metrics/filters/time_range
        will be *propagated* to each slice if the slice does not override them.
    """
    sc = sc or {}

    # Case 1: already canonical
    if "slices" in sc and isinstance(sc["slices"], dict):
        return sc

    # Extract base keys that should apply to each slice as defaults
    base_keys = ("dataset", "dimensions", "metrics", "filters", "time_range")
    base_defaults = {k: sc.get(k) for k in base_keys if k in sc}

    # Case 3: legacy inline_result
    if "inline_result" in sc:
        ir = sc.get("inline_result")
        slices: Dict[str, Dict[str, Any]] = _normalize_inline_result_to_slices(ir)

        # Propagate base defaults to each slice (do not overwrite slice-local values)
        for sid, slc in slices.items():
            for k, v in base_defaults.items():
                if v is not None and k not in slc:
                    slc[k] = v
        return {"slices": slices}

    # Case 2: legacy single-slice config (top-level dataset/dimensions/metrics...)
    keys = {"dataset", "dimensions", "metrics", "filters", "time_range",
            "data_root", "inline_rows", "inline_csv", "inline_csv_b64", "rows_long"}
    if any(k in sc for k in keys):
        return {"slices": {"default": sc}}

    # Fallback: empty default slice
    return {"slices": {"default": {}}}

def _normalize_inline_result_to_slices(ir: Any) -> Dict[str, Dict[str, Any]]:
    """
    Convert various inline_result shapes into slices dict:
      - {"columns":[...], "rows":[...]} → {"default": {"data_root": ir}}
      - [ {col:val, ...}, ... ]        → {"default": {"inline_rows": ir}}
      - {"slice": {"columns":...}}     → {"slice": {"data_root": ...}}
      - {"slice": [ {col:val} ] }      → {"slice": {"inline_rows": ...}}
      - {"slice": {"rows_long":[...]}} → {"slice": {"rows_long": [...]}}

    Any unrecognized forms are ignored (not fatal).
    """
    slices: Dict[str, Dict[str, Any]] = {}

    # Single table (columns/rows) → default
    if isinstance(ir, dict) and "columns" in ir and "rows" in ir:
        slices["default"] = {"data_root": ir}
        return slices

    # Already a list of row dicts → default
    if isinstance(ir, list) and (not ir or isinstance(ir[0], dict)):
        slices["default"] = {"inline_rows": ir}
        return slices

    # Map: per-slice inline result
    if isinstance(ir, dict):
        for sid, payload in ir.items():
            if isinstance(payload, dict) and "columns" in payload and "rows" in payload:
                slices[str(sid)] = {"data_root": payload}
            elif isinstance(payload, list) and (not payload or isinstance(payload[0], dict)):
                slices[str(sid)] = {"inline_rows": payload}
            elif isinstance(payload, dict) and "rows_long" in payload and isinstance(payload["rows_long"], list):
                slices[str(sid)] = {"rows_long": payload["rows_long"]}
            # else: ignore unknown shapes silently
    return slices

# ============================================================
# Utilities
# ============================================================

def _to_number(x: Any) -> Optional[Number]:
    if x is None: 
        return None
    if isinstance(x, (int, float)): 
        # Keep ints as int to avoid tiny FP noise in sums; casting later is fine
        return x
    s = str(x).strip().replace(",", "")
    if s in ("", "-", "NaN", "nan", "None", "null"): 
        return None
    try:
        v = float(s)
        if math.isfinite(v): 
            return v
        return None
    except Exception:
        return None

def _group_key(row: Dict[str, Any], dims: List[str]) -> Tuple:
    return tuple(row.get(d) for d in dims)

# ============================================================
# Load data from multiple inline sources
# ============================================================

def _load_inline_rows_from_data_root(slc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Read a width table from:
        slc["data_root"] == {"columns":[...], "rows":[...]}  → List[Dict]
    """
    dr = slc.get("data_root")
    if not isinstance(dr, dict): 
        return []
    cols = list(dr.get("columns") or [])
    rows = dr.get("rows") or []
    out: List[Dict[str, Any]] = []
    for r in rows:
        if isinstance(r, (list, tuple)):
            # Pad/truncate for safety
            row = list(r) + [None] * max(0, len(cols) - len(r))
            row = row[: len(cols)]
            out.append({c: row[i] for i, c in enumerate(cols)})
        elif isinstance(r, dict):
            out.append(r)
    return out

def _load_inline_rows_fallback(slc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Accept other inline shapes:
      - inline_rows: already a list of dicts
      - inline_csv_b64: CSV bytes (base64)
      - inline_csv: CSV text
    """
    if isinstance(slc.get("inline_rows"), list):
        return list(slc["inline_rows"])
    if "inline_csv_b64" in slc:
        raw = base64.b64decode(slc["inline_csv_b64"])
        text = raw.decode("utf-8", errors="ignore")
        return list(csv.DictReader(io.StringIO(text)))
    if "inline_csv" in slc:
        text = slc["inline_csv"]
        return list(csv.DictReader(io.StringIO(text)))
    return []

def _load_rows_long(slc: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Long-form ingestion from FE or ETL:
        [{..., dimension columns..., "metric_type": <name>, "value": <number>, ...}]
    """
    rows = slc.get("rows_long")
    if isinstance(rows, list) and rows and isinstance(rows[0], dict):
        return rows
    return []

# ============================================================
# Long → Wide pivot, with metric aggregation
# ============================================================

def _pivot_from_long(
    rows_long: List[Dict[str, Any]], 
    dimensions: List[str], 
    metrics: List[str],
    last_value_metrics: Optional[Iterable[str]] = None
) -> List[Dict[str, Any]]:
    """
    Pivot long-form rows into a wide table:
      - Group by the given dimensions.
      - Bucket by metric_type (or metric).
      - Sum numeric values by default; for metrics in `last_value_metrics`,
        take the *last* value instead of summing (e.g., ROI, ROAS).
    Only requested metrics are kept if `metrics` is non-empty.
    """
    last_value_metrics = set(last_value_metrics or [])
    buckets: Dict[Tuple, Dict[str, Any]] = {}
    for r in rows_long:
        key = _group_key(r, dimensions)
        b = buckets.setdefault(key, {d: r.get(d) for d in dimensions})
        mtype = str(r.get("metric_type") or r.get("metric") or "").strip()
        val = _to_number(r.get("value"))
        if not mtype or val is None:
            continue
        if mtype in last_value_metrics:
            b[mtype] = val
        else:
            b[mtype] = _to_number(b.get(mtype, 0)) or 0
            b[mtype] += val

    out: List[Dict[str, Any]] = []
    for _, row in buckets.items():
        if metrics:
            # Strictly keep only requested metrics + dimensions
            to_del = [k for k in row.keys() if k not in dimensions and k not in metrics]
            for k in to_del:
                del row[k]
        out.append(row)
    return out

# ============================================================
# Aggregate a wide table by dimensions/metrics (sum), derive ROI/ROAS
# ============================================================

def _aggregate_wide_rows(
    wide_rows: List[Dict[str, Any]],
    dimensions: List[str],
    metrics: List[str],
    derive_roi: bool = True,
) -> List[Dict[str, Any]]:
    """
    Aggregate a width table:
      - Sum all requested metrics grouped by the given dimensions.
      - Optionally derive ROI/ROAS if not present but cost/revenue exist:
          ROI  = (Revenue - Cost) / Cost
          ROAS = Revenue / Cost
    """
    buckets: Dict[Tuple, Dict[str, Any]] = {}
    for r in wide_rows:
        key = _group_key(r, dimensions)
        b = buckets.setdefault(key, {d: r.get(d) for d in dimensions})
        for m in metrics:
            v = _to_number(r.get(m))
            if v is None: 
                continue
            prev = _to_number(b.get(m, 0)) or 0
            b[m] = prev + v

    if derive_roi:
        for b in buckets.values():
            cost = _to_number(b.get("Cost"))
            revenue = _to_number(b.get("Revenue")) or _to_number(b.get("Total Revenue"))
            if cost is not None and cost != 0 and revenue is not None:
                if "ROI" in metrics and "ROI" not in b:
                    b["ROI"] = (revenue - cost) / cost
                if "ROAS" in metrics and "ROAS" not in b:
                    b["ROAS"] = revenue / cost
    return list(buckets.values())

# ============================================================
# Materialize a single slice
# ============================================================

def _materialize_one_slice(slc: Dict[str, Any]) -> Dict[str, Any]:
    dims: List[str] = list(slc.get("dimensions") or [])
    mets: List[str] = list(slc.get("metrics") or [])

    # 1) Preferred: long-form
    rows_long = _load_rows_long(slc)
    if rows_long:
        table = _pivot_from_long(
            rows_long, 
            dimensions=dims, 
            metrics=mets,
            last_value_metrics={"ROI", "ROAS"}  # usually better taken as last value
        )
        return {
            "type": "long",
            "dimensions": dims,
            "metrics": mets,
            "table": table,
            "raw_rows_long": rows_long,
        }

    # 2) Width table via data_root (columns/rows)
    wide_rows = _load_inline_rows_from_data_root(slc)
    if wide_rows:
        table = _aggregate_wide_rows(
            wide_rows, dimensions=dims, metrics=mets, derive_roi=True
        )
        return {
            "type": "data_root",
            "dimensions": dims,
            "metrics": mets,
            "table": table,
            "raw_rows": wide_rows,
        }

    # 3) Fallback inline (rows or CSV)
    fallback_rows = _load_inline_rows_fallback(slc)
    if fallback_rows:
        table = _aggregate_wide_rows(
            fallback_rows, dimensions=dims, metrics=mets, derive_roi=True
        )
        return {
            "type": "inline",
            "dimensions": dims,
            "metrics": mets,
            "table": table,
            "raw_rows": fallback_rows,
        }

    # 4) Empty
    return {"type": "empty", "dimensions": dims, "metrics": mets, "table": []}

# ============================================================
# Main: materialize all slices for a Report
# ============================================================

def materialize_report_slices(report) -> Dict[str, Any]:
    """
    Returns:
      {
        "tables": { <slice_id>: [ {dim..., metric columns...}, ... ] },
        "slices": { <slice_id>: <slice-meta-without-table> }
      }
    Guarantee:
      - A "default" key exists in tables (possibly empty) for
        sections that rely on source_slice_ids=["default"].
    """
    sc = canonicalize_slice_config(getattr(report, "slice_config", None))
    out_tables: Dict[str, List[Dict[str, Any]]] = {}
    out_meta: Dict[str, Any] = {}

    for sid, slc in (sc.get("slices") or {}).items():
        materialized = _materialize_one_slice(slc or {})
        out_tables[sid] = materialized.get("table", [])
        out_meta[sid] = {k: v for k, v in materialized.items() if k != "table"}

    if "default" not in out_tables:
        out_tables["default"] = []

    return {"tables": out_tables, "slices": out_meta}
