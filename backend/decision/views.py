from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Decision
from .serializers import (
    DecisionApproveActionSerializer,
    DecisionArchiveActionSerializer,
    DecisionCommitActionSerializer,
    DecisionDetailSerializer,
    DecisionDraftSerializer,
    DecisionListSerializer,
)
from .services import approve_decision, archive_decision, commit_decision


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

    @action(detail=True, methods=['post'])
    def commit(self, request, pk=None):
        decision = self.get_object()
        if decision.status != Decision.Status.DRAFT:
            return Response({"detail": "Only DRAFT decisions can be committed."}, status=400)

        serializer = DecisionCommitActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        decision = commit_decision(
            decision=decision,
            user=request.user,
            note=serializer.validated_data.get("note"),
            metadata=None,
            validation_snapshot=serializer.validated_data.get("validation_snapshot"),
        )
        response_serializer = DecisionDetailSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

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
        decision = approve_decision(
            decision=decision,
            user=request.user,
            note=serializer.validated_data.get("note"),
            metadata=None,
        )
        response_serializer = DecisionDetailSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)

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
        decision = archive_decision(
            decision=decision,
            user=request.user,
            note=serializer.validated_data.get("note"),
            metadata=None,
        )
        response_serializer = DecisionDetailSerializer(
            decision,
            context=self.get_serializer_context(),
        )
        return Response(response_serializer.data, status=status.HTTP_200_OK)
