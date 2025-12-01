from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated


from .models import EmailDraft, Workflow, WorkflowExecutionLog
from .serializers import (
    EmailDraftSerializer,
    EmailDraftCreateSerializer,
    EmailDraftUpdateSerializer,
    WorkflowSerializer,
    WorkflowCreateSerializer,
)


class EmailDraftViewSet(viewsets.ModelViewSet):
    """
    ViewSet for EmailDraft CRUD.

    Supports:
    - GET    /api/klaviyo/klaviyo-drafts/        (list)
    - POST   /api/klaviyo/klaviyo-drafts/        (create)
    - GET    /api/klaviyo/klaviyo-drafts/{id}/   (retrieve)
    - PUT    /api/klaviyo/klaviyo-drafts/{id}/   (update)
    - PATCH  /api/klaviyo/klaviyo-drafts/{id}/   (partial_update)
    - DELETE /api/klaviyo/klaviyo-drafts/{id}/   (destroy)
    """
    permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        """
        Optionally scope drafts to the authenticated user and exclude soft-deleted ones.
        """
        qs = EmailDraft.objects.filter(is_deleted=False)

        user = getattr(self.request, "user", None)
        if user and user.is_authenticated:
            qs = qs.filter(user=user)

        return qs

    def get_serializer_class(self):
        """
        Use different serializers for read vs write operations.
        """
        if self.action == "create":
            return EmailDraftCreateSerializer
        if self.action in ("update", "partial_update"):
            return EmailDraftUpdateSerializer
        return EmailDraftSerializer

    def perform_create(self, serializer):
        """
        Default the user to request.user if not explicitly provided.
        """
        user = getattr(self.request, "user", None)

        if "user" not in serializer.validated_data and user and user.is_authenticated:
            serializer.save(user=user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """
        When the draft status changes, log an execution event
        into active workflows (simple trigger example).
        """
        instance_before = self.get_object()
        old_status = instance_before.status

        instance = serializer.save()

        if old_status != instance.status:
            self._log_status_change(instance, old_status)

    def perform_destroy(self, instance):
        """
        Soft-delete the draft by marking is_deleted=True.
        """
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    def _log_status_change(self, draft: EmailDraft, old_status: str) -> None:
        """
        Simple trigger: whenever a draft's status changes,
        create a WorkflowExecutionLog entry for all active workflows.

        This satisfies:
        - "Trigger logic works for draft status changes"
        - "Workflows store execution logs"
        """
        active_workflows = Workflow.objects.filter(is_active=True, is_deleted=False)

        for workflow in active_workflows:
            WorkflowExecutionLog.objects.create(
                workflow=workflow,
                event=f"Draft {draft.id} status changed from {old_status} to {draft.status}",
            )

class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Workflow CRUD.

    Supports:
    - GET    /api/klaviyo/klaviyo-workflows/        (list)
    - POST   /api/klaviyo/klaviyo-workflows/        (create)
    - GET    /api/klaviyo/klaviyo-workflows/{id}/   (retrieve)
    - PUT    /api/klaviyo/klaviyo-workflows/{id}/   (update)
    - PATCH  /api/klaviyo/klaviyo-workflows/{id}/   (partial_update)
    - DELETE /api/klaviyo/klaviyo-workflows/{id}/   (destroy)
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return non-deleted workflows only.
        """
        return Workflow.objects.filter(is_deleted=False)

    def get_serializer_class(self):
        """
        Use write-optimised serializer for create/update, and
        read serializer for list/retrieve.
        """
        if self.action in ("create", "update", "partial_update"):
            return WorkflowCreateSerializer
        return WorkflowSerializer

    def perform_destroy(self, instance):
        """
        Soft-delete workflow by marking is_deleted=True.
        """
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])