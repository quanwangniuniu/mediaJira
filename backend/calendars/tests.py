from datetime import datetime, timedelta, timezone as dt_timezone

from django.contrib.auth import get_user_model, models as auth_models
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from core.models import Organization
from calendars.models import (
    Calendar,
    CalendarShare,
    CalendarSubscription,
    Event,
    RecurrenceRule,
    RecurrenceException,
    EventAttendee,
    EventReminder,
    EventCategory,
    EventCategoryAssignment,
    CalendarSettings,
    Notification,
)
from calendars.views import (
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
    DayView,
    WeekView,
    MonthView,
    AgendaView,
    FreeBusyView,
    EventReminderListCreateView,
)
from calendars.exceptions import (
    calendar_error_response,
    _build_details_from_errors,
    calendar_exception_handler,
)
from calendars.permissions import (
    IsAuthenticatedInOrganization,
    CalendarAccessPermission,
    EventAccessPermission,
    SubscriptionOwnerPermission,
)


User = get_user_model()


class CalendarTestBase(TestCase):
    """
    Common setup helpers for calendar tests.
    """

    def setUp(self):
        super().setUp()
        self.factory = APIRequestFactory()

        self.organization = Organization.objects.create(name="Org", slug="org")
        self.user = User.objects.create_user(
            email="user@example.com",
            password="test1234",
            username="user",
            organization=self.organization,
        )
        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="test1234",
            username="other",
            organization=self.organization,
        )

        # Use the calendar automatically created by the signal
        # instead of manually creating another primary calendar
        self.calendar = Calendar.objects.get(
            organization=self.organization,
            owner=self.user,
            is_primary=True,
        )


class CalendarModelTests(CalendarTestBase):
    def test_calendar_organization_must_match_owner(self):
        other_org = Organization.objects.create(name="Other", slug="other")
        cal = Calendar(
            organization=other_org,
            owner=self.user,
            name="Invalid",
        )
        with self.assertRaises(ValidationError) as ctx:
            cal.full_clean()
        self.assertIn("Calendar.organization must match owner.organization", str(ctx.exception))

    def test_only_one_primary_calendar_per_owner_and_org(self):
        # Creating a second primary for same (organization, owner)
        # should automatically demote the first one to non-primary.
        initial_calendar = self.calendar
        self.assertTrue(initial_calendar.is_primary)
        
        # Create a new primary calendar
        new_calendar = Calendar.objects.create(
            organization=self.organization,
            owner=self.user,
            name="Secondary",
            timezone="UTC",
            is_primary=True,
        )
        
        # The new one should be primary
        self.assertTrue(new_calendar.is_primary)
        
        # The old one should no longer be primary
        initial_calendar.refresh_from_db()
        self.assertFalse(initial_calendar.is_primary)
        
        # Only one primary should exist
        primary_count = Calendar.objects.filter(
            organization=self.organization,
            owner=self.user,
            is_primary=True,
            is_deleted=False,
        ).count()
        self.assertEqual(primary_count, 1)


class CalendarSubscriptionTests(CalendarTestBase):
    def test_subscription_xor_calendar_and_source_url(self):
        # Valid internal subscription
        sub = CalendarSubscription(
            organization=self.organization,
            user=self.user,
            calendar=self.calendar,
        )
        sub.full_clean()  # should not raise

        # Invalid: both calendar and source_url set
        sub2 = CalendarSubscription(
            organization=self.organization,
            user=self.user,
            calendar=self.calendar,
            source_url="https://example.com/ical.ics",
        )
        with self.assertRaises(ValidationError):
            sub2.full_clean()


class EventModelTests(CalendarTestBase):
    def _create_basic_event(self, **kwargs) -> Event:
        start = timezone.now()
        end = start + timedelta(hours=1)
        data = {
            "organization": self.organization,
            "calendar": self.calendar,
            "created_by": self.user,
            "title": "Planning",
            "start_datetime": start,
            "end_datetime": end,
            "timezone": "UTC",
        }
        data.update(kwargs)
        event = Event(**data)
        event.save()
        return event

    def test_event_end_must_be_after_start(self):
        start = timezone.now()
        end = start - timedelta(minutes=10)
        event = Event(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Invalid",
            start_datetime=start,
            end_datetime=end,
            timezone="UTC",
        )
        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_event_recurring_requires_recurrence_rule(self):
        start = timezone.now()
        end = start + timedelta(hours=1)
        rule = RecurrenceRule.objects.create(
            organization=self.organization,
            frequency="DAILY",
            interval=1,
        )
        event = Event(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Recurring",
            start_datetime=start,
            end_datetime=end,
            timezone="UTC",
            is_recurring=True,
            recurrence_rule=rule,
        )
        event.full_clean()  # ok

        event.recurrence_rule = None
        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_non_recurring_must_not_have_recurrence_rule(self):
        start = timezone.now()
        end = start + timedelta(hours=1)
        rule = RecurrenceRule.objects.create(
            organization=self.organization,
            frequency="DAILY",
            interval=1,
        )
        event = Event(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Invalid",
            start_datetime=start,
            end_datetime=end,
            timezone="UTC",
            is_recurring=False,
            recurrence_rule=rule,
        )
        with self.assertRaises(ValidationError):
            event.full_clean()

    def test_duration_and_multi_day_properties(self):
        start = datetime(2026, 1, 1, 10, 0, tzinfo=dt_timezone.utc)
        end = start + timedelta(hours=2)
        event = self._create_basic_event(start_datetime=start, end_datetime=end)
        self.assertEqual(event.duration_minutes, 120)
        self.assertFalse(event.is_multi_day)

        multi_end = datetime(2026, 1, 2, 9, 0, tzinfo=dt_timezone.utc)
        event2 = self._create_basic_event(
            title="Multi",
            start_datetime=start,
            end_datetime=multi_end,
        )
        self.assertTrue(event2.is_multi_day)

    def test_ical_uid_and_etag_generated_on_save(self):
        event = self._create_basic_event()
        self.assertIsNotNone(event.ical_uid)
        self.assertIsNotNone(event.etag)


