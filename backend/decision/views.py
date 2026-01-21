from rest_framework import mixins, viewsets

from .models import Decision
from .serializers import DecisionDraftSerializer


class DecisionViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Decision.objects.all()
    serializer_class = DecisionDraftSerializer
