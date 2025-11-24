"""
Objective-to-KPI mapping helpers used by onboarding and suggestions API.
"""

# Objective to KPI mapping configuration
OBJECTIVE_TO_KPIS = {
    "awareness": [
        {"key": "impressions", "label": "Impressions"},
        {"key": "reach", "label": "Reach"},
        {"key": "ctr", "label": "Click-through Rate (CTR)"},
        {"key": "cpm", "label": "Cost per Mille (CPM)"},
        {"key": "frequency", "label": "Frequency"},
        {"key": "cost_per_thruplay", "label": "Cost per ThruPlay"},
    ],
    "consideration": [
        {"key": "ctr", "label": "Click-through Rate (CTR)"},
        {"key": "clicks", "label": "Clicks"},
        {"key": "sessions", "label": "Sessions"},
        {"key": "cpc", "label": "Cost per Click (CPC)"},
        {"key": "cpv", "label": "Cost per View (CPV)"},
        {"key": "engagement_rate", "label": "Engagement Rate"},
    ],
    "conversion": [
        {"key": "conversion_rate", "label": "Conversion Rate"},
        {"key": "cpa", "label": "Cost per Conversion (CPA)"},
        {"key": "cpl", "label": "Cost per Lead (CPL)"},
        {"key": "roas", "label": "Return on Ad Spend (ROAS)"},
        {"key": "cost_per_purchase", "label": "Cost per Purchase"},
        {"key": "revenue", "label": "Revenue"},
    ],
    "retention_loyalty": [
        {"key": "repeat_purchase_rate", "label": "Repeat Purchase Rate"},
        {"key": "ltv", "label": "Customer Lifetime Value (LTV)"},
        {"key": "roas", "label": "Return on Ad Spend (ROAS)"},
        {"key": "cost_per_reengaged_user", "label": "Cost per Re-engaged User"},
        {"key": "retention_rate", "label": "Retention Rate"},
        {"key": "revenue", "label": "Revenue"},
    ],
}


def get_kpi_suggestions(objectives):
    """
    Return merged, deduplicated KPI suggestions for the provided objectives list.
    """

    if not objectives:
        return []

    suggestions = {}
    for objective in objectives:
        for kpi in OBJECTIVE_TO_KPIS.get(objective, []):
            key = kpi["key"]
            if key not in suggestions:
                suggestions[key] = {
                    "key": key,
                    "label": kpi["label"],
                    "suggested_by": [objective],
                }
            else:
                if objective not in suggestions[key]["suggested_by"]:
                    suggestions[key]["suggested_by"].append(objective)

    return sorted(suggestions.values(), key=lambda item: item["key"])


def validate_kpi_key(kpi_key):
    """
    Check if a KPI key exists in the objective mapping.
    """

    if not kpi_key:
        return False

    return any(kpi_key == kpi["key"] for kpis in OBJECTIVE_TO_KPIS.values() for kpi in kpis)

