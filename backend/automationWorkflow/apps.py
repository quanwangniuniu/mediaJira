from django.apps import AppConfig


class AutomationWorkflowConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    # Python module path for this app
    name = "automationWorkflow"
    # Keep the historical app label so existing migrations and tables stay valid
    label = "workflows"
