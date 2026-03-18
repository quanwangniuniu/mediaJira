from django.shortcuts import get_object_or_404
from rest_framework import serializers

from core.models import Project, ProjectMember
from meetings.models import Meeting, AgendaItem, ParticipantLink, ArtifactLink


class MeetingSerializer(serializers.ModelSerializer):
    project_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Meeting
        fields = [
            "id",
            "project",
            "project_id",
            "title",
            "meeting_type",
            "objective",
            "scheduled_date",
            "scheduled_time",
            "external_reference",
            "status",
        ]
        read_only_fields = ["id", "project", "status"]

    def validate(self, attrs):
        project_id = attrs.get("project_id")
        request = self.context.get("request")
        user = getattr(request, "user", None)

        project = get_object_or_404(Project, id=project_id)

        has_membership = ProjectMember.objects.filter(
            user=user,
            project=project,
            is_active=True,
        ).exists()
        if not has_membership:
            raise serializers.ValidationError(
                {"project_id": "You do not have access to this project."}
            )

        attrs["project"] = project
        return attrs

    def create(self, validated_data):
        validated_data.pop("project_id", None)
        # status defaults to draft at the model level
        return super().create(validated_data)


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

