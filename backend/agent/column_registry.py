"""
Column schema registry for uploaded spreadsheets.

Detection pipeline:
  1. Rule-based match against known schema definitions (instant, no LLM cost).
  2. LLM fallback (Claude Haiku) for files that do not match any known schema.
     Unknown columns are labeled "unknown" — never guessed.

Public API:
  detect_columns(headers)  -> ColumnDetectionResult
  normalize_spreadsheet(data, column_mapping) -> normalized data dict
"""

import json
import logging
import os
import re

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Semantic category constants
# ---------------------------------------------------------------------------
CAT_IDENTIFIER = "identifier"
CAT_FINANCIAL = "financial"
CAT_ENGAGEMENT = "engagement"
CAT_CONVERSION = "conversion"
CAT_PERFORMANCE_RATIO = "performance_ratio"
CAT_UNKNOWN = "unknown"

# ---------------------------------------------------------------------------
# Schema registry
# Each schema entry:
#   name        — human-readable schema name
#   source_hint — optional origin label shown to users
#   columns     — {canonical_name: {aliases, category, description}}
# ---------------------------------------------------------------------------

SCHEMA_REGISTRY = {
    "meta_ads": {
        "name": "Meta Ads Performance",
        "source_hint": "Meta Ads Manager export",
        "columns": {
            # --- Identifiers ---
            "campaign_name": {
                "aliases": ["campaign name", "campaign", "campaign_name"],
                "category": CAT_IDENTIFIER,
                "description": "Campaign name",
            },
            "ad_set_name": {
                "aliases": [
                    "ad set name", "adset name", "adset_name", "ad_set_name",
                ],
                "category": CAT_IDENTIFIER,
                "description": "Ad set name",
            },
            "ad_name": {
                "aliases": [
                    "ad name", "ad_name", "creative name", "creative_name",
                ],
                "category": CAT_IDENTIFIER,
                "description": "Ad name / creative",
            },
            "campaign_id": {
                "aliases": ["campaign id", "campaign_id"],
                "category": CAT_IDENTIFIER,
                "description": "Campaign ID",
            },
            "ad_set_id": {
                "aliases": [
                    "ad set id", "adset id", "adset_id", "ad_set_id",
                ],
                "category": CAT_IDENTIFIER,
                "description": "Ad set ID",
            },
            "ad_id": {
                "aliases": ["ad id", "ad_id"],
                "category": CAT_IDENTIFIER,
                "description": "Ad ID",
            },
            # --- Financial ---
            "amount_spent": {
                "aliases": [
                    "amount spent", "amount_spent", "spend", "ad spend",
                    "ad_spend", "cost", "total spend", "total_spend",
                ],
                "category": CAT_FINANCIAL,
                "description": "Total amount spent (currency)",
            },
            "cpm": {
                "aliases": [
                    "cpm", "cost per 1000 impressions",
                    "cost per thousand impressions",
                ],
                "category": CAT_FINANCIAL,
                "description": "Cost per 1,000 impressions",
            },
            "cpc": {
                "aliases": ["cpc", "cost per click", "cost per link click"],
                "category": CAT_FINANCIAL,
                "description": "Cost per click",
            },
            "cpp": {
                "aliases": ["cpp", "cost per purchase", "cost per result"],
                "category": CAT_FINANCIAL,
                "description": "Cost per purchase / result",
            },
            # --- Engagement ---
            "impressions": {
                "aliases": ["impressions", "impression"],
                "category": CAT_ENGAGEMENT,
                "description": "Total impressions",
            },
            "reach": {
                "aliases": ["reach", "unique reach"],
                "category": CAT_ENGAGEMENT,
                "description": "Unique accounts reached",
            },
            "clicks": {
                "aliases": ["clicks", "all clicks", "total clicks"],
                "category": CAT_ENGAGEMENT,
                "description": "Total clicks (all)",
            },
            "link_clicks": {
                "aliases": ["link clicks", "link_clicks", "unique link clicks"],
                "category": CAT_ENGAGEMENT,
                "description": "Link clicks",
            },
            "frequency": {
                "aliases": ["frequency"],
                "category": CAT_ENGAGEMENT,
                "description": "Average times each person saw the ad",
            },
            "video_views": {
                "aliases": [
                    "video views", "video_views", "3-second video views",
                    "thruplays", "thruplay", "2-second continuous video views",
                ],
                "category": CAT_ENGAGEMENT,
                "description": "Video views",
            },
            # --- Conversion ---
            "purchases": {
                "aliases": [
                    "purchases", "purchase", "conversions", "results",
                    "website purchases", "omni purchases",
                ],
                "category": CAT_CONVERSION,
                "description": "Purchase / conversion events",
            },
            "purchase_roas": {
                "aliases": [
                    "purchase roas", "purchase_roas", "roas",
                    "website purchase roas",
                ],
                "category": CAT_CONVERSION,
                "description": "Return on ad spend (purchases)",
            },
            "add_to_cart": {
                "aliases": [
                    "add to cart", "add_to_cart", "adds to cart",
                    "website adds to cart",
                ],
                "category": CAT_CONVERSION,
                "description": "Add-to-cart events",
            },
            "leads": {
                "aliases": [
                    "leads", "lead", "on-facebook leads", "website leads",
                ],
                "category": CAT_CONVERSION,
                "description": "Lead generation events",
            },
            # --- Performance ratios ---
            "ctr": {
                "aliases": [
                    "ctr", "click-through rate", "click through rate",
                    "ctr (all)", "all ctr",
                ],
                "category": CAT_PERFORMANCE_RATIO,
                "description": "Click-through rate (all clicks / impressions)",
            },
            "link_ctr": {
                "aliases": [
                    "link ctr", "link_ctr",
                    "ctr (link click-through rate)",
                ],
                "category": CAT_PERFORMANCE_RATIO,
                "description": "Link click-through rate",
            },
        },
    },
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _normalise(text: str) -> str:
    """Lowercase and collapse whitespace/underscores for fuzzy matching."""
    return re.sub(r"[\s_]+", " ", text.strip().lower())


def _build_alias_index(schema: dict) -> dict:
    """Return {normalised_alias: canonical_name} for a single schema."""
    index = {}
    for canonical, spec in schema["columns"].items():
        for alias in spec["aliases"]:
            index[_normalise(alias)] = canonical
    return index


# Pre-compute alias indexes for every schema at import time.
_SCHEMA_INDEXES = {
    schema_key: _build_alias_index(schema)
    for schema_key, schema in SCHEMA_REGISTRY.items()
}

# ---------------------------------------------------------------------------
# Detection result
# ---------------------------------------------------------------------------

class ColumnDetectionResult:
    """
    Outcome of column detection.

    Attributes:
        schema_key         — matched schema key, or None
        schema_name        — human-readable schema name, or "Unknown format"
        source             — "rule" | "llm" | "none"
        confidence         — 0.0 – 1.0  (overall schema confidence)
        mappings           — {original_header: canonical_name or "unknown"}
        categories         — {canonical_name: category_string}
        unrecognized       — original headers that could not be mapped
        column_confidences — {original_header: 0.0–1.0}
                             Per-column confidence scores.
                             Rule-based matches are always 1.0; LLM-detected
                             columns carry the score returned by the model;
                             unrecognized columns are 0.0.
    """

    def __init__(self, *, schema_key, schema_name, source, confidence,
                 mappings, categories, unrecognized, column_confidences=None):
        self.schema_key = schema_key
        self.schema_name = schema_name
        self.source = source
        self.confidence = confidence
        self.mappings = mappings
        self.categories = categories
        self.unrecognized = unrecognized
        # Default: 1.0 for every mapped column, 0.0 for unrecognized
        if column_confidences is not None:
            self.column_confidences = column_confidences
        else:
            unrecognized_set = set(unrecognized)
            self.column_confidences = {
                h: (0.0 if h in unrecognized_set else 1.0)
                for h in mappings
            }

    def to_dict(self):
        return {
            "schema_key": self.schema_key,
            "schema_name": self.schema_name,
            "source": self.source,
            "confidence": self.confidence,
            "mappings": self.mappings,
            "categories": self.categories,
            "unrecognized": self.unrecognized,
            "column_confidences": self.column_confidences,
        }


# ---------------------------------------------------------------------------
# Rule-based detection
# ---------------------------------------------------------------------------

def _try_rule_match(headers: list) -> "ColumnDetectionResult | None":
    """
    Attempt to match headers against each registered schema.
    Returns the best-matching result if confidence >= 0.5, else None.
    """
    normalised = [_normalise(h) for h in headers]
    best_result = None
    best_confidence = 0.0

    for schema_key, alias_index in _SCHEMA_INDEXES.items():
        schema = SCHEMA_REGISTRY[schema_key]
        mappings = {}
        categories = {}
        unrecognized = []
        matched = 0

        for original, norm in zip(headers, normalised):
            canonical = alias_index.get(norm)
            if canonical:
                mappings[original] = canonical
                categories[canonical] = schema["columns"][canonical]["category"]
                matched += 1
            else:
                mappings[original] = CAT_UNKNOWN
                unrecognized.append(original)

        total = len(headers)
        confidence = matched / total if total else 0.0

        if confidence > best_confidence:
            best_confidence = confidence
            best_result = ColumnDetectionResult(
                schema_key=schema_key,
                schema_name=schema["name"],
                source="rule",
                confidence=round(confidence, 3),
                mappings=mappings,
                categories=categories,
                unrecognized=unrecognized,
            )

    if best_result and best_confidence >= 0.5:
        return best_result
    return None


# ---------------------------------------------------------------------------
# LLM fallback
# ---------------------------------------------------------------------------

_LLM_SYSTEM_PROMPT = """You are a data schema expert. Given a list of spreadsheet column headers and sample rows, identify what each column represents.

Respond with a JSON object in exactly this format:
{
  "schema_name": "Brief name describing this data format",
  "confidence": 0.85,
  "columns": [
    {
      "original": "original column header",
      "canonical": "snake_case semantic name or 'unknown'",
      "category": "one of: identifier, financial, engagement, conversion, performance_ratio, unknown",
      "confidence": 0.95
    }
  ]
}

Rules:
- Use 'unknown' for canonical/category when you cannot reliably identify a column.
- Never guess at financial or conversion columns — only label them if you are confident.
- confidence at the top level is a float 0.0-1.0 for overall schema certainty.
- confidence inside each column entry is a float 0.0-1.0 for that specific column.
- canonical must be snake_case or 'unknown'.
"""

# Maximum number of sample rows to include in the LLM prompt.
_LLM_SAMPLE_ROW_LIMIT = 3


def _try_llm_fallback(headers: list, sample_rows: list = None) -> ColumnDetectionResult:
    """
    Use Dify (Gemini) workflow to identify unknown columns.

    Args:
        headers:     list of column header strings.
        sample_rows: optional list of row dicts (keyed by header) to help the
                     LLM identify column types from actual values.  At most
                     _LLM_SAMPLE_ROW_LIMIT rows are sent to keep prompt size small.

    Falls back to a full-unknown result if the LLM call fails.
    """
    from django.conf import settings
    from .dify_workflows import run_dify_workflow

    api_key = getattr(settings, "DIFY_COLUMN_DETECTION_API_KEY", "") or os.environ.get("DIFY_COLUMN_DETECTION_API_KEY", "")
    api_url = getattr(settings, "DIFY_API_URL", "") or os.environ.get("DIFY_API_URL", "")

    if not api_key:
        logger.warning("DIFY_COLUMN_DETECTION_API_KEY not set; skipping LLM column detection")
        return _unknown_result(headers)
    if not api_url:
        logger.warning("DIFY_API_URL not set; skipping LLM column detection")
        return _unknown_result(headers)

    try:
        rows_to_send = (sample_rows or [])[:_LLM_SAMPLE_ROW_LIMIT]
        outputs = run_dify_workflow(
            api_url=api_url,
            api_key=api_key,
            inputs={
                "column_headers": ", ".join(headers),
                "sample_rows": json.dumps(rows_to_send, default=str),
            },
            timeout=60,
        )

        # The output variable from the Dify workflow end node
        raw = outputs.get("text") or outputs.get("result") or ""
        if not raw:
            logger.warning("Dify column detection returned empty output: %s", outputs)
            return _unknown_result(headers)

        raw = raw.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw)

        parsed = json.loads(raw)
        return _parse_llm_response(headers, parsed)

    except Exception:
        logger.exception("LLM column detection failed; falling back to unknown")
        return _unknown_result(headers)


