from rest_framework import serializers

from .models import CommitRecord, Decision, DecisionStateTransition, Option, Review, Signal


class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = "__all__"


class SignalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signal
        fields = "__all__"


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = "__all__"


class CommitRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommitRecord
        fields = "__all__"


class DecisionStateTransitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecisionStateTransition
        fields = "__all__"


class DecisionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = [
            "id",
            "title",
            "status",
            "risk_level",
            "confidence",
            "updated_at",
            "created_at",
            "is_reference_case",
        ]


class DecisionDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = "__all__"


class DecisionDetailSerializer(serializers.ModelSerializer):
    signals = SignalSerializer(many=True, read_only=True)
    options = OptionSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    commit_record = CommitRecordSerializer(read_only=True)
    state_transitions = DecisionStateTransitionSerializer(many=True, read_only=True)

    def get_field_names(self, declared_fields, info):
        fields = list(super().get_field_names(declared_fields, info))
        extra = list(getattr(self.Meta, "extra_fields", []))
        for field in extra:
            if field not in fields:
                fields.append(field)
        return fields

    class Meta:
        model = Decision
        fields = "__all__"
        extra_fields = [
            "signals",
            "options",
            "reviews",
            "commit_record",
            "state_transitions",
        ]


class DecisionCommitActionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    validation_snapshot = serializers.JSONField(required=False, allow_null=True)
    metadata = serializers.JSONField(required=False, allow_null=True)


class DecisionApproveActionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    metadata = serializers.JSONField(required=False, allow_null=True)


class DecisionArchiveActionSerializer(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    metadata = serializers.JSONField(required=False, allow_null=True)