class EventQuerySetTests(CalendarTestBase):
    def setUp(self):
        super().setUp()
        # Create active and soft-deleted events
        start = datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc)
        for i in range(3):
            Event.objects.create(
                organization=self.organization,
                calendar=self.calendar,
                created_by=self.user,
                title=f"Event {i}",
                start_datetime=start + timedelta(days=i),
                end_datetime=start + timedelta(days=i, hours=1),
                timezone="UTC",
            )
        self.deleted_event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Deleted",
            start_datetime=start,
            end_datetime=start + timedelta(hours=1),
            timezone="UTC",
            is_deleted=True,
        )

    def test_active_only_returns_non_deleted(self):
        all_count = Event.objects.filter(organization=self.organization).count()
        active_count = Event.objects.active().for_organization(self.organization).count()
        self.assertEqual(all_count - 1, active_count)

    def test_for_calendars_and_in_timerange(self):
        cal_events = Event.objects.active().for_calendars([self.calendar])
        self.assertEqual(cal_events.count(), 3)

        start = datetime(2026, 1, 15, 0, 0, tzinfo=dt_timezone.utc)
        end = datetime(2026, 1, 17, 0, 0, tzinfo=dt_timezone.utc)
        ranged = Event.objects.active().for_organization(self.organization).in_timerange(start, end)
        # Should include events on 15th and 16th
        self.assertEqual(ranged.count(), 2)


class EventAttendeeTests(CalendarTestBase):
    def test_attendee_email_and_display_autofill(self):
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        attendee = EventAttendee.objects.create(
            organization=self.organization,
            event=event,
            user=self.user,
            email="",
            display_name="",
            attendee_type="required",
        )
        self.assertEqual(attendee.email, self.user.email)
        self.assertEqual(attendee.display_name, self.user.email)

    def test_rsvp_updates_response_and_timestamp(self):
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        attendee = EventAttendee.objects.create(
            organization=self.organization,
            event=event,
            user=self.user,
            email=self.user.email,
            attendee_type="required",
        )
        self.assertEqual(attendee.response_status, "needs_action")
        self.assertIsNone(attendee.responded_at)

        attendee.response_status = "accepted"
        attendee.save()
        attendee.refresh_from_db()
        self.assertEqual(attendee.response_status, "accepted")
        self.assertIsNotNone(attendee.responded_at)


class EventReminderTests(CalendarTestBase):
    def test_reminder_scheduled_time_computed_from_minutes_before(self):
        start = datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc)
        end = start + timedelta(hours=1)
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=start,
            end_datetime=end,
            timezone="UTC",
        )
        reminder = EventReminder.objects.create(
            organization=self.organization,
            event=event,
            user=self.user,
            method="notification",
            minutes_before=30,
        )
        expected = start - timedelta(minutes=30)
        self.assertEqual(reminder.scheduled_time, expected)


