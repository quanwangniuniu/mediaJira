from django.contrib import admin
from .models import ContentBlock, EmailDraft, Workflow, TriggerLog, PreviewLog

admin.site.register(ContentBlock)
admin.site.register(EmailDraft)
admin.site.register(Workflow)
admin.site.register(TriggerLog)
admin.site.register(PreviewLog)
# Register your models here.
