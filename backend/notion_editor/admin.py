from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import get_object_or_404, redirect
from django.http import JsonResponse, HttpResponse
from django.contrib import messages
from django.core.paginator import Paginator
from django.db.models import Q
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
        """Detailed content preview with Notion-style formatting"""
        if not obj.content:
            return "No content"

        # Show formatted HTML for rich text blocks
        formatted_html = ""
        if obj.block_type == 'rich_text':
            try:
                formatted_html = f"""
                <div style='margin-bottom: 10px; padding: 10px; background: #fff; border: 1px solid #ccc;'>
                    <strong>Formatted Preview:</strong><br>
                    <div style='margin-top: 5px; padding: 10px; background: #f0f8ff; border-left: 3px solid #007cba;'>
                        {obj.get_notion_formatted_html()}
                    </div>
                </div>
                """

                # Validate Notion content
                is_valid, error_msg = obj.validate_notion_content()
                if not is_valid:
                    formatted_html += f"""
                    <div style='padding: 5px; background: #ffeeee; border: 1px solid #ffcccc; color: #cc0000;'>
                        <strong>Validation Error:</strong> {error_msg}
                    </div>
                    """
            except Exception as e:
                formatted_html = f"""
                <div style='padding: 5px; background: #ffeeee; border: 1px solid #ffcccc; color: #cc0000;'>
                    <strong>Error rendering preview:</strong> {str(e)}
                </div>
                """

        preview_html = f"""
        <div style='max-height: 400px; overflow-y: auto;'>
            {formatted_html}
            <div style='border: 1px solid #ddd; padding: 10px; background: #f9f9f9;'>
                <strong>Raw JSON:</strong><br>
                <pre style='white-space: pre-wrap; font-size: 11px; max-height: 150px; overflow-y: auto;'>{json.dumps(obj.content, indent=2, ensure_ascii=False)}</pre>
            </div>
        </div>
        """
        return mark_safe(preview_html)
    content_preview.short_description = 'Content Preview'


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


# Custom Admin Views (Backend Only - No Templates Required)

