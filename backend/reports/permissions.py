# permissions.py —— Minimal RBAC
# Goal: provide three types of permission checks (view / edit / approve),
# based on Django Group roles (viewer/editor/approver/admin).
# Usage: in ViewSet.get_permissions(), return the corresponding permission
# class instance depending on the action.

from typing import Optional
from rest_framework.permissions import BasePermission, SAFE_METHODS
# Import DRF's BasePermission and the constant SAFE_METHODS (GET/HEAD/OPTIONS).

# ---------------------------
# Helper functions: role and ownership checks
# ---------------------------

def _has_role(user, role: str) -> bool:
    """Check if a user has a specific role."""
    if not getattr(user, "is_authenticated", False):  # reject if not logged in
        return False
    if role == "admin":  # check admin role
        # Consider is_staff as admin, or membership in the "admin" group
        return bool(getattr(user, "is_staff", False) or user.groups.filter(name="admin").exists())
    # For other roles (viewer/editor/approver), check group membership
    return user.groups.filter(name=role).exists()


def _get_report_owner_id(obj) -> Optional[str]:
    """Extract the owner_id from a given object if available."""
    # If object has owner_id (e.g. Report), return it
    if hasattr(obj, "owner_id"):
        return str(getattr(obj, "owner_id"))
    # If object has a related report (e.g. Section/Annotation/Asset/Job)
    if hasattr(obj, "report") and hasattr(obj.report, "owner_id"):
        return str(getattr(obj.report, "owner_id"))
    # If object is an approval record and has a report
    if hasattr(obj, "report") and obj.report is not None:
        return str(getattr(obj.report, "owner_id", ""))
    return None


def _is_owner(user, obj) -> bool:
    """Check if the current user is the owner of the object (or its parent report)."""
    if not getattr(user, "is_authenticated", False):  # not logged in → not owner
        return False
    owner_id = _get_report_owner_id(obj)
    if owner_id is None:  # no owner info available
        return False
    # user.id may be int/uuid, normalize to string for comparison
    return str(getattr(user, "id", "")) == str(owner_id)


# ---------------------------
# Permission class: read-only (view)
# ---------------------------

class IsReportViewer(BasePermission):
    """Allow users with viewer/editor/approver/admin role or the owner to perform read-only access."""

    def has_permission(self, request, view) -> bool:
        # For list/detail endpoints: allow only safe methods
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
                or _has_role(user, "admin")
            )
        # Disallow non-safe methods here (handled by other permission classes)
        return False

    def has_object_permission(self, request, view, obj) -> bool:
        # Object-level read-only: same as above, but also allow owner
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
                or _has_role(user, "admin")
                or _is_owner(user, obj)
            )
        return False


# ---------------------------
# Permission class: edit (create/update/delete)
# ---------------------------

class IsReportEditor(BasePermission):
    """Allow editor/admin or owner to perform write operations; read-only requests always pass."""

    def has_permission(self, request, view) -> bool:
        # Read-only methods: always allow, combined with IsReportViewer
        if request.method in SAFE_METHODS:
            return True
        # Write methods: check role at list-level (cannot check ownership yet)
        user = request.user
        return _has_role(user, "editor") or _has_role(user, "admin")

    def has_object_permission(self, request, view, obj) -> bool:
        # Object-level write: allow if editor/admin or the owner
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        return (
            _has_role(user, "editor")
            or _has_role(user, "admin")
            or _is_owner(user, obj)
        )


# ---------------------------
# Permission class: approval
# ---------------------------

class IsApprover(BasePermission):
    """Allow only approver/admin to perform approval-related actions (e.g. /approve)."""

    def has_permission(self, request, view) -> bool:
        user = request.user
        return _has_role(user, "approver") or _has_role(user, "admin")

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        return _has_role(user, "approver") or _has_role(user, "admin")


# ---------------------------
# Permission class: author/approver/admin (for annotations)
# ---------------------------

class IsAuthorApproverOrAdmin(BasePermission):
    """Allow editor/approver/admin or owner to create annotations and perform write operations."""

    def has_permission(self, request, view) -> bool:
        # Read-only methods: allow viewer+ roles
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
                or _has_role(user, "admin")
            )
        # Write methods: check role at list-level
        user = request.user
        return (
            _has_role(user, "editor")
            or _has_role(user, "approver")
            or _has_role(user, "admin")
        )

    def has_object_permission(self, request, view, obj) -> bool:
        # Object-level: allow if editor/approver/admin or the owner
        if request.method in SAFE_METHODS:
            user = request.user
            return (
                _has_role(user, "viewer")
                or _has_role(user, "editor")
                or _has_role(user, "approver")
                or _has_role(user, "admin")
                or _is_owner(user, obj)
            )
        user = request.user
        return (
            _has_role(user, "editor")
            or _has_role(user, "approver")
            or _has_role(user, "admin")
            or _is_owner(user, obj)
        )
