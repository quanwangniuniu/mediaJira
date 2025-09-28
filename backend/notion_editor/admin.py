from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
import json
from .models import Draft, ContentBlock, BlockAction


@admin.register(Draft)
class DraftAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'user', 'status', 'get_content_blocks_count', 
        'created_at', 'updated_at'
    ]
    list_filter = ['status', 'created_at', 'updated_at', 'user']
    search_fields = ['title', 'user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at', 'content_blocks_preview']
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'user', 'status')
        }),
        ('Content', {
            'fields': ('content_blocks', 'content_blocks_preview'),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_content_blocks_count(self, obj):
        """Display the number of content blocks"""
        if isinstance(obj.content_blocks, list):
            return len(obj.content_blocks)
        return 0
    get_content_blocks_count.short_description = 'Blocks Count'
    
    def content_blocks_preview(self, obj):
        """Preview of content blocks in a readable format"""
        if not obj.content_blocks:
            return "No content blocks"
        
        preview_html = "<div style='max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px;'>"
        
        for i, block in enumerate(obj.content_blocks):
            block_type = block.get('type', 'unknown')
            content = block.get('content', '')
            
            preview_html += f"""
            <div style='margin-bottom: 10px; padding: 5px; border-left: 3px solid #007cba;'>
                <strong>Block {i+1} ({block_type}):</strong><br>
                <div style='margin-left: 10px; color: #666;'>
                    {str(content)[:200]}{'...' if len(str(content)) > 200 else ''}
                </div>
            </div>
            """
        
        preview_html += "</div>"
        return mark_safe(preview_html)
    content_blocks_preview.short_description = 'Content Blocks Preview'
    
    def save_model(self, request, obj, form, change):
        """Custom save to ensure JSON field is properly formatted"""
        if isinstance(obj.content_blocks, str):
            try:
                obj.content_blocks = json.loads(obj.content_blocks)
            except json.JSONDecodeError:
                obj.content_blocks = []
        super().save_model(request, obj, form, change)


class BlockActionInline(admin.TabularInline):
    model = BlockAction
    extra = 0
    fields = ['action_type', 'label', 'icon', 'is_enabled', 'order']


@admin.register(ContentBlock)
class ContentBlockAdmin(admin.ModelAdmin):
    list_display = [
        'get_draft_title', 'block_type', 'get_content_preview', 
        'order', 'created_at'
    ]
    list_filter = ['block_type', 'created_at', 'draft__status']
    search_fields = ['draft__title', 'content']
    readonly_fields = ['created_at', 'updated_at', 'content_preview']
    inlines = [BlockActionInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('draft', 'block_type', 'order')
        }),
        ('Content', {
            'fields': ('content', 'content_preview'),
            'classes': ('wide',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_draft_title(self, obj):
        """Display the draft title"""
        return obj.draft.title
    get_draft_title.short_description = 'Draft Title'
    get_draft_title.admin_order_field = 'draft__title'
    
    def get_content_preview(self, obj):
        """Display a preview of the content"""
        content = obj.get_text_content()
        return content[:100] + "..." if len(content) > 100 else content
    get_content_preview.short_description = 'Content Preview'
    
    def content_preview(self, obj):
        """Detailed content preview"""
        if not obj.content:
            return "No content"
        
        preview_html = f"""
        <div style='max-height: 200px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; background: #f9f9f9;'>
            <strong>Raw JSON:</strong><br>
            <pre style='white-space: pre-wrap; font-size: 12px;'>{json.dumps(obj.content, indent=2, ensure_ascii=False)}</pre>
        </div>
        """
        return mark_safe(preview_html)
    content_preview.short_description = 'Content Preview (JSON)'


@admin.register(BlockAction)
class BlockActionAdmin(admin.ModelAdmin):
    list_display = [
        'get_block_info', 'action_type', 'label', 'icon', 
        'is_enabled', 'order'
    ]
    list_filter = ['action_type', 'is_enabled', 'created_at']
    search_fields = ['label', 'block__draft__title']
    readonly_fields = ['created_at']
    
    def get_block_info(self, obj):
        """Display block information"""
        return f"{obj.block.draft.title} - {obj.block.get_block_type_display()}"
    get_block_info.short_description = 'Block Info'
    get_block_info.admin_order_field = 'block__draft__title'


# Customize admin site
admin.site.site_header = "MediaJira Notion Editor Admin"
admin.site.site_title = "Notion Editor Admin"
admin.site.index_title = "Welcome to Notion Editor Administration"


