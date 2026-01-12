from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.models import Organization
from .models import (
    Calendar,
    CalendarShare,
    CalendarSubscription,
    Event,
    EventAttendee,
    EventReminder,
    EventCategory,
    EventCategoryAssignment,
    CalendarSettings,
    Notification,
    RecurrenceRule,
)


User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """
    Minimal user representation matching the Calendar OpenAPI `User` schema.
    """

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "username", "full_name"]
        read_only_fields = fields

    def get_full_name(self, obj: User) -> str:
        get_full_name = getattr(obj, "get_full_name", None)
        if callable(get_full_name):
            value = get_full_name() or ""
            if value:
                return value
        return getattr(obj, "full_name", "") or ""


class OrganizationField(serializers.PrimaryKeyRelatedField):
    """
    Read-only organization ID exposure.
    """

    def to_representation(self, value: Organization) -> Any:
        return str(value.pk)


class CalendarSerializer(serializers.ModelSerializer):
    """
    Calendar resource serializer.
    Used for both read and write; owner/organization are derived from request.
    """

    organization_id = OrganizationField(source="organization", read_only=True)
    owner = UserSummarySerializer(read_only=True)

    class Meta:
        model = Calendar
        fields = [
            "id",
            "organization_id",
            "owner",
            "name",
            "description",
            "color",
            "visibility",
            "timezone",
            "is_primary",
            "location",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "organization_id", "owner", "created_at", "updated_at"]


class CalendarCreateUpdateSerializer(CalendarSerializer):
    """
    Explicit serializer for create/update to make intent clear in views.
    """

    class Meta(CalendarSerializer.Meta):
        read_only_fields = ["id", "organization_id", "owner", "created_at", "updated_at"]


class CalendarShareSerializer(serializers.ModelSerializer):
    """
    Calendar sharing representation.
    """

    calendar_id = serializers.UUIDField(source="calendar_id", read_only=True)
    shared_with = UserSummarySerializer(read_only=True)

    class Meta:
        model = CalendarShare
        fields = [
            "id",
            "calendar_id",
            "shared_with",
            "permission",
            "can_invite_others",
            "notification_enabled",
            "created_at",
        ]
        read_only_fields = ["id", "calendar_id", "shared_with", "created_at"]


class CalendarShareRequestSerializer(serializers.Serializer):
    """
    Request body for creating/updating shares.
    Matches `CalendarShareRequest` semantics in OpenAPI.
    """

    user_id = serializers.IntegerField()
    permission = serializers.ChoiceField(choices=[c[0] for c in CalendarShare.PERMISSION_CHOICES])
    can_invite_others = serializers.BooleanField(required=False, default=False)


class CalendarSubscriptionSerializer(serializers.ModelSerializer):
    """
    Subscription representation for list/detail responses.
    """

    user = UserSummarySerializer(read_only=True)
    calendar = CalendarSerializer(read_only=True)

    class Meta:
        model = CalendarSubscription
        fields = [
            "id",
            "user",
            "calendar",
            "source_url",
            "color_override",
            "is_hidden",
            "notification_enabled",
            "created_at",
        ]
        read_only_fields = ["id", "user", "calendar", "created_at"]


class CalendarSubscriptionRequestSerializer(serializers.Serializer):
    """
    Request body for creating subscriptions.
    """

    calendar_id = serializers.UUIDField(required=False)
    source_url = serializers.URLField(required=False)
    color_override = serializers.RegexField(
        regex=r"^#[0-9A-Fa-f]{6}$",
        required=False,
        allow_null=True,
    )
    is_hidden = serializers.BooleanField(required=False)
    notification_enabled = serializers.BooleanField(required=False)

    def validate(self, attrs: dict) -> dict:
        calendar_id = attrs.get("calendar_id")
        source_url = attrs.get("source_url")
        if not calendar_id and not source_url:
            raise serializers.ValidationError(
                "Either calendar_id or source_url must be provided."
            )
        if calendar_id and source_url:
            raise serializers.ValidationError(
                "Provide only one of calendar_id or source_url (not both)."
            )
        return attrs


class RecurrenceRuleSerializer(serializers.ModelSerializer):
    """
    Server-side recurrence rule representation.
    """

    class Meta:
        model = RecurrenceRule
        fields = [
            "id",
            "frequency",
            "interval",
            "by_day",
            "by_month_day",
            "by_set_pos",
            "by_month",
            "count",
            "until",
            "exception_dates",
            "rrule_string",
        ]
        read_only_fields = ["id", "rrule_string"]


