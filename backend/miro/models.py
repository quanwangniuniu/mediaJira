import uuid
from django.db import models


class Board(models.Model):
    """
    Board model representing a MIRO-style collaborative board.
    Each board belongs to a project and can contain multiple board items.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'core.Project',
        on_delete=models.CASCADE,
        related_name='boards',
        help_text="Project this board belongs to"
    )
    title = models.CharField(
        max_length=200,
        help_text="Title of the board"
    )
    share_token = models.CharField(
        max_length=24,
        unique=True,
        db_index=True,
        help_text="Token for sharing the board"
    )
    viewport = models.JSONField(
        default=dict,
        help_text="Viewport information (position, zoom, etc.)"
    )
    is_archived = models.BooleanField(
        default=False,
        help_text="Whether the board is archived"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['project', 'is_archived']),
            models.Index(fields=['share_token']),
        ]

    def __str__(self):
        return f"{self.title} ({self.id})"


class BoardItem(models.Model):
    """
    BoardItem model representing an item on a board.
    Items can be nested (parent-child relationship) and have positioning/styling information.
    """
    class ItemType(models.TextChoices):
        TEXT = 'text', 'Text'
        SHAPE = 'shape', 'Shape'
        STICKY_NOTE = 'sticky_note', 'Sticky Note'
        FRAME = 'frame', 'Frame'
        LINE = 'line', 'Line'
        CONNECTOR = 'connector', 'Connector'
        FREEHAND = 'freehand', 'Freehand'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(
        'Board',
        on_delete=models.CASCADE,
        related_name='items',
        help_text="Board this item belongs to"
    )
    type = models.CharField(
        max_length=20,
        choices=ItemType.choices,
        help_text="Type of the board item"
    )
    parent_item = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_items',
        help_text="Parent item if this item is nested"
    )
    x = models.FloatField(help_text="X coordinate position")
    y = models.FloatField(help_text="Y coordinate position")
    width = models.FloatField(help_text="Width of the item")
    height = models.FloatField(help_text="Height of the item")
    rotation = models.FloatField(
        null=True,
        blank=True,
        help_text="Rotation angle in degrees"
    )
    style = models.JSONField(
        default=dict,
        help_text="Styling information for the item"
    )
    content = models.TextField(
        blank=True,
        default="",
        help_text="Content of the board item (text, etc.)"
    )
    z_index = models.IntegerField(
        default=0,
        help_text="Z-index for layering items"
    )
    is_deleted = models.BooleanField(
        default=False,
        help_text="Whether the item is soft-deleted"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['z_index', 'created_at']
        indexes = [
            models.Index(fields=['board', 'is_deleted']),
            models.Index(fields=['parent_item']),
        ]

    def __str__(self):
        return f"{self.get_type_display()} - {self.id}"


class BoardRevision(models.Model):
    """
    BoardRevision model representing a snapshot/version of a board.
    Revisions are immutable and track the history of board changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    board = models.ForeignKey(
        'Board',
        on_delete=models.CASCADE,
        related_name='revisions',
        help_text="Board this revision belongs to"
    )
    version = models.IntegerField(help_text="Version number of the revision")
    snapshot = models.JSONField(
        default=dict,
        help_text="Snapshot of the board state at this revision"
    )
    note = models.TextField(
        null=True,
        blank=True,
        help_text="Optional note about this revision"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version', '-created_at']
        unique_together = ['board', 'version']
        indexes = [
            models.Index(fields=['board', 'version']),
        ]

    def __str__(self):
        return f"Revision {self.version} of {self.board.title} ({self.id})"

