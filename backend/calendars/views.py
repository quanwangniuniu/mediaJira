from __future__ import annotations

from typing import Any
from types import SimpleNamespace
import uuid

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from core.models import Organization
from .models import (
    Calendar,
    CalendarShare,
    CalendarSubscription,
    Event,
    EventAttendee,
    RecurrenceException,
)
from .permissions import (
    IsAuthenticatedInOrganization,
    CalendarAccessPermission,
    EventAccessPermission,
    SubscriptionOwnerPermission,
    get_user_organization,
)
from .serializers import (
    CalendarSerializer,
    CalendarCreateUpdateSerializer,
    CalendarShareSerializer,
    CalendarShareRequestSerializer,
    CalendarSubscriptionSerializer,
    CalendarSubscriptionRequestSerializer,
    EventSerializer,
    EventCreateUpdateSerializer,
    EventAttendeeSerializer,
    AttendeeCreateRequestSerializer,
    AttendeeResponseRequestSerializer,
)


class CalendarViewSet(viewsets.ModelViewSet):
    """
    Calendar CRUD aligned with `/calendars/` endpoints.

    - `list`: calendars owned by or shared with the user (optionally including subscriptions)
    - `create`: create new calendar for current user and organization
    - `retrieve/update/destroy`: calendar details, soft delete on destroy
    """

    serializer_class = CalendarSerializer
    permission_classes = [IsAuthenticatedInOrganization, CalendarAccessPermission]
    required_permission = "view_all"

    def get_queryset(self):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return Calendar.objects.none()

        visibility = self.request.query_params.get("visibility")
        include_subscriptions_param = self.request.query_params.get("include_subscriptions", "true")
        include_subscriptions = include_subscriptions_param.lower() != "false"

        owned_qs = Calendar.objects.filter(
            organization=organization,
            owner=user,
            is_deleted=False,
        )

        shared_calendar_ids = CalendarShare.objects.filter(
            organization=organization,
            shared_with=user,
            is_deleted=False,
        ).values_list("calendar_id", flat=True)

        qs = Calendar.objects.filter(
            Q(pk__in=owned_qs.values_list("pk", flat=True))
            | Q(pk__in=shared_calendar_ids)
        ).filter(is_deleted=False, organization=organization)

        if include_subscriptions:
            subscribed_calendar_ids = CalendarSubscription.objects.filter(
                organization=organization,
                user=user,
                is_deleted=False,
                calendar__isnull=False,
            ).values_list("calendar_id", flat=True)
            qs = qs | Calendar.objects.filter(
                pk__in=subscribed_calendar_ids,
                organization=organization,
                is_deleted=False,
            )

        if visibility:
            qs = qs.filter(visibility=visibility)

        return qs.distinct().order_by("-is_primary", "name")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return CalendarCreateUpdateSerializer
        return CalendarSerializer

    def perform_create(self, serializer):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            raise ValueError("Organization context is required to create calendars.")
        serializer.save(owner=user, organization=organization)

    def perform_destroy(self, instance: Calendar):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class CalendarShareListCreateView(generics.ListCreateAPIView):
    """
    List and create calendar shares for a given calendar.
    """

    permission_classes = [IsAuthenticatedInOrganization, CalendarAccessPermission]
    required_permission = "manage"
    serializer_class = CalendarShareSerializer

    def get_calendar(self) -> Calendar:
        user = self.request.user
        organization = get_user_organization(user)
        calendar_id = self.kwargs["calendar_id"]
        calendar = get_object_or_404(
            Calendar, id=calendar_id, organization=organization, is_deleted=False
        )
        self.check_object_permissions(self.request, calendar)
        return calendar

    def get_queryset(self):
        calendar = self.get_calendar()
        return CalendarShare.objects.filter(
            organization=calendar.organization,
            calendar=calendar,
            is_deleted=False,
        )

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        calendar = self.get_calendar()

        request_serializer = CalendarShareRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        user_model = self.request.user.__class__
        shared_with = get_object_or_404(
            user_model,
            id=data["user_id"],
            organization_id=calendar.organization_id,
        )

        share, _created = CalendarShare.objects.update_or_create(
            organization=calendar.organization,
            calendar=calendar,
            shared_with=shared_with,
            defaults={
                "permission": data["permission"],
                "can_invite_others": data.get("can_invite_others", False),
            },
        )

        serializer = self.get_serializer(share)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CalendarShareDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a calendar share.
    """

    permission_classes = [IsAuthenticatedInOrganization, CalendarAccessPermission]
    required_permission = "manage"
    serializer_class = CalendarShareSerializer
    lookup_url_kwarg = "share_id"

    def get_object(self):
        user = self.request.user
        organization = get_user_organization(user)
        calendar_id = self.kwargs["calendar_id"]
        share_id = self.kwargs["share_id"]

        calendar = get_object_or_404(
            Calendar, id=calendar_id, organization=organization, is_deleted=False
        )
        self.check_object_permissions(self.request, calendar)

        share = get_object_or_404(
            CalendarShare,
            id=share_id,
            organization=organization,
            calendar=calendar,
            is_deleted=False,
        )
        return share

    def perform_destroy(self, instance: CalendarShare):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class SubscriptionListCreateView(generics.ListCreateAPIView):
    """
    List and create calendar subscriptions.
    """

    permission_classes = [IsAuthenticatedInOrganization, IsAuthenticated]
    serializer_class = CalendarSubscriptionSerializer

    def get_queryset(self):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return CalendarSubscription.objects.none()

        return CalendarSubscription.objects.filter(
            organization=organization,
            user=user,
            is_deleted=False,
        ).select_related("calendar")

    def get(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request, *args, **kwargs):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return Response(
                {"error": "Organization context is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request_serializer = CalendarSubscriptionRequestSerializer(data=request.data)
        request_serializer.is_valid(raise_exception=True)
        data = request_serializer.validated_data

        calendar = None
        if "calendar_id" in data:
            calendar = get_object_or_404(
                Calendar,
                id=data["calendar_id"],
                organization=organization,
                is_deleted=False,
            )

        subscription, _created = CalendarSubscription.objects.update_or_create(
            organization=organization,
            user=user,
            calendar=calendar,
            source_url=data.get("source_url"),
            defaults={
                "color_override": data.get("color_override"),
                "is_hidden": data.get("is_hidden", False),
                "notification_enabled": data.get("notification_enabled", True),
            },
        )

        serializer = self.get_serializer(subscription)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class SubscriptionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a subscription.
    """

    permission_classes = [IsAuthenticatedInOrganization, SubscriptionOwnerPermission]
    serializer_class = CalendarSubscriptionSerializer
    lookup_url_kwarg = "subscription_id"

    def get_object(self):
        user = self.request.user
        organization = get_user_organization(user)
        subscription_id = self.kwargs["subscription_id"]

        subscription = get_object_or_404(
            CalendarSubscription,
            id=subscription_id,
            organization=organization,
            is_deleted=False,
        )
        self.check_object_permissions(self.request, subscription)
        return subscription

    def patch(self, request, *args, **kwargs):
        subscription = self.get_object()

        partial_data = {
            key: request.data.get(key)
            for key in ["color_override", "is_hidden", "notification_enabled"]
            if key in request.data
        }
        for key, value in partial_data.items():
            setattr(subscription, key, value)
        subscription.save()

        serializer = self.get_serializer(subscription)
        return Response(serializer.data)

    def perform_destroy(self, instance: CalendarSubscription):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class EventViewSet(viewsets.ModelViewSet):
    """
    Event CRUD aligned with `/events/` endpoints.
    """

    serializer_class = EventSerializer
    permission_classes = [IsAuthenticatedInOrganization, EventAccessPermission]
    required_permission = "view_all"

    def get_queryset(self):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return Event.objects.none()

        queryset = Event.objects.select_related("calendar", "created_by").filter(
            organization=organization,
            is_deleted=False,
        )

        calendar_ids_param = self.request.query_params.get("calendar_ids")
        if calendar_ids_param:
            calendar_ids = [cid for cid in calendar_ids_param.split(",") if cid]
            queryset = queryset.filter(calendar_id__in=calendar_ids)

        status_param = self.request.query_params.get("status")
        if status_param:
            queryset = queryset.filter(status=status_param)

        event_type = self.request.query_params.get("event_type")
        if event_type:
            queryset = queryset.filter(event_type=event_type)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(location__icontains=search)
            )

        start_min = self.request.query_params.get("start_min")
        if start_min:
            queryset = queryset.filter(start_datetime__gte=start_min)

        start_max = self.request.query_params.get("start_max")
        if start_max:
            queryset = queryset.filter(start_datetime__lte=start_max)

        time_min = self.request.query_params.get("time_min")
        if time_min:
            queryset = queryset.filter(end_datetime__gt=time_min)

        time_max = self.request.query_params.get("time_max")
        if time_max:
            queryset = queryset.filter(start_datetime__lt=time_max)

        return queryset.order_by("start_datetime")

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return EventCreateUpdateSerializer
        return EventSerializer

    def create(self, request, *args, **kwargs):
        """
        Create event and return full Event representation (with id, calendar_id, etc.).
        """
        serializer = EventCreateUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        output_serializer = EventSerializer(event)
        headers = self.get_success_headers(output_serializer.data)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Update event and return full Event representation.
        """
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = EventCreateUpdateSerializer(
            instance, data=request.data, partial=partial, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        output_serializer = EventSerializer(event)
        return Response(output_serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs["partial"] = True
        return self.update(request, *args, **kwargs)

    def perform_destroy(self, instance: Event):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class EventSearchView(generics.ListAPIView):
    """
    Event search endpoint backed by the same Event model.
    """

    serializer_class = EventSerializer
    permission_classes = [IsAuthenticatedInOrganization, EventAccessPermission]

    def get_queryset(self):
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            return Event.objects.none()

        queryset = Event.objects.select_related("calendar", "created_by").filter(
            organization=organization,
            is_deleted=False,
        )

        q = self.request.query_params.get("q")
        if not q or len(q.strip()) < 2:
            return Event.objects.none()
        q = q.strip()

        queryset = queryset.filter(
            Q(title__icontains=q)
            | Q(description__icontains=q)
            | Q(location__icontains=q)
        )

        calendar_ids_param = self.request.query_params.get("calendar_ids")
        if calendar_ids_param:
            calendar_ids = [cid for cid in calendar_ids_param.split(",") if cid]
            queryset = queryset.filter(calendar_id__in=calendar_ids)

        time_min = self.request.query_params.get("time_min")
        if time_min:
            queryset = queryset.filter(end_datetime__gt=time_min)

        time_max = self.request.query_params.get("time_max")
        if time_max:
            queryset = queryset.filter(start_datetime__lt=time_max)

        return queryset.order_by("start_datetime")


def _parse_iso_datetime(value: str):
    dt = parse_datetime(value)
    if dt is None:
        raise ValueError("Invalid datetime format")
    if timezone.is_naive(dt):
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _expand_recurring_event(
    event: Event,
    time_min,
    time_max,
    max_results: int = 250,
):
    """
    Expand a recurring event into concrete instances within [time_min, time_max).
    Currently supports simple DAILY and WEEKLY patterns based on start_datetime.
    """
    if not event.is_recurring or not event.recurrence_rule_id:
        return []

    rule = event.recurrence_rule
    frequency = rule.frequency
    interval = max(int(rule.interval or 1), 1)

    duration = event.end_datetime - event.start_datetime
    instances: list[Any] = []

    # Load exceptions for this event/rule within range
    exceptions = RecurrenceException.objects.filter(
        organization=event.organization,
        recurrence_rule=rule,
        original_event=event,
        exception_date__gte=time_min,
        exception_date__lt=time_max,
    ).select_related("modified_event")
    exceptions_by_date = {exc.exception_date: exc for exc in exceptions}

    current = event.start_datetime

    # Fast-forward to first occurrence that could intersect [time_min, time_max)
    if frequency == "DAILY":
        step = timezone.timedelta(days=interval)
    elif frequency == "WEEKLY":
        step = timezone.timedelta(weeks=interval)
    else:
        # For now only basic DAILY/WEEKLY patterns are supported in expansion.
        return []

    while current + duration <= time_max and len(instances) < max_results:
        # Check intersection with requested window
        if current < time_max and (current + duration) > time_min:
            exc = exceptions_by_date.get(current)
            if exc:
                if exc.is_cancelled:
                    # Skip cancelled instance
                    pass
                else:
                    # Use modified event instance
                    instances.append(exc.modified_event)
            else:
                # Create a lightweight instance based on the master event
                attrs = {}
                for field in Event._meta.fields:
                    name = field.name
                    attrs[name] = getattr(event, name)

                # Override fields specific to this occurrence
                attrs["id"] = event.id  # master id; original_start differentiates instances
                attrs["start_datetime"] = current
                attrs["end_datetime"] = current + duration
                attrs["original_start"] = current

                instance_obj = SimpleNamespace(**attrs)
                instances.append(instance_obj)

        current = current + step

    return instances


class EventInstancesView(generics.ListAPIView):
    """
    Return expanded instances for a recurring event.
    """

    serializer_class = EventSerializer
    permission_classes = [IsAuthenticatedInOrganization, EventAccessPermission]

    def get(self, request, *args, **kwargs):
        event_id = self.kwargs["event_id"]
        user = request.user
        organization = get_user_organization(user)
        if not organization:
            return Response(
                {"detail": "Organization context is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        event = get_object_or_404(
            Event,
            id=event_id,
            organization=organization,
            is_deleted=False,
        )

        # Object-level permission
        perm = EventAccessPermission()
        setattr(self, "required_permission", "view_all")
        if not perm.has_object_permission(request, self, event):
            raise PermissionDenied("You do not have access to this event.")

        time_min_raw = request.query_params.get("time_min")
        time_max_raw = request.query_params.get("time_max")
        max_results_raw = request.query_params.get("max_results")

        if not time_min_raw or not time_max_raw:
            return Response(
                {"detail": "time_min and time_max are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            time_min = _parse_iso_datetime(time_min_raw)
            time_max = _parse_iso_datetime(time_max_raw)
        except ValueError:
            return Response(
                {"detail": "Invalid datetime format for time_min or time_max."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if time_min >= time_max:
            return Response(
                {"detail": "time_min must be earlier than time_max."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_results = 250
        if max_results_raw is not None:
            try:
                max_results = max(min(int(max_results_raw), 2500), 1)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "max_results must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        instances = _expand_recurring_event(event, time_min, time_max, max_results)
        serializer = self.get_serializer(instances, many=True)
        return Response(serializer.data)


class EventAttendeeListCreateView(generics.ListCreateAPIView):
    """
    List and add attendees for a specific event.
    """

    serializer_class = EventAttendeeSerializer
    permission_classes = [IsAuthenticatedInOrganization]

    def _get_event(self) -> Event:
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            raise PermissionDenied("Organization context is required.")

        event_id = self.kwargs["event_id"]
        event = get_object_or_404(
            Event,
            id=event_id,
            organization=organization,
            is_deleted=False,
        )

        # Object-level permission via EventAccessPermission
        perm = EventAccessPermission()
        setattr(self, "required_permission", "view_all")
        if not perm.has_object_permission(self.request, self, event):
            raise PermissionDenied("You do not have access to this event.")

        return event

    def get_queryset(self):
        event = self._get_event()
        return event.attendees.filter(is_deleted=False).order_by(
            "-is_organizer", "attendee_type", "email"
        )

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        event = self._get_event()

        # Adding attendees requires edit permission
        perm = EventAccessPermission()
        setattr(self, "required_permission", "edit")
        if not perm.has_object_permission(self.request, self, event):
            raise PermissionDenied("You do not have permission to modify attendees.")

        req_serializer = AttendeeCreateRequestSerializer(data=request.data)
        req_serializer.is_valid(raise_exception=True)
        data = req_serializer.validated_data

        user = None
        email = data.get("email")

        if data.get("user_id"):
            user_model = self.request.user.__class__
            user = get_object_or_404(
                user_model,
                id=data["user_id"],
                organization_id=event.organization_id,
            )
            if not email:
                email = user.email

        attendee = EventAttendee(
            organization=event.organization,
            event=event,
            user=user,
            email=email,
            display_name=data.get("display_name") or "",
            attendee_type=data.get("attendee_type", "required"),
        )
        attendee.save()

        serializer = self.get_serializer(attendee)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class EventAttendeeDetailView(generics.DestroyAPIView):
    """
    Remove an attendee from an event.
    """

    permission_classes = [IsAuthenticatedInOrganization]
    serializer_class = EventAttendeeSerializer
    lookup_url_kwarg = "attendee_id"

    def _get_event(self) -> Event:
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            raise PermissionDenied("Organization context is required.")

        event_id = self.kwargs["event_id"]
        event = get_object_or_404(
            Event,
            id=event_id,
            organization=organization,
            is_deleted=False,
        )

        perm = EventAccessPermission()
        setattr(self, "required_permission", "edit")
        if not perm.has_object_permission(self.request, self, event):
            raise PermissionDenied("You do not have permission to modify attendees.")

        return event

    def get_object(self):
        event = self._get_event()
        attendee_id = self.kwargs["attendee_id"]
        attendee = get_object_or_404(
            EventAttendee,
            id=attendee_id,
            organization=event.organization,
            event=event,
            is_deleted=False,
        )
        return attendee

    def perform_destroy(self, instance: EventAttendee):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted", "updated_at"])


class EventRSVPView(generics.GenericAPIView):
    """
    RSVP endpoint for the authenticated user.
    """

    serializer_class = AttendeeResponseRequestSerializer
    permission_classes = [IsAuthenticatedInOrganization]

    def _get_event(self) -> Event:
        user = self.request.user
        organization = get_user_organization(user)
        if not organization:
            raise PermissionDenied("Organization context is required.")

        event_id = self.kwargs["event_id"]
        event = get_object_or_404(
            Event,
            id=event_id,
            organization=organization,
            is_deleted=False,
        )

        perm = EventAccessPermission()
        setattr(self, "required_permission", "view_all")
        if not perm.has_object_permission(self.request, self, event):
            raise PermissionDenied("You do not have access to this event.")

        return event

    def post(self, request, *args, **kwargs):
        event = self._get_event()

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = request.user

        attendee = (
            EventAttendee.objects.filter(
                organization=event.organization,
                event=event,
                user=user,
                is_deleted=False,
            )
            .select_related("user")
            .first()
        )

        if not attendee:
            attendee = EventAttendee(
                organization=event.organization,
                event=event,
                user=user,
                email=getattr(user, "email", None),
                attendee_type="required",
            )

        attendee.response_status = data["response_status"]
        attendee.response_comment = data.get("response_comment") or ""
        attendee.save()

        output = EventAttendeeSerializer(attendee)
        return Response(output.data, status=status.HTTP_200_OK)


class EventInstanceModifyView(generics.GenericAPIView):
    """
    Modify a specific instance of a recurring event.
    """

    serializer_class = EventCreateUpdateSerializer
    permission_classes = [IsAuthenticatedInOrganization, EventAccessPermission]

    def _get_event(self, request, *args, **kwargs) -> Event:
        user = request.user
        organization = get_user_organization(user)
        if not organization:
            raise PermissionDenied("Organization context is required.")

        event_id = self.kwargs["event_id"]
        event = get_object_or_404(
            Event,
            id=event_id,
            organization=organization,
            is_deleted=False,
        )

        perm = EventAccessPermission()
        setattr(self, "required_permission", "edit")
        if not perm.has_object_permission(request, self, event):
            raise PermissionDenied("You do not have permission to modify this event.")

        if not event.is_recurring or not event.recurrence_rule_id:
            raise PermissionDenied("Event is not recurring.")

        return event

    def patch(self, request, *args, **kwargs):
        event = self._get_event(request, *args, **kwargs)

        original_start_raw = request.query_params.get("original_start")
        if not original_start_raw:
            return Response(
                {"detail": "original_start query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            original_start = _parse_iso_datetime(original_start_raw)
        except ValueError:
            return Response(
                {"detail": "Invalid datetime format for original_start."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find existing exception (if any)
        exc = (
            RecurrenceException.objects.filter(
                organization=event.organization,
                recurrence_rule=event.recurrence_rule,
                original_event=event,
                exception_date=original_start,
            )
            .select_related("modified_event")
            .first()
        )

        modified_event = None
        if exc and not exc.is_cancelled:
            modified_event = exc.modified_event
        else:
            # Create a cloned one-off event for this instance
            cloned = Event.objects.get(pk=event.pk)
            cloned.pk = None
            cloned.id = uuid.uuid4()
            cloned.is_recurring = False
            cloned.recurrence_rule = None
            cloned.original_start = original_start
            duration = event.end_datetime - event.start_datetime
            cloned.start_datetime = original_start
            cloned.end_datetime = original_start + duration
            cloned.ical_uid = None
            cloned.is_deleted = False
            cloned.save()

            modified_event = cloned

            # Create or update exception record
            if exc:
                exc.is_cancelled = False
                exc.modified_event = modified_event
                exc.exception_date = original_start
                exc.organization = event.organization
                exc.recurrence_rule = event.recurrence_rule
                exc.original_event = event
                exc.save()
            else:
                RecurrenceException.objects.create(
                    organization=event.organization,
                    recurrence_rule=event.recurrence_rule,
                    original_event=event,
                    exception_date=original_start,
                    is_cancelled=False,
                    modified_event=modified_event,
                )

        # Apply patch data to the modified_event using EventCreateUpdateSerializer
        serializer = EventCreateUpdateSerializer(
            modified_event,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        modified_event = serializer.save()

        output = EventSerializer(modified_event)
        return Response(output.data, status=status.HTTP_200_OK)


class EventInstanceCancelView(generics.GenericAPIView):
    """
    Cancel (delete) a specific instance of a recurring event.
    """

    permission_classes = [IsAuthenticatedInOrganization, EventAccessPermission]

    def _get_event(self, request, *args, **kwargs) -> Event:
        user = request.user
        organization = get_user_organization(user)
        if not organization:
            raise PermissionDenied("Organization context is required.")

        event_id = self.kwargs["event_id"]
        event = get_object_or_404(
            Event,
            id=event_id,
            organization=organization,
            is_deleted=False,
        )

        perm = EventAccessPermission()
        setattr(self, "required_permission", "edit")
        if not perm.has_object_permission(request, self, event):
            raise PermissionDenied("You do not have permission to modify this event.")

        if not event.is_recurring or not event.recurrence_rule_id:
            raise PermissionDenied("Event is not recurring.")

        return event

    def delete(self, request, *args, **kwargs):
        event = self._get_event(request, *args, **kwargs)

        original_start_raw = request.query_params.get("original_start")
        if not original_start_raw:
            return Response(
                {"detail": "original_start query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            original_start = _parse_iso_datetime(original_start_raw)
        except ValueError:
            return Response(
                {"detail": "Invalid datetime format for original_start."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        exc = (
            RecurrenceException.objects.filter(
                organization=event.organization,
                recurrence_rule=event.recurrence_rule,
                original_event=event,
                exception_date=original_start,
            )
            .select_related("modified_event")
            .first()
        )

        if exc:
            # Soft delete any existing modified_event and mark exception as cancelled
            if exc.modified_event_id:
                exc.modified_event.is_deleted = True
                exc.modified_event.save(update_fields=["is_deleted", "updated_at"])
            exc.modified_event = None
            exc.is_cancelled = True
            exc.save()
        else:
            RecurrenceException.objects.create(
                organization=event.organization,
                recurrence_rule=event.recurrence_rule,
                original_event=event,
                exception_date=original_start,
                is_cancelled=True,
                modified_event=None,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)
