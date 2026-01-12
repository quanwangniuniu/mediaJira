from django.urls import path

from .views import (
    CalendarViewSet,
    SubscriptionListCreateView,
    SubscriptionDetailView,
    CalendarShareListCreateView,
    CalendarShareDetailView,
    EventViewSet,
    EventSearchView,
    EventAttendeeListCreateView,
    EventAttendeeDetailView,
    EventRSVPView,
    EventInstancesView,
    EventInstanceModifyView,
    EventInstanceCancelView,
)


calendar_list = CalendarViewSet.as_view({"get": "list", "post": "create"})
calendar_detail = CalendarViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)

event_list = EventViewSet.as_view({"get": "list", "post": "create"})
event_detail = EventViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)

urlpatterns = [
    # Calendar management
    path("calendars/", calendar_list, name="calendar-list"),
    path("calendars/<uuid:pk>/", calendar_detail, name="calendar-detail"),

    # Calendar sharing
    path(
        "calendars/<uuid:calendar_id>/shares/",
        CalendarShareListCreateView.as_view(),
        name="calendar-share-list",
    ),
    path(
        "calendars/<uuid:calendar_id>/shares/<uuid:share_id>/",
        CalendarShareDetailView.as_view(),
        name="calendar-share-detail",
    ),

    # Subscriptions
    path("subscriptions/", SubscriptionListCreateView.as_view(), name="subscription-list"),
    path(
        "subscriptions/<uuid:subscription_id>/",
        SubscriptionDetailView.as_view(),
        name="subscription-detail",
    ),

    # Event management
    path("events/", event_list, name="event-list"),
    path("events/<uuid:pk>/", event_detail, name="event-detail"),

    # Event search
    path("events/search/", EventSearchView.as_view(), name="event-search"),

    # Event attendees
    path(
        "events/<uuid:event_id>/attendees/",
        EventAttendeeListCreateView.as_view(),
        name="event-attendee-list",
    ),
    path(
        "events/<uuid:event_id>/attendees/<uuid:attendee_id>/",
        EventAttendeeDetailView.as_view(),
        name="event-attendee-detail",
    ),

    # RSVP
    path(
        "events/<uuid:event_id>/rsvp/",
        EventRSVPView.as_view(),
        name="event-rsvp",
    ),

    # Recurring event instances
    path(
        "events/<uuid:event_id>/instances/",
        EventInstancesView.as_view(),
        name="event-instances",
    ),
    path(
        "events/<uuid:event_id>/instances/modify/",
        EventInstanceModifyView.as_view(),
        name="event-instance-modify",
    ),
    path(
        "events/<uuid:event_id>/instances/cancel/",
        EventInstanceCancelView.as_view(),
        name="event-instance-cancel",
    ),
]
