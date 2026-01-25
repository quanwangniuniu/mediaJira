from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import CommitRecord, Decision, Review
from .permissions import DecisionPermission
from decision.services import invalid_state_response
from .serializers import (
    CreateReviewSerializer,
    DecisionApproveActionSerializer,
    DecisionArchiveActionSerializer,
    DecisionCommitActionSerializer,
    DecisionDetailSerializer,
    DecisionDraftSerializer,
    DecisionListSerializer,
    ReviewSerializer,
)


class DecisionDraftViewSet(
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [DecisionPermission]
    http_method_names = ["get", "post", "patch"]
    serializer_class = DecisionDraftSerializer
    queryset = Decision.objects.filter(is_deleted=False)

    def _ensure_editable(self, decision):
        if decision.status not in (
            Decision.Status.DRAFT,
            Decision.Status.AWAITING_APPROVAL,
        ):
            return invalid_state_response(
                current_status=decision.status,
                allowed_statuses=[
                    Decision.Status.DRAFT,
                    Decision.Status.AWAITING_APPROVAL,
                ],
                suggested_action="Use GET /api/decisions/{id}/ for read-only view.",
            )
        return None

    def retrieve(self, request, *args, **kwargs):
        decision = self.get_object()
        invalid_response = self._ensure_editable(decision)
        if invalid_response:
            return invalid_response
        return super().retrieve(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        decision = self.get_object()
        invalid_response = self._ensure_editable(decision)
        if invalid_response:
            return invalid_response
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        decision = self.get_object()
        invalid_response = self._ensure_editable(decision)
        if invalid_response:
            return invalid_response
        return super().partial_update(request, *args, **kwargs)


class DecisionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [DecisionPermission]

    def get_queryset(self):
        base = Decision.objects.filter(is_deleted=False).order_by("-updated_at")

        if self.action in ("list", "retrieve"):
            base = base.filter(
                status__in=[
                    Decision.Status.COMMITTED,
                    Decision.Status.REVIEWED,
                    Decision.Status.ARCHIVED,
                ]
            )

        status_q = self.request.query_params.get("status")
        if status_q in Decision.Status.values:
            base = base.filter(status=status_q)

        return base

    def retrieve(self, request, *args, **kwargs):
        decision_id = kwargs.get("pk")
        try:
            decision = Decision.objects.get(pk=decision_id, is_deleted=False)
        except Decision.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        if decision.status in (
            Decision.Status.DRAFT,
            Decision.Status.AWAITING_APPROVAL,
        ):
            return invalid_state_response(
                current_status=decision.status,
                allowed_statuses=[
                    Decision.Status.COMMITTED,
                    Decision.Status.REVIEWED,
                    Decision.Status.ARCHIVED,
                ],
                suggested_action="Use GET /decisions/drafts/{decisionId}",
            )

        serializer = self.get_serializer(decision)
        return Response(serializer.data)

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
            return invalid_state_response(
                current_status=decision.status,
                allowed_statuses=[Decision.Status.DRAFT],
                suggested_action=(
                    "Update the draft via PATCH /decisions/drafts/{decisionId} before committing."
                ),
            )

        serializer = DecisionCommitActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        metadata = serializer.validated_data.get("metadata") or {}
        snapshot = serializer.validated_data.get("validation_snapshot")
        with transaction.atomic():
            decision = Decision.objects.select_for_update().get(pk=decision.pk)
            try:
                decision.validate_can_commit()
            except ValidationError:
                return invalid_state_response(
                    current_status=decision.status,
                    allowed_statuses=[Decision.Status.DRAFT],
                    suggested_action=(
                        "Update the draft via PATCH /decisions/drafts/{decisionId} before committing."
                    ),
                )
            from_status = decision.status
            decision._compute_requires_approval()
            if decision.requires_approval:
                decision.submit_for_approval(user=request.user)
            else:
                decision.commit(user=request.user)
            decision.save(
                update_fields=[
                    "status",
                    "requires_approval",
                    "committed_at",
                    "committed_by",
                    "updated_at",
                ]
            )
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

    @action(detail=True, methods=['get', 'post'], url_path='reviews')
    def reviews(self, request, pk=None):
        decision = self.get_object()
        if request.method == 'POST':
            if decision.status not in (
                Decision.Status.COMMITTED,
                Decision.Status.REVIEWED,
            ):
                return invalid_state_response(
                    current_status=decision.status,
                    allowed_statuses=[Decision.Status.COMMITTED, Decision.Status.REVIEWED],
                    suggested_action=(
                        "Commit the decision before adding reviews."
                    ),
                )
        else:
            if decision.status not in (
                Decision.Status.COMMITTED,
                Decision.Status.REVIEWED,
                Decision.Status.ARCHIVED,
            ):
                return invalid_state_response(
                    current_status=decision.status,
                    allowed_statuses=[
                        Decision.Status.COMMITTED,
                        Decision.Status.REVIEWED,
                        Decision.Status.ARCHIVED,
                    ],
                    suggested_action="Commit the decision to view reviews.",
                )

        if request.method == 'GET':
            reviews = Review.objects.filter(decision=decision).order_by('-reviewed_at')
            serializer = ReviewSerializer(reviews, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        with transaction.atomic():
            decision = Decision.objects.select_for_update().get(pk=decision.pk)
            serializer = CreateReviewSerializer(
                data=request.data,
                context={"decision": decision, "reviewer": request.user},
            )
            serializer.is_valid(raise_exception=True)
            review = serializer.save()
        response_serializer = ReviewSerializer(review)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        decision = self.get_object()
        if decision.status != Decision.Status.AWAITING_APPROVAL:
            return invalid_state_response(
                current_status=decision.status,
                allowed_statuses=[Decision.Status.AWAITING_APPROVAL],
                suggested_action="Commit the decision to request approval.",
            )

        serializer = DecisionApproveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            decision = Decision.objects.select_for_update().get(pk=decision.pk)
            from_status = decision.status
            decision.approve(user=request.user)
            decision.save(
                update_fields=[
                    "status",
                    "approved_at",
                    "approved_by",
                    "updated_at",
                ]
            )
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
            return invalid_state_response(
                current_status=decision.status,
                allowed_statuses=[Decision.Status.COMMITTED, Decision.Status.REVIEWED],
                suggested_action="Commit the decision before archiving.",
            )

        serializer = DecisionArchiveActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            decision = Decision.objects.select_for_update().get(pk=decision.pk)
            from_status = decision.status
            decision.archive(user=request.user)
            decision.save(update_fields=["status", "updated_at"])
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
