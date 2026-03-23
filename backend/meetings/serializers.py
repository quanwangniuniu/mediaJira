from django.shortcuts import get_object_or_404
from rest_framework import serializers

from core.models import Project, ProjectMember
from meetings.models import Meeting, AgendaItem, ParticipantLink, ArtifactLink


class MeetingSerializer(serializers.ModelSerializer):
    """
    Optional write-only participant_user_ids on create — see MeetingViewSet.perform_create.
    """

    participant_user_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True,
    )

    class Meta:
        model = Meeting
        fields = [
            "id",
            "project",
            "title",
            "meeting_type",
            "objective",
            "scheduled_date",
            "scheduled_time",
            "external_reference",
            "status",
            "participant_user_ids",
        ]
        read_only_fields = ["id", "project"]

    def update(self, instance, validated_data):
        # Participants are managed via the participants sub-resource
        validated_data.pop("participant_user_ids", None)
        return super().update(instance, validated_data)


class AgendaItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgendaItem
        fields = ["id", "meeting", "content", "order_index", "is_priority"]
        read_only_fields = ["id", "meeting"]


class ParticipantLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipantLink
        fields = ["id", "meeting", "user", "role"]
        read_only_fields = ["id", "meeting"]

    def validate(self, attrs):
        """
        Enforce unique (meeting, user) at the serializer level so the API
        returns a 400 ValidationError instead of a database IntegrityError.
        """

        meeting = self.context.get("meeting")
        user = attrs.get("user")

        if meeting and user:
            exists_qs = ParticipantLink.objects.filter(meeting=meeting, user=user)
            if self.instance is not None:
                exists_qs = exists_qs.exclude(pk=self.instance.pk)

            if exists_qs.exists():
                raise serializers.ValidationError(
                    {
                        "non_field_errors": [
                            "Participant with this user already exists for this meeting."
                        ]
                    }
                )

        return attrs


class ArtifactLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = ArtifactLink
        fields = ["id", "meeting", "artifact_type", "artifact_id"]
        read_only_fields = ["id", "meeting"]

