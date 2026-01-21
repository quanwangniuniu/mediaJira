from rest_framework import viewsets

from .models import Decision
from .serializers import (
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
