from rest_framework import serializers

from .models import CommitRecord, Decision, Option, Review, Signal


class DecisionDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = "__all__"


class DecisionDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Decision
        fields = "__all__"


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
