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


class DraftSignalSerializer(serializers.ModelSerializer):
    decisionId = serializers.IntegerField(source="decision_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    isDeleted = serializers.BooleanField(source="is_deleted", read_only=True)

    class Meta:
        model = Signal
        fields = [
            "id",
            "decisionId",
            "type",
            "description",
            "severity",
            "source",
            "order",
            "createdAt",
            "updatedAt",
            "isDeleted",
        ]


class DraftOptionSerializer(serializers.ModelSerializer):
    text = serializers.CharField(allow_blank=True)
    decisionId = serializers.IntegerField(source="decision_id", read_only=True)
    isSelected = serializers.BooleanField(source="is_selected")
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    isDeleted = serializers.BooleanField(source="is_deleted", read_only=True)

    class Meta:
        model = Option
        fields = [
            "id",
            "decisionId",
            "text",
            "isSelected",
            "order",
            "createdAt",
            "updatedAt",
            "isDeleted",
        ]


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
    contextSummary = serializers.CharField(source="context_summary", allow_null=True)
    riskLevel = serializers.CharField(source="risk_level", allow_null=True)
    confidenceScore = serializers.IntegerField(source="confidence", allow_null=True)
    createdAt = serializers.DateTimeField(source="created_at")
    createdBy = serializers.IntegerField(source="author_id", allow_null=True)
    committedAt = serializers.DateTimeField(source="committed_at", allow_null=True)
    projectId = serializers.IntegerField(source="project_id", allow_null=True)
    projectName = serializers.CharField(source="project.name", allow_null=True)
    selectedOptionText = serializers.SerializerMethodField()
    hasReviews = serializers.SerializerMethodField()

    class Meta:
        model = Decision
        fields = [
            "id",
            "status",
            "title",
            "contextSummary",
            "selectedOptionText",
            "riskLevel",
            "confidenceScore",
            "createdAt",
            "createdBy",
            "committedAt",
            "projectId",
            "projectName",
            "hasReviews",
        ]

    def get_selectedOptionText(self, obj):
        selected_option = obj.options.filter(is_selected=True).first()
        return selected_option.text if selected_option else None

    def get_hasReviews(self, obj):
        return obj.reviews.exists()


class DecisionDraftSerializer(serializers.ModelSerializer):
    title = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    contextSummary = serializers.CharField(
        source="context_summary", required=False, allow_null=True, allow_blank=True
    )
    riskLevel = serializers.CharField(source="risk_level", required=False, allow_null=True)
    confidenceScore = serializers.IntegerField(
        source="confidence", required=False, allow_null=True
    )
    reasoning = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    signals = DraftSignalSerializer(many=True, required=False)
    options = DraftOptionSerializer(many=True, required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    createdBy = serializers.IntegerField(source="author_id", read_only=True)
    lastEditedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    lastEditedBy = serializers.IntegerField(source="last_edited_by_id", read_only=True)
    isReferenceCase = serializers.BooleanField(
        source="is_reference_case", required=False
    )

    def to_internal_value(self, data):
        if self.instance is not None:
            data = data.copy()
            signals = data.get("signals")
            if isinstance(signals, list):
                pass
            options = data.get("options")
            if isinstance(options, list):
                for item in options:
                    if not isinstance(item, dict):
                        continue
                    if "is_selected" in item and "isSelected" not in item:
                        item["isSelected"] = item.pop("is_selected")
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
        fields = [
            "title",
            "contextSummary",
            "riskLevel",
            "confidenceScore",
            "reasoning",
            "signals",
            "options",
            "createdAt",
            "createdBy",
            "lastEditedAt",
            "lastEditedBy",
            "isReferenceCase",
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


class CommittedSignalSerializer(serializers.ModelSerializer):
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Signal
        fields = [
            "id",
            "type",
            "description",
            "severity",
            "source",
            "createdAt",
        ]


class CommittedOptionSerializer(serializers.ModelSerializer):
    isSelected = serializers.BooleanField(source="is_selected", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Option
        fields = [
            "id",
            "text",
            "isSelected",
            "createdAt",
        ]


class CommittedReviewSerializer(serializers.ModelSerializer):
    outcomeText = serializers.CharField(source="outcome_text", read_only=True)
    reflectionText = serializers.CharField(source="reflection_text", read_only=True)
    decisionQuality = serializers.CharField(source="quality", read_only=True)
    reviewedAt = serializers.DateTimeField(source="reviewed_at", read_only=True)
    reviewerId = serializers.IntegerField(source="reviewer_id", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "outcomeText",
            "reflectionText",
            "decisionQuality",
            "reviewedAt",
            "reviewerId",
        ]


class CommittedCommitRecordSerializer(serializers.ModelSerializer):
    committedAt = serializers.DateTimeField(source="committed_at", read_only=True)
    committedBy = serializers.IntegerField(source="committed_by_id", read_only=True)

    class Meta:
        model = CommitRecord
        fields = [
            "id",
            "committedAt",
            "committedBy",
        ]


class CommittedStateTransitionSerializer(serializers.ModelSerializer):
    fromStatus = serializers.CharField(source="from_status", read_only=True)
    toStatus = serializers.CharField(source="to_status", read_only=True)
    changedAt = serializers.DateTimeField(source="timestamp", read_only=True)
    changedBy = serializers.IntegerField(source="triggered_by_id", read_only=True)

    class Meta:
        model = DecisionStateTransition
        fields = [
            "id",
            "fromStatus",
            "toStatus",
            "changedAt",
            "changedBy",
        ]


class DecisionCommittedSerializer(serializers.ModelSerializer):
    contextSummary = serializers.CharField(source="context_summary", read_only=True)
    riskLevel = serializers.CharField(source="risk_level", read_only=True)
    confidenceScore = serializers.IntegerField(source="confidence", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    createdBy = serializers.IntegerField(source="author_id", read_only=True)
    committedAt = serializers.DateTimeField(source="committed_at", read_only=True)
    isReferenceCase = serializers.BooleanField(source="is_reference_case", read_only=True)
    signals = CommittedSignalSerializer(many=True, read_only=True)
    options = CommittedOptionSerializer(many=True, read_only=True)
    reviews = CommittedReviewSerializer(many=True, read_only=True)
    commitRecord = CommittedCommitRecordSerializer(read_only=True)
    stateTransitions = CommittedStateTransitionSerializer(many=True, read_only=True)

    class Meta:
        model = Decision
        fields = [
            "id",
            "status",
            "title",
            "contextSummary",
            "riskLevel",
            "confidenceScore",
            "reasoning",
            "createdAt",
            "createdBy",
            "committedAt",
            "isReferenceCase",
            "signals",
            "options",
            "reviews",
            "commitRecord",
            "stateTransitions",
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
