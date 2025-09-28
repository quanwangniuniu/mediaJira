from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinLengthValidator
import json

User = get_user_model()


class Draft(models.Model):
    """
    Notion-style draft document model
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('archived', 'Archived'),
    ]
    
    title = models.CharField(
        max_length=200,
        validators=[MinLengthValidator(1)],
        help_text="Draft title"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notion_drafts',
        help_text="Owner of this draft"
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        help_text="Current status of the draft"
    )
    content_blocks = models.JSONField(
        default=list,
        help_text="JSON array of content blocks"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    
    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['updated_at']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return self.title
    
    def get_content_blocks_count(self):
        """Get the number of content blocks"""
        if isinstance(self.content_blocks, list):
            return len(self.content_blocks)
        return 0
    
    def add_content_block(self, block_data):
        """Add a new content block"""
        if not isinstance(self.content_blocks, list):
            self.content_blocks = []
        
        # Generate unique ID for the block
        block_id = f"block_{len(self.content_blocks) + 1}_{self.id}"
        block_data['id'] = block_id
        self.content_blocks.append(block_data)
        self.save()
        return block_id
    
    def update_content_block(self, block_id, block_data):
        """Update an existing content block"""
        if not isinstance(self.content_blocks, list):
            return False
        
        for i, block in enumerate(self.content_blocks):
            if block.get('id') == block_id:
                block_data['id'] = block_id
                self.content_blocks[i] = block_data
                self.save()
                return True
        return False
    
    def delete_content_block(self, block_id):
        """Delete a content block"""
        if not isinstance(self.content_blocks, list):
            return False
        
        for i, block in enumerate(self.content_blocks):
            if block.get('id') == block_id:
                del self.content_blocks[i]
                self.save()
                return True
        return False


class ContentBlock(models.Model):
    """
    Individual content block model for more structured storage
    """
    BLOCK_TYPES = [
        ('text', 'Plain Text'),
        ('rich_text', 'Rich Text'),
        ('heading', 'Heading'),
        ('list', 'List'),
        ('quote', 'Quote'),
        ('code', 'Code Block'),
        ('divider', 'Divider'),
    ]
    
    draft = models.ForeignKey(
        Draft,
        on_delete=models.CASCADE,
        related_name='blocks',
        help_text="Parent draft"
    )
    block_type = models.CharField(
        max_length=20,
        choices=BLOCK_TYPES,
        default='text',
        help_text="Type of content block"
    )
    content = models.JSONField(
        default=dict,
        help_text="Block content and formatting"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order of the block in the draft"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['draft', 'order']),
            models.Index(fields=['block_type']),
        ]
    
    def __str__(self):
        return f"{self.get_block_type_display()} block in {self.draft.title}"
    
    def get_text_content(self):
        """Extract plain text content from the block"""
        if self.block_type == 'text':
            return self.content.get('text', '')
        elif self.block_type == 'rich_text':
            # Extract text from rich text formatting
            text_parts = []
            for item in self.content.get('content', []):
                if isinstance(item, dict) and 'text' in item:
                    text_parts.append(item['text'])
            return ''.join(text_parts)
        return str(self.content)


class BlockAction(models.Model):
    """
    Inline button actions for content blocks
    """
    ACTION_TYPES = [
        ('preview', 'Preview'),
        ('save', 'Save'),
        ('delete', 'Delete'),
        ('edit', 'Edit'),
        ('duplicate', 'Duplicate'),
        ('move_up', 'Move Up'),
        ('move_down', 'Move Down'),
    ]
    
    block = models.ForeignKey(
        ContentBlock,
        on_delete=models.CASCADE,
        related_name='actions',
        help_text="Content block this action belongs to"
    )
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_TYPES,
        help_text="Type of action"
    )
    label = models.CharField(
        max_length=50,
        help_text="Display label for the action button"
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Icon class or name for the button"
    )
    is_enabled = models.BooleanField(
        default=True,
        help_text="Whether this action is currently enabled"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Order of the action button"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', 'created_at']
        unique_together = ['block', 'action_type']
        indexes = [
            models.Index(fields=['block', 'order']),
            models.Index(fields=['action_type']),
        ]
    
    def __str__(self):
        return f"{self.get_action_type_display()} action for {self.block}"