class CalendarAPITests(CalendarTestBase):
    def test_create_calendar_via_viewset(self):
        view = CalendarViewSet.as_view({"post": "create"})
        payload = {
            "name": "Personal",
            "description": "Personal calendar",
            "color": "#1E88E5",
            "visibility": "private",
            "timezone": "UTC",
            "is_primary": False,
        }
        request = self.factory.post("/api/v1/calendars/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Calendar.objects.filter(organization=self.organization).count(), 2)

    def test_calendar_unique_name_per_owner(self):
        view = CalendarViewSet.as_view({"post": "create"})
        payload = {
            "name": "My Calendar",  # same as existing
            "timezone": "UTC",
        }
        request = self.factory.post("/api/v1/calendars/", payload, format="json")
        force_authenticate(request, user=self.user)
        with self.assertRaises(ValidationError):
            # Model-level unique constraint is enforced via full_clean in save()
            view(request)

    def test_calendar_list_includes_subscriptions_and_visibility_filter(self):
        # Another calendar owned by other_user and subscribed by self.user
        other_cal = Calendar.objects.create(
            organization=self.organization,
            owner=self.other_user,
            name="Team Calendar",
            timezone="UTC",
            visibility="public",
        )
        CalendarSubscription.objects.create(
            organization=self.organization,
            user=self.user,
            calendar=other_cal,
            is_hidden=False,
        )

        view = CalendarViewSet.as_view({"get": "list"})

        # Default: include_subscriptions=True -> should see both calendars
        req = self.factory.get("/api/v1/calendars/")
        force_authenticate(req, user=self.user)
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data
        if isinstance(data, dict) and "results" in data:
            items = data["results"]
        else:
            items = data
        names = sorted([c["name"] for c in items])
        self.assertIn("My Calendar", names)
        self.assertIn("Team Calendar", names)

        # Exclude subscriptions
        req_no_sub = self.factory.get("/api/v1/calendars/?include_subscriptions=false")
        force_authenticate(req_no_sub, user=self.user)
        resp_no_sub = view(req_no_sub)
        data_no_sub = resp_no_sub.data
        if isinstance(data_no_sub, dict) and "results" in data_no_sub:
            items_no_sub = data_no_sub["results"]
        else:
            items_no_sub = data_no_sub
        names_no_sub = [c["name"] for c in items_no_sub]
        self.assertIn("My Calendar", names_no_sub)
        self.assertNotIn("Team Calendar", names_no_sub)

        # Visibility filter
        req_public = self.factory.get("/api/v1/calendars/?visibility=public")
        force_authenticate(req_public, user=self.user)
        resp_public = view(req_public)
        data_public = resp_public.data
        if isinstance(data_public, dict) and "results" in data_public:
            items_public = data_public["results"]
        else:
            items_public = data_public
        names_public = [c["name"] for c in items_public]
        self.assertEqual(names_public, ["Team Calendar"])


class EventAPITests(CalendarTestBase):
    def _create_event_via_api(self) -> Event:
        view = EventViewSet.as_view({"post": "create"})
        payload = {
            "calendar_id": str(self.calendar.id),
            "title": "Planning Meeting",
            "description": "Weekly planning",
            "start_datetime": "2026-01-15T10:00:00Z",
            "end_datetime": "2026-01-15T11:00:00Z",
            "timezone": "UTC",
            "is_all_day": False,
            "status": "confirmed",
            "event_type": "default",
        }
        request = self.factory.post("/api/v1/events/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event_id = response.data["id"]
        return Event.objects.get(id=event_id)

    def test_create_event_happy_path(self):
        event = self._create_event_via_api()
        self.assertEqual(event.title, "Planning Meeting")
        self.assertEqual(event.calendar, self.calendar)
        self.assertEqual(event.created_by, self.user)

    def test_create_event_validation_error_has_standard_error_shape(self):
        view = EventViewSet.as_view({"post": "create"})
        payload = {
            "calendar_id": "not-a-uuid",
            "start_datetime": "2026-01-01T10:00:00Z",
            "end_datetime": "2026-01-01T11:00:00Z",
            "timezone": "UTC",
        }
        request = self.factory.post("/api/v1/events/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data.get("error"), "VALIDATION_ERROR")
        self.assertIn("details", response.data)

    def test_event_soft_delete(self):
        event = self._create_event_via_api()
        view = EventViewSet.as_view({"delete": "destroy"})
        request = self.factory.delete(f"/api/v1/events/{event.id}/")
        force_authenticate(request, user=self.user)
        response = view(request, pk=event.id)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        event.refresh_from_db()
        self.assertTrue(event.is_deleted)

    def test_event_list_pagination_and_filtering(self):
        # Create multiple events with different status
        for i in range(5):
            Event.objects.create(
                organization=self.organization,
                calendar=self.calendar,
                created_by=self.user,
                title=f"Event {i}",
                start_datetime=datetime(2026, 1, 10 + i, 10, 0, tzinfo=dt_timezone.utc),
                end_datetime=datetime(2026, 1, 10 + i, 11, 0, tzinfo=dt_timezone.utc),
                timezone="UTC",
                status="confirmed" if i % 2 == 0 else "tentative",
            )

        view = EventViewSet.as_view({"get": "list"})

        # Pagination: page=1, verify pagination envelope and item count are reasonable
        req_page = self.factory.get("/api/v1/events/?page=1")
        force_authenticate(req_page, user=self.user)
        resp_page = view(req_page)
        self.assertEqual(resp_page.status_code, status.HTTP_200_OK)
        data = resp_page.data
        # PageNumberPagination -> dict with count/results
        self.assertIn("count", data)
        self.assertIn("results", data)
        # The first page size should be greater than 0 and less than or equal to the total count
        self.assertGreater(len(data["results"]), 0)
        self.assertLessEqual(len(data["results"]), data["count"])

        # Filter by status
        req_filter = self.factory.get("/api/v1/events/?status=confirmed")
        force_authenticate(req_filter, user=self.user)
        resp_filter = view(req_filter)
        self.assertEqual(resp_filter.status_code, status.HTTP_200_OK)
        for item in resp_filter.data["results"]:
            self.assertEqual(item["status"], "confirmed")


class SubscriptionAPITests(CalendarTestBase):
    def setUp(self):
        super().setUp()
        self.other_calendar = Calendar.objects.create(
            organization=self.organization,
            owner=self.other_user,
            name="Other Calendar",
            timezone="UTC",
        )

    def test_create_and_list_subscription_via_api(self):
        view = SubscriptionListCreateView.as_view()
        payload = {
            "calendar_id": str(self.other_calendar.id),
            "color_override": "#E53935",
            "is_hidden": False,
            "notification_enabled": True,
        }
        req_create = self.factory.post("/api/v1/subscriptions/", payload, format="json")
        force_authenticate(req_create, user=self.user)
        resp_create = view(req_create)
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)

        req_list = self.factory.get("/api/v1/subscriptions/")
        force_authenticate(req_list, user=self.user)
        resp_list = view(req_list)
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_list.data), 1)

    def test_subscription_patch_and_delete_via_api(self):
        sub = CalendarSubscription.objects.create(
            organization=self.organization,
            user=self.user,
            calendar=self.other_calendar,
            is_hidden=False,
        )
        detail_view = SubscriptionDetailView.as_view()

        # Patch
        req_patch = self.factory.patch(
            f"/api/v1/subscriptions/{sub.id}/",
            {"is_hidden": True},
            format="json",
        )
        force_authenticate(req_patch, user=self.user)
        resp_patch = detail_view(req_patch, subscription_id=sub.id)
        self.assertEqual(resp_patch.status_code, status.HTTP_200_OK)
        sub.refresh_from_db()
        self.assertTrue(sub.is_hidden)

        # Delete (soft)
        req_del = self.factory.delete(f"/api/v1/subscriptions/{sub.id}/")
        force_authenticate(req_del, user=self.user)
        resp_del = detail_view(req_del, subscription_id=sub.id)
        self.assertEqual(resp_del.status_code, status.HTTP_204_NO_CONTENT)
        sub.refresh_from_db()
        self.assertTrue(sub.is_deleted)