@staff_member_required
def draft_list_api(request):
    """API endpoint to list drafts with search and filtering"""
    drafts = Draft.objects.select_related('user').all()
    
    # Search functionality
    search_query = request.GET.get('q', '')
    if search_query:
        drafts = drafts.filter(
            Q(title__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(user__email__icontains=search_query)
        )
    
    # Status filter
    status_filter = request.GET.get('status', '')
    if status_filter:
        drafts = drafts.filter(status=status_filter)
    
    # Order by updated date
    drafts = drafts.order_by('-updated_at')
    
    # Pagination
    page = int(request.GET.get('page', 1))
    paginator = Paginator(drafts, 20)
    page_obj = paginator.get_page(page)
    
    # Serialize data
    draft_data = []
    for draft in page_obj:
        draft_data.append({
            'id': draft.id,
            'title': draft.title,
            'user': draft.user.username,
            'status': draft.status,
            'content_blocks_count': draft.get_content_blocks_count(),
            'created_at': draft.created_at.isoformat(),
            'updated_at': draft.updated_at.isoformat(),
        })
    
    return JsonResponse({
        'drafts': draft_data,
        'page': page_obj.number,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
        'has_next': page_obj.has_next(),
        'has_previous': page_obj.has_previous(),
    })


@staff_member_required
def draft_detail_api(request, pk):
    """API endpoint to get draft details with content blocks"""
    draft = get_object_or_404(Draft.objects.select_related('user'), pk=pk)
    content_blocks = draft.blocks.all().order_by('order')
    
    # Serialize content blocks
    blocks_data = []
    for block in content_blocks:
        actions_data = []
        for action in block.actions.all().order_by('order'):
            actions_data.append({
                'id': action.id,
                'action_type': action.action_type,
                'label': action.label,
                'icon': action.icon,
                'is_enabled': action.is_enabled,
                'order': action.order,
            })
        
        blocks_data.append({
            'id': block.id,
            'block_type': block.block_type,
            'content': block.content,
            'order': block.order,
            'text_content': block.get_text_content(),
            'actions': actions_data,
            'created_at': block.created_at.isoformat(),
        })
    
    draft_data = {
        'id': draft.id,
        'title': draft.title,
        'user': {
            'id': draft.user.id,
            'username': draft.user.username,
            'email': draft.user.email,
        },
        'status': draft.status,
        'content_blocks': draft.content_blocks,
        'structured_blocks': blocks_data,
        'created_at': draft.created_at.isoformat(),
        'updated_at': draft.updated_at.isoformat(),
        'is_deleted': draft.is_deleted,
    }
    
    return JsonResponse({'draft': draft_data})


@staff_member_required
def draft_action_api(request, pk, action):
    """API endpoint to handle draft actions"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Only POST method allowed'}, status=405)
    
    draft = get_object_or_404(Draft, pk=pk)
    
    if action == "publish":
        draft.status = 'published'
        message = f'Draft "{draft.title}" has been published.'
    elif action == "archive":
        draft.status = 'archived'
        message = f'Draft "{draft.title}" has been archived.'
    elif action == "restore":
        draft.status = 'draft'
        message = f'Draft "{draft.title}" has been restored to draft status.'
    elif action == "delete":
        draft.is_deleted = True
        message = f'Draft "{draft.title}" has been marked as deleted.'
    else:
        return JsonResponse({'error': f'Unknown action: {action}'}, status=400)
    
    draft.save(update_fields=['status', 'is_deleted', 'updated_at'])
    
    return JsonResponse({
        'success': True,
        'message': message,
        'draft': {
            'id': draft.id,
            'status': draft.status,
            'is_deleted': draft.is_deleted,
        }
    })


@staff_member_required
def content_block_list_api(request):
    """API endpoint to list content blocks"""
    blocks = ContentBlock.objects.select_related('draft', 'draft__user').all()
    
    # Filter by block type
    block_type = request.GET.get('block_type', '')
    if block_type:
        blocks = blocks.filter(block_type=block_type)
    
    # Search functionality
    search_query = request.GET.get('q', '')
    if search_query:
        blocks = blocks.filter(
            Q(draft__title__icontains=search_query) |
            Q(content__icontains=search_query)
        )
    
    blocks = blocks.order_by('-created_at')
    
    # Pagination
    page = int(request.GET.get('page', 1))
    paginator = Paginator(blocks, 20)
    page_obj = paginator.get_page(page)
    
    # Serialize data
    blocks_data = []
    for block in page_obj:
        blocks_data.append({
            'id': block.id,
            'draft_title': block.draft.title,
            'draft_id': block.draft.id,
            'block_type': block.block_type,
            'content_preview': block.get_text_content()[:100],
            'order': block.order,
            'created_at': block.created_at.isoformat(),
        })
    
    return JsonResponse({
        'blocks': blocks_data,
        'page': page_obj.number,
        'total_pages': paginator.num_pages,
        'total_count': paginator.count,
    })


@staff_member_required
def admin_dashboard_api(request):
    """API endpoint for admin dashboard statistics"""
    stats = {
        'total_drafts': Draft.objects.count(),
        'published_drafts': Draft.objects.filter(status='published').count(),
        'draft_drafts': Draft.objects.filter(status='draft').count(),
        'archived_drafts': Draft.objects.filter(status='archived').count(),
        'deleted_drafts': Draft.objects.filter(is_deleted=True).count(),
        'total_blocks': ContentBlock.objects.count(),
        'total_actions': BlockAction.objects.count(),
    }
    
    # Recent drafts
    recent_drafts = Draft.objects.select_related('user').order_by('-updated_at')[:10]
    recent_drafts_data = []
    for draft in recent_drafts:
        recent_drafts_data.append({
            'id': draft.id,
            'title': draft.title,
            'user': draft.user.username,
            'status': draft.status,
            'updated_at': draft.updated_at.isoformat(),
        })
    
    return JsonResponse({
        'stats': stats,
        'recent_drafts': recent_drafts_data,
    })


@staff_member_required
def draft_simple_view(request, pk):
    """Simple text-based view of a draft (no templates needed)"""
    draft = get_object_or_404(Draft.objects.select_related('user'), pk=pk)
    content_blocks = draft.blocks.all().order_by('order')
    
    # Create simple HTML response
    html = f"""
    <html>
    <head><title>Draft: {draft.title}</title></head>
    <body style="font-family: Arial, sans-serif; margin: 20px;">
        <h1>Draft: {draft.title}</h1>
        <p><strong>User:</strong> {draft.user.username} ({draft.user.email})</p>
        <p><strong>Status:</strong> {draft.status}</p>
        <p><strong>Created:</strong> {draft.created_at}</p>
        <p><strong>Updated:</strong> {draft.updated_at}</p>
        
        <h2>Content Blocks ({len(content_blocks)} blocks)</h2>
    """
    
    for i, block in enumerate(content_blocks):
        html += f"""
        <div style="border: 1px solid #ddd; margin: 10px 0; padding: 10px;">
            <h3>Block {i+1}: {block.get_block_type_display()}</h3>
            <p><strong>Content:</strong> {block.get_text_content()[:200]}...</p>
            <p><strong>Actions:</strong> {', '.join([a.label for a in block.actions.all()])}</p>
        </div>
        """
    
    html += """
        <hr>
        <p><a href="javascript:history.back()">← Back</a></p>
    </body>
    </html>
    """
    
    return HttpResponse(html)