class RecurrenceRuleInputSerializer(serializers.ModelSerializer):
    """
    Input-only serializer for recurrence rules.
    """

    class Meta:
        model = RecurrenceRule
        fields = [
            "frequency",
            "interval",
            "by_day",
            "by_month_day",
            "by_set_pos",
            "by_month",
            "count",
            "until",
            "exception_dates",
        ]


class EventSerializer(serializers.ModelSerializer):
    """
    Event representation for list/detail.
    """

    organization_id = OrganizationField(source="organization", read_only=True)
    calendar_id = serializers.UUIDField(read_only=True)
    created_by = UserSummarySerializer(read_only=True)
    recurrence_rule = RecurrenceRuleSerializer(read_only=True)

    class Meta:
        model = Event
        fields = [
            "id",
            "organization_id",
            "calendar_id",
            "created_by",
            "title",
            "description",
            "start_datetime",
            "end_datetime",
            "timezone",
            "is_all_day",
            "location",
            "location_lat",
            "location_lng",
            "status",
            "event_type",
            "color",
            "visibility",
            "is_recurring",
            "recurrence_rule",
            "original_start",
            "has_conference",
            "conference_data",
            "guests_can_modify",
            "guests_can_invite_others",
            "guests_can_see_other_guests",
            "attachments",
            "metadata",
            "ical_uid",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "organization_id",
            "calendar_id",
            "created_by",
            "recurrence_rule",
            "ical_uid",
            "created_at",
            "updated_at",
        ]


class EventCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for event create/update requests.
    It accepts a recurrence pattern payload that is translated into RecurrenceRule.
    """

    recurrence = RecurrenceRuleInputSerializer(
        write_only=True, required=False, allow_null=True
    )
    calendar_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = Event
        fields = [
            "calendar_id",
            "title",
            "description",
            "start_datetime",
            "end_datetime",
            "timezone",
            "is_all_day",
            "location",
            "location_lat",
            "location_lng",
            "status",
            "event_type",
            "color",
            "visibility",
            "is_recurring",
            "recurrence",
            "original_start",
            "has_conference",
            "conference_data",
            "guests_can_modify",
            "guests_can_invite_others",
            "guests_can_see_other_guests",
            "attachments",
            "metadata",
        ]

    def validate(self, attrs: dict) -> dict:
        is_recurring = attrs.get("is_recurring")
        recurrence = attrs.get("recurrence")
        # If recurrence is provided and is_recurring is not explicitly set, treat as recurring
        if recurrence and is_recurring is None:
            attrs["is_recurring"] = True
            is_recurring = True

        if is_recurring and not recurrence:
            raise serializers.ValidationError(
                {"recurrence": "Recurring events must include recurrence pattern data."}
            )
        if is_recurring is False and recurrence:
            raise serializers.ValidationError(
                {"recurrence": "Non-recurring events must not include recurrence data."}
            )
        return attrs

    def _get_organization(self) -> Organization:
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not getattr(user, "organization_id", None):
            raise serializers.ValidationError("Organization context is required.")
        organization = Organization.objects.filter(id=user.organization_id).first()
        if not organization:
            raise serializers.ValidationError("Organization not found.")
        return organization

    def _ensure_calendar(self, organization: Organization, calendar_id) -> Calendar:
        try:
            return Calendar.objects.get(
                id=calendar_id, organization=organization, is_deleted=False
            )
        except Calendar.DoesNotExist:
            raise serializers.ValidationError(
                {"calendar_id": "Calendar not found in current organization."}
            )

    def _create_or_update_recurrence_rule(
        self, organization: Organization, recurrence_data: dict | None
    ) -> RecurrenceRule | None:
        if not recurrence_data:
            return None
        rule = RecurrenceRule(organization=organization, **recurrence_data)
        rule.save()
        return rule

    def create(self, validated_data: dict) -> Event:
        recurrence_data = validated_data.pop("recurrence", None)
        # Remove any client-provided is_recurring flag; we derive it from recurrence_rule
        validated_data.pop("is_recurring", None)
        calendar_id = validated_data.pop("calendar_id")

        organization = self._get_organization()
        calendar = self._ensure_calendar(organization, calendar_id)

        request = self.context.get("request")
        user = getattr(request, "user", None)

        recurrence_rule = self._create_or_update_recurrence_rule(
            organization, recurrence_data
        )

        event = Event.objects.create(
            organization=organization,
            calendar=calendar,
            created_by=user if user and user.is_authenticated else None,
            is_recurring=bool(recurrence_rule),
            recurrence_rule=recurrence_rule,
            **validated_data,
        )
        return event

    def update(self, instance: Event, validated_data: dict) -> Event:
        recurrence_data = validated_data.pop("recurrence", None)
        # Remove any client-provided is_recurring flag; we derive it from recurrence_rule
        validated_data.pop("is_recurring", None)
        calendar_id = validated_data.pop("calendar_id", None)

        organization = instance.organization
        if calendar_id is not None:
            calendar = self._ensure_calendar(organization, calendar_id)
            instance.calendar = calendar

        if recurrence_data is not None:
            if instance.recurrence_rule:
                for field, value in recurrence_data.items():
                    setattr(instance.recurrence_rule, field, value)
                instance.recurrence_rule.save()
                recurrence_rule = instance.recurrence_rule
            else:
                recurrence_rule = self._create_or_update_recurrence_rule(
                    organization, recurrence_data
                )
            instance.is_recurring = bool(recurrence_rule)
            instance.recurrence_rule = recurrence_rule

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        return instance


class EventAttendeeSerializer(serializers.ModelSerializer):
    """
    Attendee representation used under `/events/{id}/attendees` and RSVP endpoints.
    """

    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = EventAttendee
        fields = [
            "id",
            "user",
            "email",
            "display_name",
            "attendee_type",
            "response_status",
            "response_comment",
            "responded_at",
            "is_organizer",
            "can_modify",
            "notification_enabled",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "responded_at",
            "is_organizer",
            "created_at",
            "updated_at",
        ]


class AttendeeCreateRequestSerializer(serializers.Serializer):
    """
    Request body for adding an attendee to an event.
    Mirrors the OpenAPI shape for /events/{event_id}/attendees/ POST.
    """

    user_id = serializers.IntegerField(required=False)
    email = serializers.EmailField(required=False)
    display_name = serializers.CharField(required=False, allow_blank=True)
    attendee_type = serializers.ChoiceField(
        choices=[choice[0] for choice in EventAttendee.ATTENDEE_TYPE_CHOICES],
        required=False,
        default="required",
    )

    def validate(self, attrs: dict) -> dict:
        if not attrs.get("user_id") and not attrs.get("email"):
            raise serializers.ValidationError(
                "Either user_id or email must be provided."
            )
        return attrs


class AttendeeResponseRequestSerializer(serializers.Serializer):
    """
    Maps to AttendeeResponseRequest in OpenAPI.
    """

    response_status = serializers.ChoiceField(
        choices=[choice[0] for choice in EventAttendee.RESPONSE_STATUS_CHOICES]
    )
    response_comment = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
    )


class EventReminderSerializer(serializers.ModelSerializer):
    """
    Reminder representation for `/events/{id}/reminders`.
    """

    class Meta:
        model = EventReminder
        fields = [
            "id",
            "method",
            "minutes_before",
            "time_value",
            "time_unit",
            "is_sent",
            "sent_at",
            "scheduled_time",
            "send_attempts",
            "last_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "is_sent",
            "sent_at",
            "scheduled_time",
            "send_attempts",
            "last_error",
            "created_at",
            "updated_at",
        ]


class EventCategorySerializer(serializers.ModelSerializer):
    """
    Event category representation.
    """

    class Meta:
        model = EventCategory
        fields = [
            "id",
            "name",
            "color",
            "description",
            "is_system",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "is_system", "created_at", "updated_at"]


class EventCategoryAssignmentSerializer(serializers.ModelSerializer):
    """
    Category assignment representation.
    """

    category = EventCategorySerializer(read_only=True)

    class Meta:
        model = EventCategoryAssignment
        fields = ["id", "category"]
        read_only_fields = fields


class CalendarSettingsSerializer(serializers.ModelSerializer):
    """
    Per-user calendar settings representation.
    """

    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = CalendarSettings
        fields = [
            "id",
            "user",
            "default_view",
            "week_start",
            "time_format",
            "timezone",
            "default_event_duration",
            "default_reminders",
            "working_hours_enabled",
            "working_hours_start",
            "working_hours_end",
            "working_days",
            "email_notifications_enabled",
            "notification_preferences",
            "show_declined_events",
            "auto_add_invitations",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "created_at", "updated_at"]


class NotificationSerializer(serializers.ModelSerializer):
    """
    Calendar notification representation.
    """

    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "notification_type",
            "title",
            "message",
            "event",
            "calendar",
            "is_read",
            "read_at",
            "action_url",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "user", "read_at", "created_at", "updated_at"]
