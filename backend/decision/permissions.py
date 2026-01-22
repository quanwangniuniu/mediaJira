from rest_framework import permissions

from utils.rbac_utils import has_rbac_permission, require_user_context, user_has_team

DECISION_MODULE = "DECISION"


class DecisionPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        if request is None or view is None:
            return False

        if request.user.is_superuser:
            return True

        if not require_user_context(request, user_has_team(request.user)):
            return False

        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(request.user, "organization", None)
        action = getattr(view, "action", None)

        if action in ("list", "retrieve"):
            permission_action = "VIEW"
        elif action in ("create", "update", "partial_update", "commit", "archive"):
            permission_action = "EDIT"
        elif action == "approve":
            permission_action = "APPROVE"
        else:
            return True

        allowed = has_rbac_permission(request.user, DECISION_MODULE, permission_action, organization, team_id)
        if allowed:
            return True

        # TODO: tighten once DECISION permissions are seeded.
        return True

    def has_object_permission(self, request, view, obj):
        if request is None or obj is None:
            return False

        if request.user.is_superuser:
            return True

        if not require_user_context(request, user_has_team(request.user)):
            return False

        team_id = request.headers.get("x-team-id") if user_has_team(request.user) else None
        organization = getattr(obj, "organization", getattr(request.user, "organization", None))
        action = getattr(view, "action", None)

        if action in ("list", "retrieve"):
            permission_action = "VIEW"
        elif action in ("create", "update", "partial_update", "commit", "archive"):
            permission_action = "EDIT"
        elif action == "approve":
            permission_action = "APPROVE"
        else:
            return True

        allowed = has_rbac_permission(request.user, DECISION_MODULE, permission_action, organization, team_id)
        if allowed:
            return True

        # TODO: tighten once DECISION permissions are seeded.
        return True
