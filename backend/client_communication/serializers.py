from rest_framework import serializers

from .models import ClientCommunication, CommunicationType, ImpactedArea


class ClientCommunicationSerializer(serializers.ModelSerializer):
    impacted_areas = serializers.ListField(
        child=serializers.ChoiceField(choices=ImpactedArea.choices),
        allow_empty=False,
    )

    class Meta:
        model = ClientCommunication
        fields = [
            "id",
            "task",
            "communication_type",
            "stakeholders",
            "impacted_areas",
            "required_actions",
            "client_deadline",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ClientCommunicationCreateSerializer(ClientCommunicationSerializer):
    """
    Separate serializer for create/update to make task field write-only in those flows.
    """

    task = serializers.IntegerField(write_only=True)