class RecurringEventAPITests(CalendarTestBase):
    def _create_recurring_event(self) -> Event:
        view = EventViewSet.as_view({"post": "create"})
        payload = {
            "calendar_id": str(self.calendar.id),
            "title": "Daily Recurring Test",
            "description": "For instances testing",
            "start_datetime": "2026-01-15T09:00:00Z",
            "end_datetime": "2026-01-15T10:00:00Z",
            "timezone": "UTC",
            "is_all_day": False,
            "status": "confirmed",
            "event_type": "default",
            "is_recurring": True,
            "recurrence": {
                "frequency": "DAILY",
                "interval": 1,
            },
        }
        request = self.factory.post("/api/v1/events/", payload, format="json")
        force_authenticate(request, user=self.user)
        response = view(request)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return Event.objects.get(id=response.data["id"])

    def test_instances_modify_and_cancel(self):
        event = self._create_recurring_event()

        # Expand instances
        instances_view = EventInstancesView.as_view()
        req_ins = self.factory.get(
            f"/api/v1/events/{event.id}/instances/",
            {
                "time_min": "2026-01-15T00:00:00Z",
                "time_max": "2026-01-20T00:00:00Z",
                "max_results": 10,
            },
        )
        force_authenticate(req_ins, user=self.user)
        resp_ins = instances_view(req_ins, event_id=event.id)
        self.assertEqual(resp_ins.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(resp_ins.data), 3)

        original_start = "2026-01-15T09:00:00Z"

        # Modify one instance
        modify_view = EventInstanceModifyView.as_view()
        req_mod = self.factory.patch(
            f"/api/v1/events/{event.id}/instances/modify/",
            {"title": "Modified Instance Title"},
            format="json",
        )
        req_mod.META["QUERY_STRING"] = f"original_start={original_start}"
        force_authenticate(req_mod, user=self.user)
        resp_mod = modify_view(req_mod, event_id=event.id)
        self.assertEqual(resp_mod.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_mod.data.get("title"), "Modified Instance Title")

        # Cancel same instance
        cancel_view = EventInstanceCancelView.as_view()
        req_cancel = self.factory.delete(
            f"/api/v1/events/{event.id}/instances/cancel/",
        )
        req_cancel.META["QUERY_STRING"] = f"original_start={original_start}"
        force_authenticate(req_cancel, user=self.user)
        resp_cancel = cancel_view(req_cancel, event_id=event.id)
        self.assertEqual(resp_cancel.status_code, status.HTTP_204_NO_CONTENT)


class AttendeeAndRSVPAPITests(CalendarTestBase):
    def setUp(self):
        super().setUp()
        self.event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )

    def test_attendee_crud_and_rsvp(self):
        # List attendees (empty)
        list_view = EventAttendeeListCreateView.as_view()
        req_list = self.factory.get(f"/api/v1/events/{self.event.id}/attendees/")
        force_authenticate(req_list, user=self.user)
        resp_list = list_view(req_list, event_id=self.event.id)
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_list.data, [])

        # Create attendee
        create_view = EventAttendeeListCreateView.as_view()
        req_create = self.factory.post(
            f"/api/v1/events/{self.event.id}/attendees/",
            {"user_id": self.user.id, "attendee_type": "required"},
            format="json",
        )
        force_authenticate(req_create, user=self.user)
        resp_create = create_view(req_create, event_id=self.event.id)
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)
        attendee_id = resp_create.data["id"]

        # List again
        req_list2 = self.factory.get(f"/api/v1/events/{self.event.id}/attendees/")
        force_authenticate(req_list2, user=self.user)
        resp_list2 = list_view(req_list2, event_id=self.event.id)
        self.assertEqual(len(resp_list2.data), 1)

        # RSVP
        rsvp_view = EventRSVPView.as_view()
        req_rsvp = self.factory.post(
            f"/api/v1/events/{self.event.id}/rsvp/",
            {"response_status": "accepted", "response_comment": "See you"},
            format="json",
        )
        force_authenticate(req_rsvp, user=self.user)
        resp_rsvp = rsvp_view(req_rsvp, event_id=self.event.id)
        self.assertEqual(resp_rsvp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_rsvp.data["response_status"], "accepted")

        # Delete attendee (soft)
        detail_view = EventAttendeeDetailView.as_view()
        req_delete = self.factory.delete(
            f"/api/v1/events/{self.event.id}/attendees/{attendee_id}/"
        )
        force_authenticate(req_delete, user=self.user)
        resp_delete = detail_view(req_delete, event_id=self.event.id, attendee_id=attendee_id)
        self.assertEqual(resp_delete.status_code, status.HTTP_204_NO_CONTENT)
        att = EventAttendee.objects.get(id=attendee_id)
        self.assertTrue(att.is_deleted)


class CalendarShareAPITests(CalendarTestBase):
    def setUp(self):
        super().setUp()
        self.view_list = CalendarShareListCreateView.as_view()
        self.view_detail = CalendarShareDetailView.as_view()

    def test_share_create_list_and_delete(self):
        # Create share to other_user
        payload = {
            "user_id": self.other_user.id,
            "permission": "view_all",
            "can_invite_others": True,
        }
        req_create = self.factory.post(
            f"/api/v1/calendars/{self.calendar.id}/shares/",
            payload,
            format="json",
        )
        force_authenticate(req_create, user=self.user)
        resp_create = self.view_list(req_create, calendar_id=self.calendar.id)
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)
        share_id = resp_create.data["id"]

        # List shares
        req_list = self.factory.get(f"/api/v1/calendars/{self.calendar.id}/shares/")
        force_authenticate(req_list, user=self.user)
        resp_list = self.view_list(req_list, calendar_id=self.calendar.id)
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_list.data), 1)

        # Retrieve share
        req_get = self.factory.get(
            f"/api/v1/calendars/{self.calendar.id}/shares/{share_id}/"
        )
        force_authenticate(req_get, user=self.user)
        resp_get = self.view_detail(req_get, calendar_id=self.calendar.id, share_id=share_id)
        self.assertEqual(resp_get.status_code, status.HTTP_200_OK)

        # Delete share (soft)
        req_del = self.factory.delete(
            f"/api/v1/calendars/{self.calendar.id}/shares/{share_id}/"
        )
        force_authenticate(req_del, user=self.user)
        resp_del = self.view_detail(req_del, calendar_id=self.calendar.id, share_id=share_id)
        self.assertEqual(resp_del.status_code, status.HTTP_204_NO_CONTENT)
        share = CalendarShare.objects.get(id=share_id)
        self.assertTrue(share.is_deleted)


