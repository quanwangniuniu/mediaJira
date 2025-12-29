import uuid
from django.db import models
from django.core.exceptions import ValidationError
from core.models import TimeStampedModel


class CanvasUserViewState(TimeStampedModel):
    """
    Per-user viewport persistence for the workflow canvas editor.

    Why this table exists:
    - Viewport is personal UI preference (zoom/pan), not shared workflow logic.
    - Storing it per-user avoids cross-user interference.
    - Allows reopening a workflow version canvas and restoring the last view.

    Scope:
    - ONLY stores viewport (zoom/pan + optional UI flags).
    - Does NOT store selection / clipboard / undo history.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="canvas_view_states",
        help_text="Tenant boundary for this view state",
    )

    workflow_version = models.ForeignKey(
        "workflows.WorkflowVersion",
        on_delete=models.CASCADE,
        related_name="canvas_view_states",
        help_text="Workflow version this view state belongs to",
    )

    user = models.ForeignKey(
        "core.CustomUser",
        on_delete=models.CASCADE,
        related_name="canvas_view_states",
        help_text="User who owns this view state",
    )

    viewport = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            "Viewport state JSON. Minimal:\n"
            "{ \"zoom\": 1.0, \"pan\": {\"x\": 0, \"y\": 0} }\n"
            "Optional extensions: grid/minimap flags, etc."
        ),
    )

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workflow_version", "user"],
                name="uniq_canvas_view_state_per_user_per_version",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "-updated_at"]),
            models.Index(fields=["user", "-updated_at"]),
            models.Index(fields=["workflow_version", "-updated_at"]),
        ]
        verbose_name = "Canvas User View State"
        verbose_name_plural = "Canvas User View States"

    def __str__(self):
        return f"Viewport: {self.user.email} / {self.workflow_version}"

    def clean(self):
        super().clean()

        if not isinstance(self.viewport, dict):
            raise ValidationError({"viewport": "viewport must be a JSON object (dict)"})

        # Enforce minimal schema (soft validation)
        zoom = self.viewport.get("zoom", 1.0)
        pan = self.viewport.get("pan", {"x": 0, "y": 0})

        if not isinstance(zoom, (int, float)) or zoom <= 0:
            raise ValidationError({"viewport": "viewport.zoom must be a positive number"})

        if not isinstance(pan, dict):
            raise ValidationError({"viewport": "viewport.pan must be an object: {x, y}"})

        if "x" not in pan or "y" not in pan:
            raise ValidationError({"viewport": "viewport.pan must contain keys: x, y"})

        if not isinstance(pan["x"], (int, float)) or not isinstance(pan["y"], (int, float)):
            raise ValidationError({"viewport": "viewport.pan.x and viewport.pan.y must be numbers"})

    def save(self, *args, **kwargs):
        # Apply minimal defaults (keeps data consistent)
        if not isinstance(self.viewport, dict):
            self.viewport = {}
        self.viewport.setdefault("zoom", 1.0)
        self.viewport.setdefault("pan", {"x": 0, "y": 0})
        super().save(*args, **kwargs)


class CanvasPatchEvent(TimeStampedModel):
    """
    Append-only patch/event log for the canvas editor.

    Primary goals:
    - Idempotency for autosave retries (client_id + client_op_id)
    - Debug/audit trail ("who changed what", "when")
    - Helps investigate version conflicts

    Not goals:
    - This is NOT undo/redo history.
      Undo/redo is frontend-only (50-step in-memory).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    organization = models.ForeignKey(
        "core.Organization",
        on_delete=models.CASCADE,
        related_name="canvas_patch_events",
        help_text="Tenant boundary for this patch event",
    )

    workflow_version = models.ForeignKey(
        "workflows.WorkflowVersion",
        on_delete=models.CASCADE,
        related_name="canvas_patch_events",
        help_text="Workflow version whose canvas was patched",
    )

    actor = models.ForeignKey(
        "core.CustomUser",
        on_delete=models.PROTECT,
        related_name="canvas_patch_events",
        help_text="User who performed the change",
    )

    client_id = models.CharField(
        max_length=64,
        db_index=True,
        help_text="Client/browser/tab identifier for grouping patch events",
    )

    client_op_id = models.UUIDField(
        db_index=True,
        help_text="Idempotency key for retry-safe autosave submission",
    )

    base_version = models.IntegerField(
        help_text="Client-side base version used for optimistic concurrency checks",
    )

    # If you don't maintain a separate canvas version, you can omit this field.
    # Keeping it helps debugging and correlating saves.
    new_version = models.IntegerField(
        null=True,
        blank=True,
        help_text="Server-side resulting version after patch apply (optional)",
    )

    patches = models.JSONField(
        default=list,
        blank=True,
        help_text="DocPatch[] payload (opaque to backend at this layer)",
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["workflow_version", "client_id", "client_op_id"],
                name="uniq_canvas_patch_idempotency_per_version",
            )
        ]
        indexes = [
            models.Index(fields=["organization", "-created_at"]),
            models.Index(fields=["workflow_version", "-created_at"]),
        ]
        verbose_name = "Canvas Patch Event"
        verbose_name_plural = "Canvas Patch Events"

    def __str__(self):
        return f"CanvasPatchEvent({self.workflow_version_id}) by {self.actor_id}"

    def clean(self):
        super().clean()

        if not isinstance(self.patches, list):
            raise ValidationError({"patches": "patches must be a JSON array (list)"})

        if not isinstance(self.base_version, int) or self.base_version < 0:
            raise ValidationError({"base_version": "base_version must be a non-negative integer"})
