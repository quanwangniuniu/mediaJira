from __future__ import annotations

from typing import Any

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.models import Organization
from .models import Calendar, CalendarShare, CalendarSubscription, Event
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
