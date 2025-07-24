# Please extend this mapping as needed
# Delete the unnecessary mappings
PERMISSION_MAPPINGS = {
    # Key: (setting_key, module_scope) -> Value: required_permission
    ("campaign_failure", "campaigns"): "CAMPAIGN:VIEW",
    ("budget_alert", "budget"): "BUDGET:VIEW", 
    ("asset_alert", "assets"): "ASSET:VIEW",
    # If there is no permission requirement, set Value to None
    ("task_due", "general"): None
}