def _parse_llm_response(headers: list, parsed: dict) -> ColumnDetectionResult:
    """Convert the LLM JSON response into a ColumnDetectionResult."""
    schema_name = parsed.get("schema_name", "Unknown format")
    confidence = float(parsed.get("confidence", 0.0))
    columns_list = parsed.get("columns", [])

    # Normalise keys for case-insensitive / whitespace-underscore-insensitive matching
    # e.g. "Campaign Name" matches "campaign_name"
    columns_by_original = {_normalise(c["original"]): c for c in columns_list}

    mappings = {}
    categories = {}
    column_confidences = {}
    unrecognized = []

    for header in headers:
        col_info = columns_by_original.get(_normalise(header), {})
        canonical = col_info.get("canonical", "unknown") or "unknown"
        category = col_info.get("category", CAT_UNKNOWN) or CAT_UNKNOWN
        col_confidence = float(col_info.get("confidence", 0.0))

        if canonical == "unknown":
            mappings[header] = CAT_UNKNOWN
            column_confidences[header] = 0.0
            unrecognized.append(header)
        else:
            mappings[header] = canonical
            categories[canonical] = category
            column_confidences[header] = round(col_confidence, 3)

    return ColumnDetectionResult(
        schema_key=None,
        schema_name=schema_name,
        source="llm",
        confidence=round(confidence, 3),
        mappings=mappings,
        categories=categories,
        unrecognized=unrecognized,
        column_confidences=column_confidences,
    )