class CalendarViewsAndFreeBusyTests(CalendarTestBase):
    def setUp(self):
        super().setUp()
        # Create one standard event and one recurring for views/freebusy
        self.event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Planning Meeting",
            start_datetime=datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 15, 11, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
        )
        rule = RecurrenceRule.objects.create(
            organization=self.organization,
            frequency="DAILY",
            interval=1,
        )
        Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Daily Standup",
            start_datetime=datetime(2026, 1, 16, 9, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 16, 10, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
            is_recurring=True,
            recurrence_rule=rule,
        )

    def test_day_week_month_agenda_views(self):
        day_view = DayView.as_view()
        req_day = self.factory.get("/api/v1/views/day/", {"date": "2026-01-15"})
        force_authenticate(req_day, user=self.user)
        resp_day = day_view(req_day)
        self.assertEqual(resp_day.status_code, status.HTTP_200_OK)
        self.assertIn("events", resp_day.data)

        week_view = WeekView.as_view()
        req_week = self.factory.get("/api/v1/views/week/", {"start_date": "2026-01-15"})
        force_authenticate(req_week, user=self.user)
        resp_week = week_view(req_week)
        self.assertEqual(resp_week.status_code, status.HTTP_200_OK)

        month_view = MonthView.as_view()
        req_month = self.factory.get("/api/v1/views/month/", {"year": "2026", "month": "1"})
        force_authenticate(req_month, user=self.user)
        resp_month = month_view(req_month)
        self.assertEqual(resp_month.status_code, status.HTTP_200_OK)

        agenda_view = AgendaView.as_view()
        req_agenda = self.factory.get(
            "/api/v1/views/agenda/",
            {
                "start_date": "2026-01-15T00:00:00Z",
                "end_date": "2026-01-22T00:00:00Z",
                "limit": 10,
            },
        )
        force_authenticate(req_agenda, user=self.user)
        resp_agenda = agenda_view(req_agenda)
        self.assertEqual(resp_agenda.status_code, status.HTTP_200_OK)

    def test_freebusy_and_error_cases(self):
        freebusy_view = FreeBusyView.as_view()
        req_fb = self.factory.post(
            "/api/v1/freebusy/",
            {
                "time_min": "2026-01-15T00:00:00Z",
                "time_max": "2026-01-20T00:00:00Z",
                "calendar_ids": [str(self.calendar.id)],
            },
            format="json",
        )
        force_authenticate(req_fb, user=self.user)
        resp_fb = freebusy_view(req_fb)
        self.assertEqual(resp_fb.status_code, status.HTTP_200_OK)
        self.assertIn(str(self.calendar.id), resp_fb.data["calendars"])

        # Day view missing required param -> 400
        bad_day_req = self.factory.get("/api/v1/views/day/")
        force_authenticate(bad_day_req, user=self.user)
        bad_day_resp = DayView.as_view()(bad_day_req)
        self.assertEqual(bad_day_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(bad_day_resp.data.get("error"), "BAD_REQUEST")

        # Freebusy invalid range -> 400
        bad_fb_req = self.factory.post(
            "/api/v1/freebusy/",
            {
                "time_min": "2026-01-20T00:00:00Z",
                "time_max": "2026-01-15T00:00:00Z",
                "calendar_ids": [str(self.calendar.id)],
            },
            format="json",
        )
        force_authenticate(bad_fb_req, user=self.user)
        bad_fb_resp = freebusy_view(bad_fb_req)
        self.assertEqual(bad_fb_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(bad_fb_resp.data.get("error"), "BAD_REQUEST")

    def test_day_view_with_many_events_is_responsive(self):
        # Create a larger number of events to simulate "realistic" volume
        for i in range(30):
            Event.objects.create(
                organization=self.organization,
                calendar=self.calendar,
                created_by=self.user,
                title=f"Bulk {i}",
                start_datetime=datetime(2026, 1, 15, 8, 0, tzinfo=dt_timezone.utc) + timedelta(minutes=10 * i),
                end_datetime=datetime(2026, 1, 15, 9, 0, tzinfo=dt_timezone.utc) + timedelta(minutes=10 * i),
                timezone="UTC",
            )

        day_view = DayView.as_view()
        req = self.factory.get("/api/v1/views/day/", {"date": "2026-01-15"})
        force_authenticate(req, user=self.user)
        resp = day_view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Should return at least the bulk events we just created
        self.assertGreaterEqual(len(resp.data["events"]), 30)


class ReminderAPITests(CalendarTestBase):
    def test_create_and_list_reminders(self):
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 15, 11, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
        )

        view = EventReminderListCreateView.as_view()

        # Create
        req_create = self.factory.post(
            f"/api/v1/events/{event.id}/reminders/",
            {
                "method": "notification",
                "minutes_before": 30,
            },
            format="json",
        )
        force_authenticate(req_create, user=self.user)
        resp_create = view(req_create, event_id=event.id)
        self.assertEqual(resp_create.status_code, status.HTTP_201_CREATED)

        # List
        req_list = self.factory.get(f"/api/v1/events/{event.id}/reminders/")
        force_authenticate(req_list, user=self.user)
        resp_list = view(req_list, event_id=event.id)
        self.assertEqual(resp_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp_list.data), 1)


