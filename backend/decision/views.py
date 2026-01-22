from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CommitRecord, Decision
from .serializers import (
    DecisionApproveActionSerializer,
    DecisionArchiveActionSerializer,
    DecisionCommitActionSerializer,
    DecisionDetailSerializer,
    DecisionDraftSerializer,
    DecisionListSerializer,
)


class DecisionViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Decision.objects.filter(is_deleted=False).order_by('-updated_at')
        status = self.request.query_params.get('status')
        if status in Decision.Status.values:
            queryset = queryset.filter(status=status)
        return queryset

    def get_serializer_class(self):
        if self.action == 'list':
            return DecisionListSerializer
        if self.action == 'retrieve':
            return DecisionDetailSerializer
        if self.action in ('create', 'update', 'partial_update'):
            return DecisionDraftSerializer
        return DecisionDraftSerializer

    def _record_transition(
        self,
        decision,
        from_status,
        to_status,
        user,
        method,
        note=None,
        metadata=None,
    ):
        decision.state_transitions.create(
            from_status=from_status,
            to_status=to_status,
            triggered_by=user,
            transition_method=method,
            note=note,
            metadata=metadata,
        )

    def _upsert_commit_record(self, decision, user, snapshot):
        defaults = {
            "committed_by": user,
            "validation_snapshot": snapshot,
        }
        committed_at_field = CommitRecord._meta.get_field("committed_at")
        if not committed_at_field.auto_now_add:
            defaults["committed_at"] = timezone.now()

        CommitRecord.objects.update_or_create(
            decision=decision,
            defaults=defaults,
        )

    @action(detail=True, methods=['post'])
    def commit(self, request, pk=None):
        decision = self.get_object()
        if decision.status != Decision.Status.DRAFT:
            return Response({"detail": "Only DRAFT decisions can be committed."}, status=400)

        serializer = DecisionCommitActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        metadata = serializer.validated_data.get("metadata") or {}
        snapshot = serializer.validated_data.get("validation_snapshot")
        with transaction.atomic():
            decision = Decision.objects.select_for_update().get(pk=decision.pk)
            decision.validate_can_commit()
            from_status = decision.status
            decision._compute_requires_approval()
            if decision.requires_approval:
                decision.submit_for_approval(user=request.user)
            else:
                decision.commit(user=request.user)
            to_status = decision.status

            if snapshot is None:
                snapshot = decision._build_validation_snapshot()
            metadata["validation_snapshot"] = snapshot
            self._upsert_commit_record(decision, request.user, snapshot)
            self._record_transition(
                decision=decision,
                from_status=from_status,
                to_status=to_status,
                user=request.user,
                method="commit",
                note=serializer.validated_data.get("note"),
                metadata=metadata,
            )
        response_serializer = DecisionDetailSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        response_payload = {
            "detail": (
                "Decision requires approval"
                if decision.status == Decision.Status.AWAITING_APPROVAL
                else "Decision committed"
            ),
            "status": decision.status,
            "next_action": "APPROVE" if decision.status == Decision.Status.AWAITING_APPROVAL else None,
            "decision": response_serializer.data,
        }
        return Response(response_payload, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        decision = self.get_object()
        if decision.status != Decision.Status.AWAITING_APPROVAL:
            return Response(
                {"detail": "Only AWAITING_APPROVAL decisions can be approved."},
                status=400,
            )

        serializer = DecisionApproveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            from_status = decision.status
            decision.approve(user=request.user)
            to_status = decision.status
            self._record_transition(
                decision=decision,
                from_status=from_status,
                to_status=to_status,
                user=request.user,
                method="approve",
                note=serializer.validated_data.get("note"),
                metadata=serializer.validated_data.get("metadata"),
            )
        response_serializer = DecisionDetailSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        response_payload = {
            "detail": "Decision approved",
            "status": decision.status,
            "next_action": None,
            "decision": response_serializer.data,
        }
        return Response(response_payload, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        decision = self.get_object()
        if decision.status not in (Decision.Status.COMMITTED, Decision.Status.REVIEWED):
            return Response(
                {"detail": "Only COMMITTED or REVIEWED decisions can be archived."},
                status=400,
            )

        serializer = DecisionArchiveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            from_status = decision.status
            decision.archive(user=request.user)
            to_status = decision.status
            self._record_transition(
                decision=decision,
                from_status=from_status,
                to_status=to_status,
                user=request.user,
                method="archive",
                note=serializer.validated_data.get("note"),
                metadata=serializer.validated_data.get("metadata"),
            )
        response_serializer = DecisionDetailSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        response_payload = {
            "detail": "Decision archived",
            "status": decision.status,
            "next_action": None,
            "decision": response_serializer.data,
        }
        return Response(response_payload, status=status.HTTP_200_OK)
