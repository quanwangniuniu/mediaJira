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


class CreateReviewSerializer(serializers.Serializer):
    outcomeText = serializers.CharField()
    reflectionText = serializers.CharField()
    decisionQuality = serializers.ChoiceField(choices=Review.DecisionQuality.choices)
    tags = serializers.ListField(child=serializers.CharField(), required=False)

    def create(self, validated_data):
        return Review.objects.create(
            decision=self.context["decision"],
            reviewer=self.context.get("reviewer"),
            outcome_text=validated_data["outcomeText"],
            reflection_text=validated_data["reflectionText"],
            quality=validated_data["decisionQuality"],
        )


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
    signals = SignalSerializer(many=True, required=False)
    options = OptionSerializer(many=True, required=False)

    def to_internal_value(self, data):
        if self.instance is not None:
            data = data.copy()
            decision_id = self.instance.pk
            signals = data.get("signals")
            if isinstance(signals, list):
                for item in signals:
                    if isinstance(item, dict) and "decision" not in item:
                        item["decision"] = decision_id
            options = data.get("options")
            if isinstance(options, list):
                for item in options:
                    if not isinstance(item, dict):
                        continue
                    if "isSelected" in item and "is_selected" not in item:
                        item["is_selected"] = item.pop("isSelected")
                    if "decision" not in item:
                        item["decision"] = decision_id
        return super().to_internal_value(data)

    def update(self, instance, validated_data):
        signals_data = validated_data.pop("signals", None)
        options_data = validated_data.pop("options", None)
        instance = super().update(instance, validated_data)

        if signals_data is not None:
            instance.signals.all().delete()
            for signal_data in signals_data:
                signal_data.pop("decision", None)
                Signal.objects.create(decision=instance, **signal_data)

        if options_data is not None:
            instance.options.all().delete()
            for option_data in options_data:
                if "isSelected" in option_data and "is_selected" not in option_data:
                    option_data["is_selected"] = option_data.pop("isSelected")
                option_data.pop("decision", None)
                Option.objects.create(decision=instance, **option_data)

        return instance

    class Meta:
        model = Decision
        fields = "__all__"
        read_only_fields = [
            "status",
            "author",
            "committed_by",
            "committed_at",
            "approved_by",
            "approved_at",
            "is_deleted",
            "created_at",
            "updated_at",
        ]


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