class ETagConcurrencyTests(CalendarTestBase):
    def test_etag_if_match_on_event_update(self):
        # Create event
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 15, 11, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
        )
        event.refresh_from_db()

        view = EventViewSet.as_view({"patch": "partial_update"})

        # First update with correct ETag
        req_ok = self.factory.patch(
            f"/api/v1/events/{event.id}/",
            {"description": "Updated via ETag test"},
            format="json",
        )
        req_ok.META["HTTP_IF_MATCH"] = event.etag or ""
        force_authenticate(req_ok, user=self.user)
        resp_ok = view(req_ok, pk=event.id)
        self.assertEqual(resp_ok.status_code, status.HTTP_200_OK)
        new_etag = resp_ok.data.get("etag")
        self.assertIsNotNone(new_etag)

        event.refresh_from_db()
        self.assertEqual(event.etag, new_etag)

        # Second update with stale ETag should fail
        stale = new_etag + "_stale"
        req_fail = self.factory.patch(
            f"/api/v1/events/{event.id}/",
            {"description": "Should fail due to stale etag"},
            format="json",
        )
        req_fail.META["HTTP_IF_MATCH"] = stale
        force_authenticate(req_fail, user=self.user)
        resp_fail = view(req_fail, pk=event.id)
        self.assertEqual(resp_fail.status_code, status.HTTP_412_PRECONDITION_FAILED)
        self.assertEqual(resp_fail.data.get("error"), "PRECONDITION_FAILED")


class TimezoneAndDSTTests(CalendarTestBase):
    def test_non_utc_timezone_event_visible_in_views(self):
        # Event stored as UTC but marked with non-UTC timezone label
        start = datetime(2026, 3, 10, 14, 0, tzinfo=dt_timezone.utc)
        end = start + timedelta(hours=1)
        Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="NYC Meeting",
            start_datetime=start,
            end_datetime=end,
            timezone="America/New_York",
        )

        day_view = DayView.as_view()
        req = self.factory.get("/api/v1/views/day/", {"date": "2026-03-10"})
        force_authenticate(req, user=self.user)
        resp = day_view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [e["title"] for e in resp.data["events"]]
        self.assertIn("NYC Meeting", titles)

    def test_event_across_dst_boundary_is_returned(self):
        # US DST starts 2026-03-08; we create an event that spans that day
        start = datetime(2026, 3, 8, 6, 0, tzinfo=dt_timezone.utc)
        end = start + timedelta(hours=4)
        Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="DST Crossing",
            start_datetime=start,
            end_datetime=end,
            timezone="America/New_York",
        )

        agenda_view = AgendaView.as_view()
        req = self.factory.get(
            "/api/v1/views/agenda/",
            {
                "start_date": "2026-03-08T00:00:00Z",
                "end_date": "2026-03-09T00:00:00Z",
            },
        )
        force_authenticate(req, user=self.user)
        resp = agenda_view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        titles = [e["title"] for e in resp.data["events"]]
        self.assertIn("DST Crossing", titles)


class AuxiliaryModelsTests(CalendarTestBase):
    def test_event_category_validation_and_unique_constraint(self):
        # Valid category
        cat = EventCategory.objects.create(
            organization=self.organization,
            user=self.user,
            name="Important",
            color="#FF0000",
        )
        self.assertIn("Important", str(cat))

        # Org mismatch with user should fail
        other_org = Organization.objects.create(name="OtherOrg", slug="other-org")
        bad_cat = EventCategory(
            organization=other_org,
            user=self.user,
            name="Mismatch",
        )
        with self.assertRaises(ValidationError):
            bad_cat.full_clean()

        # Unique per organization+user+name (soft delete aware)
        with self.assertRaises(ValidationError):
            EventCategory.objects.create(
                organization=self.organization,
                user=self.user,
                name="Important",
            )

        # Soft delete first one then recreate
        cat.is_deleted = True
        cat.save()
        cat2 = EventCategory.objects.create(
            organization=self.organization,
            user=self.user,
            name="Important",
        )
        self.assertTrue(EventCategory.objects.filter(id=cat2.id).exists())

    def test_event_category_assignment_validation(self):
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Categorized event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        category = EventCategory.objects.create(
            organization=self.organization,
            user=self.user,
            name="Category",
        )

        # Valid assignment
        assignment = EventCategoryAssignment.objects.create(
            organization=self.organization,
            event=event,
            category=category,
        )
        self.assertIn("->", str(assignment))

        # Org mismatch with event should fail
        other_org = Organization.objects.create(name="OtherOrg2", slug="other-org2")
        bad_assignment = EventCategoryAssignment(
            organization=other_org,
            event=event,
            category=category,
        )
        with self.assertRaises(ValidationError):
            bad_assignment.full_clean()

    def test_calendar_settings_validation_and_unique_per_user(self):
        # Valid settings
        settings_obj = CalendarSettings.objects.create(
            organization=self.organization,
            user=self.user,
            default_view="week",
            week_start=1,
            time_format="24h",
            timezone="UTC",
        )
        self.assertIn(self.user.email, str(settings_obj))

        # Org mismatch with user should fail
        other_org = Organization.objects.create(name="OtherOrg3", slug="other-org3")
        bad_settings = CalendarSettings(
            organization=other_org,
            user=self.user,
        )
        with self.assertRaises(ValidationError):
            bad_settings.full_clean()

        # Unique per organization+user
        with self.assertRaises(ValidationError):
            CalendarSettings.objects.create(
                organization=self.organization,
                user=self.user,
            )

    def test_notification_validation_and_mark_as_read(self):
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Notif Event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        notif = Notification.objects.create(
            organization=self.organization,
            user=self.user,
            notification_type="event_reminder",
            title="Reminder",
            message="Event is starting soon",
            event=event,
            calendar=self.calendar,
        )
        # __str__ uses notification_type display + user email
        self.assertIn("Event reminder", str(notif))

        # Org mismatch with user should fail
        other_org = Organization.objects.create(name="OtherOrg4", slug="other-org4")
        bad_notif = Notification(
            organization=other_org,
            user=self.user,
            notification_type="event_updated",
            title="Bad",
            message="Bad org",
        )
        with self.assertRaises(ValidationError):
            bad_notif.full_clean()

        # mark_as_read should set flags and timestamp
        self.assertFalse(notif.is_read)
        self.assertIsNone(notif.read_at)
        notif.mark_as_read()
        notif.refresh_from_db()
        self.assertTrue(notif.is_read)
        self.assertIsNotNone(notif.read_at)


