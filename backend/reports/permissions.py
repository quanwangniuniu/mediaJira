# permissions.py —— Minimal RBAC
# Goal: provide three types of permission checks (view / edit / approve),
# based on Django Group roles (viewer/editor/approver).
# Usage: in View.get_permissions() or direct permission checks, return the corresponding permission
# class instance depending on the action.

from rest_framework.permissions import BasePermission, SAFE_METHODS
# Import DRF's BasePermission and the constant SAFE_METHODS (GET/HEAD/OPTIONS).

# ---------------------------
# Helper functions: role checks
# ---------------------------

def _has_role(user, role: str) -> bool:
    """Check if a user has a specific role."""
    if not getattr(user, "is_authenticated", False):  # reject if not logged in
        return False
    # Check group membership for all roles
    return user.groups.filter(name=role).exists()


# ---------------------------
# Permission class: read-only (view)
# ---------------------------

class IsReportViewer(BasePermission):
    """Allow users with viewer/editor/approver role to perform read-only access."""

    def has_permission(self, request, view) -> bool:
        # For list/detail endpoints: allow only safe methods
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
            )
        # Disallow non-safe methods here (handled by other permission classes)
        return False

    def has_object_permission(self, request, view, obj) -> bool:
        # Object-level read-only: same as above
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
            )
        return False


# ---------------------------
# Permission class: edit (create/update/delete)
# ---------------------------

class IsReportEditor(BasePermission):
    """Allow editor role to perform write operations; read-only requests always pass."""

    def has_permission(self, request, view) -> bool:
        # Read-only methods: always allow, combined with IsReportViewer
        if request.method in SAFE_METHODS:
            return True
        # Write methods: check role at list-level
        user = request.user
        return _has_role(user, "editor")

    def has_object_permission(self, request, view, obj) -> bool:
        # Object-level write: allow if editor
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return _has_role(user, "editor")


# ---------------------------
# Permission class: approval
# ---------------------------

class IsApprover(BasePermission):
    """Allow only approver role to perform approval-related actions (e.g. /approve)."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        return _has_role(user, "approver")

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        return _has_role(user, "approver")


# ---------------------------
# Permission class: author/approver (for annotations)
# ---------------------------

class IsAuthorApproverOrAdmin(BasePermission):
    """Allow editor/approver role to create annotations and perform write operations."""

    def has_permission(self, request, view) -> bool:
        # Read-only methods: allow viewer+ roles
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
            )
        # Write methods: check role at list-level
        user = request.user
        return (
            _has_role(user, "editor")
            or _has_role(user, "approver")
        )

    def has_object_permission(self, request, view, obj) -> bool:
        # Object-level: allow if editor/approver
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
            )
        user = request.user
        return (
            _has_role(user, "editor")
            or _has_role(user, "approver")
        )
