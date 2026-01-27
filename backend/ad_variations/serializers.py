from rest_framework import serializers

from .models import (
    AdGroup,
    AdVariation,
    CopyElement,
    VariationPerformance,
    VariationStatusHistory,
)


class AdGroupSerializer(serializers.ModelSerializer):
    campaignId = serializers.IntegerField(source="campaign_id", read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = AdGroup
        fields = ["id", "campaignId", "name", "description", "createdAt", "updatedAt"]


class AdGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdGroup
        fields = ["name", "description"]


class AdGroupUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdGroup
        fields = ["name", "description"]


class CopyElementSerializer(serializers.ModelSerializer):
    variationId = serializers.IntegerField(source="variation_id", read_only=True)
    elementKey = serializers.CharField(source="element_key")
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)

    class Meta:
        model = CopyElement
        fields = [
            "id",
            "variationId",
            "elementKey",
            "value",
            "locale",
            "position",
            "meta",
            "createdAt",
            "updatedAt",
        ]


class CopyElementInputSerializer(serializers.ModelSerializer):
    elementKey = serializers.CharField(source="element_key")

    class Meta:
        model = CopyElement
        fields = ["id", "elementKey", "value", "locale", "position", "meta"]


class AdVariationSerializer(serializers.ModelSerializer):
    campaignId = serializers.IntegerField(source="campaign_id", read_only=True)
    adGroupId = serializers.IntegerField(source="ad_group_id", allow_null=True, required=False)
    creativeType = serializers.CharField(source="creative_type")
    formatPayload = serializers.JSONField(source="format_payload", required=False)
    copyElements = CopyElementSerializer(source="copy_elements", many=True, read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    updatedAt = serializers.DateTimeField(source="updated_at", read_only=True)
    bidStrategy = serializers.CharField(source="bid_strategy", allow_blank=True, required=False)

    class Meta:
        model = AdVariation
        fields = [
            "id",
            "campaignId",
            "adGroupId",
            "name",
            "creativeType",
            "status",
            "tags",
            "notes",
            "formatPayload",
            "copyElements",
            "delivery",
            "bidStrategy",
            "budget",
            "createdAt",
            "updatedAt",
        ]


class AdVariationCreateSerializer(serializers.ModelSerializer):
    adGroupId = serializers.IntegerField(source="ad_group_id", allow_null=True, required=False)
    creativeType = serializers.CharField(source="creative_type")
    formatPayload = serializers.JSONField(source="format_payload", required=False)
    copyElements = CopyElementInputSerializer(source="copy_elements", many=True, required=False)
    bidStrategy = serializers.CharField(source="bid_strategy", allow_blank=True, required=False)

    class Meta:
        model = AdVariation
        fields = [
            "name",
            "creativeType",
            "status",
            "tags",
            "notes",
            "adGroupId",
            "formatPayload",
            "copyElements",
            "delivery",
            "bidStrategy",
            "budget",
        ]

    def create(self, validated_data):
        copy_elements = validated_data.pop("copy_elements", [])
        variation = AdVariation.objects.create(**validated_data)
        if copy_elements:
            CopyElement.objects.bulk_create(
                [CopyElement(variation=variation, **item) for item in copy_elements]
            )
        return variation


class AdVariationUpdateSerializer(serializers.ModelSerializer):
    adGroupId = serializers.IntegerField(source="ad_group_id", allow_null=True, required=False)
    creativeType = serializers.CharField(source="creative_type", required=False)
    formatPayload = serializers.JSONField(source="format_payload", required=False)
    copyElements = CopyElementInputSerializer(source="copy_elements", many=True, required=False)
    bidStrategy = serializers.CharField(source="bid_strategy", allow_blank=True, required=False)

    class Meta:
        model = AdVariation
        fields = [
            "name",
            "creativeType",
            "status",
            "tags",
            "notes",
            "adGroupId",
            "formatPayload",
            "copyElements",
            "delivery",
            "bidStrategy",
            "budget",
        ]

    def update(self, instance, validated_data):
        copy_elements = validated_data.pop("copy_elements", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if copy_elements is not None:
            instance.copy_elements.all().delete()
            CopyElement.objects.bulk_create(
                [CopyElement(variation=instance, **item) for item in copy_elements]
            )
        return instance


class VariationPerformanceSerializer(serializers.ModelSerializer):
    variationId = serializers.IntegerField(source="variation_id", read_only=True)
    recordedAt = serializers.DateTimeField(source="recorded_at")
    trendIndicator = serializers.CharField(source="trend_indicator", allow_blank=True, required=False)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    createdBy = serializers.CharField(source="created_by_id", read_only=True)

    class Meta:
        model = VariationPerformance
        fields = [
            "id",
            "variationId",
            "recordedAt",
            "metrics",
            "trendIndicator",
            "observations",
            "createdAt",
            "createdBy",
        ]


class VariationPerformanceCreateSerializer(serializers.ModelSerializer):
    recordedAt = serializers.DateTimeField(source="recorded_at")
    trendIndicator = serializers.CharField(source="trend_indicator", allow_blank=True, required=False)

    class Meta:
        model = VariationPerformance
        fields = ["recordedAt", "metrics", "trendIndicator", "observations"]


class VariationStatusHistorySerializer(serializers.ModelSerializer):
    variationId = serializers.IntegerField(source="variation_id", read_only=True)
    fromStatus = serializers.CharField(source="from_status")
    toStatus = serializers.CharField(source="to_status")
    changedAt = serializers.DateTimeField(source="changed_at")
    changedBy = serializers.CharField(source="changed_by_id", read_only=True)

    class Meta:
        model = VariationStatusHistory
        fields = [
            "id",
            "variationId",
            "fromStatus",
            "toStatus",
            "reason",
            "changedAt",
            "changedBy",
        ]


class VariationStatusChangeSerializer(serializers.Serializer):
    toStatus = serializers.CharField()
    reason = serializers.CharField(required=False, allow_blank=True)


class ComparisonRequestSerializer(serializers.Serializer):
    variationIds = serializers.ListField(child=serializers.IntegerField(), min_length=2, max_length=4)


class BulkOperationSerializer(serializers.Serializer):
    variationIds = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    action = serializers.ChoiceField(
        choices=["updateStatus", "addTags", "removeTags", "assignAdGroup", "unassignAdGroup"]
    )
    payload = serializers.DictField()


class AdGroupVariationAssignmentSerializer(serializers.Serializer):
    variationIds = serializers.ListField(child=serializers.IntegerField(), min_length=1)