def _unknown_result(headers: list) -> ColumnDetectionResult:
    """Fallback when all detection paths fail."""
    return ColumnDetectionResult(
        schema_key=None,
        schema_name="Unknown format",
        source="none",
        confidence=0.0,
        mappings={h: CAT_UNKNOWN for h in headers},
        categories={},
        unrecognized=list(headers),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_columns(headers: list, sample_rows: list = None) -> ColumnDetectionResult:
    """
    Detect what each column header represents.

    Tries rule-based matching first (instant, no LLM cost).  If confidence
    falls below 0.5 the LLM fallback is used instead, optionally enriched
    with sample row values to improve classification accuracy.

    Args:
        headers:     list of column header strings from the uploaded file.
        sample_rows: optional list of row dicts sent to the LLM fallback so it
                     can infer column types from actual data values.

    Returns:
        ColumnDetectionResult with mappings, categories, confidence score,
        and per-column confidence scores.
    """
    if not headers:
        return _unknown_result([])

    result = _try_rule_match(headers)
    if result is not None:
        logger.info(
            "Column detection: rule match schema=%s confidence=%.2f",
            result.schema_key,
            result.confidence,
        )
        return result

    logger.info("Column detection: no rule match; falling back to LLM")
    return _try_llm_fallback(headers, sample_rows=sample_rows)


def normalize_spreadsheet(data: dict, column_mapping: dict) -> dict:
    """
    Rename spreadsheet columns according to an approved column mapping.

    Args:
        data: spreadsheet_data dict with structure:
              {"name": ..., "sheets": [{"columns": [...], "rows": [...]}]}
        column_mapping: {original_header: canonical_name} — from ColumnDetectionResult,
                        possibly edited by the user. "unknown" values are left as-is.

    Returns:
        New data dict with columns/rows renamed according to the mapping.
        Columns mapped to "unknown" retain their original names.
    """
    if not column_mapping:
        return data

    normalized = {"name": data.get("name", ""), "sheets": []}

    for sheet in data.get("sheets", []):
        original_cols = sheet.get("columns", [])
        col_rename_map = {}
        renamed_cols = []

        for col in original_cols:
            canonical = column_mapping.get(col, col)
            # Columns labeled "unknown" keep their original name
            new_name = col if canonical == CAT_UNKNOWN else canonical
            col_rename_map[col] = new_name
            renamed_cols.append(new_name)

        renamed_rows = []
        for row in sheet.get("rows", []):
            new_row = {}
            for orig_key, value in row.items():
                new_key = col_rename_map.get(orig_key, orig_key)
                new_row[new_key] = value
            renamed_rows.append(new_row)

        normalized["sheets"].append({
            "name": sheet.get("name", ""),
            "columns": renamed_cols,
            "rows": renamed_rows,
        })

    return normalized