class EventSearchTests(CalendarTestBase):
    def test_search_by_query_and_calendar_filter(self):
        # Create events
        Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Planning Meeting",
            description="Weekly planning",
            start_datetime=datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 15, 11, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
        )
        Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Other Event",
            description="Something else",
            start_datetime=datetime(2026, 1, 16, 10, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 16, 11, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
        )

        view = EventSearchView.as_view()
        req = self.factory.get(
            "/api/v1/events/search/",
            {"q": "Planning", "calendar_ids": str(self.calendar.id)},
        )
        force_authenticate(req, user=self.user)
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)

    def test_search_short_query_returns_empty(self):
        Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="X",
            description="Too short query",
            start_datetime=datetime(2026, 1, 15, 10, 0, tzinfo=dt_timezone.utc),
            end_datetime=datetime(2026, 1, 15, 11, 0, tzinfo=dt_timezone.utc),
            timezone="UTC",
        )
        view = EventSearchView.as_view()
        req = self.factory.get("/api/v1/events/search/", {"q": "X"})
        force_authenticate(req, user=self.user)
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 0)


class ExceptionsAndPermissionsTests(CalendarTestBase):
    def test_calendar_error_response_basic_shape(self):
        response = calendar_error_response(
            error="TEST_ERROR",
            message="Something went wrong",
            status_code=418,
            details=[{"field": "x", "reason": "constraint_violation", "message": "bad", "metadata": {}}],
        )
        self.assertEqual(response.status_code, 418)
        data = response.data
        self.assertEqual(data["error"], "TEST_ERROR")
        self.assertEqual(data["message"], "Something went wrong")
        self.assertIn("request_id", data)
        self.assertIn("timestamp", data)
        self.assertIn("details", data)

    def test_build_details_from_errors_dict_and_list(self):
        # Dict form
        errors_dict = {"field": ["msg1", "msg2"]}
        details = _build_details_from_errors(errors_dict)
        self.assertEqual(len(details), 2)
        self.assertEqual(details[0]["field"], "field")
        self.assertEqual(details[0]["message"], "msg1")

        # List form
        errors_list = ["err1", "err2"]
        details = _build_details_from_errors(errors_list)
        self.assertEqual(len(details), 2)
        # For list form, field should be empty string
        self.assertEqual(details[0]["field"], "")

    def test_calendar_exception_handler_for_calendars_view(self):
        # Simulate a DRF view error response for a calendars.* view
        from rest_framework.exceptions import ValidationError as DRFValidationError
        from rest_framework.views import APIView
        from rest_framework.response import Response

        class DummyCalendarView(APIView):
            def get(self, request):
                raise DRFValidationError({"field": ["bad"]})

        view = DummyCalendarView()
        request = self.factory.get("/api/v1/calendars/")
        force_authenticate(request, user=self.user)

        # Let DRF build the original response
        try:
            view.get(request)
        except DRFValidationError as exc:
            context = {"view": view, "request": request}
            response = calendar_exception_handler(exc, context)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        data = response.data
        self.assertEqual(data["error"], "VALIDATION_ERROR")
        self.assertIn("details", data)

    def test_is_authenticated_in_organization_permission(self):
        perm = IsAuthenticatedInOrganization()
        request = self.factory.get("/api/v1/calendars/")
        # Unauthenticated (AnonymousUser)
        request.user = auth_models.AnonymousUser()
        self.assertFalse(perm.has_permission(request, view=None))

        # Authenticated but no organization
        user = User.objects.create_user(
            email="noorg@example.com",
            password="test1234",
            username="noorg",
        )
        request.user = user
        self.assertFalse(perm.has_permission(request, view=None))

        # With organization
        user.organization = self.organization
        user.save()
        request.user = user
        self.assertTrue(perm.has_permission(request, view=None))

    def test_calendar_access_permission_owner_and_share(self):
        perm = CalendarAccessPermission()
        request = self.factory.get("/api/v1/calendars/")

        # Owner should always have access
        request.user = self.user
        owner_has = perm.has_object_permission(request, view=type("V", (), {"required_permission": "manage"})(), obj=self.calendar)
        self.assertTrue(owner_has)

        # Shared user with limited permission
        share = CalendarShare.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            shared_with=self.other_user,
            permission="view_all",
        )
        request.user = self.other_user
        # view_all requires view_all -> True
        view_all = perm.has_object_permission(
            request,
            view=type("V", (), {"required_permission": "view_all"})(),
            obj=self.calendar,
        )
        self.assertTrue(view_all)
        # edit requires higher level -> False
        edit_perm = perm.has_object_permission(
            request,
            view=type("V", (), {"required_permission": "edit"})(),
            obj=self.calendar,
        )
        self.assertFalse(edit_perm)

    def test_event_access_permission(self):
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Meeting",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        perm = EventAccessPermission()
        request = self.factory.get("/api/v1/events/")
        request.user = self.user
        has_perm = perm.has_object_permission(
            request,
            view=type("V", (), {"required_permission": "view_all"})(),
            obj=event,
        )
        self.assertTrue(has_perm)

    def test_subscription_owner_permission(self):
        sub = CalendarSubscription.objects.create(
            organization=self.organization,
            user=self.user,
            calendar=self.calendar,
        )
        perm = SubscriptionOwnerPermission()

        request = self.factory.get("/api/v1/subscriptions/")
        request.user = self.user
        self.assertTrue(perm.has_object_permission(request, view=None, obj=sub))

        request.user = self.other_user
        self.assertFalse(perm.has_object_permission(request, view=None, obj=sub))

    def test_unauthenticated_access_is_blocked(self):
        # Calendar list
        cal_view = CalendarViewSet.as_view({"get": "list"})
        req_cal = self.factory.get("/api/v1/calendars/")
        # Do NOT authenticate -> should be rejected by IsAuthenticatedInOrganization
        resp_cal = cal_view(req_cal)
        self.assertIn(resp_cal.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

        # Event list
        evt_view = EventViewSet.as_view({"get": "list"})
        req_evt = self.factory.get("/api/v1/events/")
        resp_evt = evt_view(req_evt)
        self.assertIn(resp_evt.status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_event_access_denied_for_non_shared_user(self):
        # Event owned by self.user
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Private Event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        view = EventViewSet.as_view({"get": "retrieve"})
        req = self.factory.get(f"/api/v1/events/{event.id}/")
        force_authenticate(req, user=self.other_user)  # no share, not owner
        resp = view(req, pk=event.id)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        # Wrapped by calendar_exception_handler -> unified error
        self.assertEqual(resp.data.get("error"), "PERMISSION_DENIED")

    def test_attendee_access_denied_for_non_shared_user(self):
        # Event owned by self.user with no shares
        event = Event.objects.create(
            organization=self.organization,
            calendar=self.calendar,
            created_by=self.user,
            title="Private Event",
            start_datetime=timezone.now(),
            end_datetime=timezone.now() + timedelta(hours=1),
            timezone="UTC",
        )
        view = EventAttendeeListCreateView.as_view()
        req = self.factory.get(f"/api/v1/events/{event.id}/attendees/")
        force_authenticate(req, user=self.other_user)
        resp = view(req, event_id=event.id)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


class SignalTests(TestCase):
    """
    Tests specifically for signal handlers to ensure they work correctly.
    These tests verify that automatic calendar creation happens as expected.
    """
    
    def test_calendar_created_automatically_for_new_user(self):
        """Test that creating a user automatically creates a primary calendar."""
        org = Organization.objects.create(name="Test Org", slug="test-org")
        user = User.objects.create_user(
            email="newuser@example.com",
            password="testpass",
            username="newuser",
            organization=org,
        )
        
        # Verify calendar was auto-created
        calendars = Calendar.objects.filter(
            organization=org,
            owner=user,
            is_deleted=False,
        )
        self.assertEqual(calendars.count(), 1)
        
        calendar = calendars.first()
        self.assertEqual(calendar.name, "My Calendar")
        self.assertTrue(calendar.is_primary)
        self.assertEqual(calendar.timezone, "UTC")
        self.assertEqual(calendar.visibility, "private")
    
    def test_no_calendar_created_if_user_has_no_organization(self):
        """Test that no calendar is created if user has no organization."""
        user = User.objects.create_user(
            email="noorg@example.com",
            password="testpass",
            username="noorg",
            organization=None,
        )
        
        # No calendar should be created
        calendars = Calendar.objects.filter(owner=user)
        self.assertEqual(calendars.count(), 0)
    
    def test_no_duplicate_calendar_on_user_update(self):
        """Test that updating a user doesn't create another calendar."""
        org = Organization.objects.create(name="Test Org", slug="test-org")
        user = User.objects.create_user(
            email="updateuser@example.com",
            password="testpass",
            username="updateuser",
            organization=org,
        )
        
        initial_count = Calendar.objects.filter(owner=user).count()
        self.assertEqual(initial_count, 1)
        
        # Update user
        user.email = "updated@example.com"
        user.save()
        
        # Should still have only one calendar
        final_count = Calendar.objects.filter(owner=user).count()
        self.assertEqual(final_count, 1)
    
    def test_no_duplicate_primary_calendar_created(self):
        """Test that signal doesn't create calendar if primary already exists."""
        org = Organization.objects.create(name="Test Org", slug="test-org")
        
        # Create user (signal creates primary calendar)
        user = User.objects.create_user(
            email="user1@example.com",
            password="testpass",
            username="user1",
            organization=org,
        )
        
        initial_primary = Calendar.objects.get(
            organization=org,
            owner=user,
            is_primary=True,
        )
        
        # Manually try to trigger signal logic again
        # (this simulates edge cases or race conditions)
        from calendars.signals import create_default_calendar
        create_default_calendar(User, user, created=True)
        
        # Should still have only one primary calendar
        primary_calendars = Calendar.objects.filter(
            organization=org,
            owner=user,
            is_primary=True,
            is_deleted=False,
        )
        self.assertEqual(primary_calendars.count(), 1)
        self.assertEqual(primary_calendars.first().id, initial_primary.id)
