from django.contrib import admin
from django.utils.html import format_html
from .models import Chat, ChatParticipant, Message, MessageStatus


class ChatParticipantInline(admin.TabularInline):
    """Inline admin for chat participants"""
    model = ChatParticipant
    extra = 0
    readonly_fields = ['joined_at', 'last_read_at']
    fields = ['user', 'is_active', 'joined_at', 'last_read_at']
    # autocomplete_fields = ['user']


class MessageInline(admin.TabularInline):
    """Inline admin for messages"""
    model = Message
    extra = 0
    readonly_fields = ['created_at', 'sender']
    fields = ['sender', 'content', 'message_type', 'created_at']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    """Admin interface for Chat model"""
    
    list_display = [
        'id',
        'chat_type',
        'name_or_participants',
        'project',
        'participant_count',
        'created_by',
        'created_at',
        'updated_at',
    ]
    
    list_filter = [
        'chat_type',
        'created_at',
        'updated_at',
    ]
    
    search_fields = [
        'name',
        'project__name',
        'created_by__email',
        'participants__user__email',
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'participant_count',
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('project', 'chat_type', 'name', 'created_by')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'participant_count'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [ChatParticipantInline, MessageInline]
    
    # Note: autocomplete_fields removed as Project admin may not be registered
    # autocomplete_fields = ['project', 'created_by']
    
    def name_or_participants(self, obj):
        """Display chat name or participant emails"""
        return str(obj)
    name_or_participants.short_description = 'Chat Name'
    
    def participant_count(self, obj):
        """Display number of active participants"""
        count = obj.get_participant_count()
        return format_html(
            '<span style="font-weight: bold;">{}</span>',
            count
        )
    participant_count.short_description = 'Participants'


@admin.register(ChatParticipant)
class ChatParticipantAdmin(admin.ModelAdmin):
    """Admin interface for ChatParticipant model"""
    
    list_display = [
        'id',
        'user',
        'chat',
        'is_active',
        'joined_at',
        'last_read_at',
    ]
    
    list_filter = [
        'is_active',
        'joined_at',
    ]
    
    search_fields = [
        'user__email',
        'chat__name',
        'chat__project__name',
    ]
    
    readonly_fields = [
        'joined_at',
        'created_at',
        'updated_at',
    ]
    
    # autocomplete_fields = ['chat', 'user']
    
    fieldsets = (
        ('Participation', {
            'fields': ('chat', 'user', 'is_active')
        }),
        ('Activity', {
            'fields': ('joined_at', 'last_read_at')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class MessageStatusInline(admin.TabularInline):
    """Inline admin for message statuses"""
    model = MessageStatus
    extra = 0
    readonly_fields = ['timestamp']
    fields = ['user', 'status', 'timestamp']
    # autocomplete_fields = ['user']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    """Admin interface for Message model"""
    
    list_display = [
        'id',
        'sender',
        'chat',
        'message_type',
        'content_preview',
        'created_at',
    ]
    
    list_filter = [
        'message_type',
        'created_at',
    ]
    
    search_fields = [
        'content',
        'sender__email',
        'chat__name',
        'chat__project__name',
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Message Information', {
            'fields': ('chat', 'sender', 'message_type', 'content')
        }),
        ('Metadata', {
            'fields': ('metadata', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [MessageStatusInline]
    
    # autocomplete_fields = ['chat', 'sender']
    
    def content_preview(self, obj):
        """Display message content preview"""
        max_length = 50
        if len(obj.content) > max_length:
            return obj.content[:max_length] + '...'
        return obj.content
    content_preview.short_description = 'Content'


@admin.register(MessageStatus)
class MessageStatusAdmin(admin.ModelAdmin):
    """Admin interface for MessageStatus model"""
    
    list_display = [
        'id',
        'user',
        'message',
        'status',
        'timestamp',
    ]
    
    list_filter = [
        'status',
        'timestamp',
    ]
    
    search_fields = [
        'user__email',
        'message__content',
    ]
    
    readonly_fields = [
        'timestamp',
        'created_at',
        'updated_at',
    ]
    
    # autocomplete_fields = ['message', 'user']
    
    fieldsets = (
        ('Status Information', {
            'fields': ('message', 'user', 'status')
        }),
        ('Timestamps', {
            'fields': ('timestamp', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

