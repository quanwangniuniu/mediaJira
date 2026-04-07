import api from "../api";

export type CalendarViewType = "day" | "week" | "month" | "year" | "agenda";

export interface UserSummaryDTO {
  id: number;
  email: string;
  username: string;
  full_name: string;
}

export interface CalendarDTO {
  id: string;
  organization_id: string;
  project_id?: number | null;
  owner: UserSummaryDTO;
  name: string;
  description?: string | null;
  color: string;
  visibility: string;
  timezone: string;
  is_primary: boolean;
  location?: string | null;
}

export interface EventDTO {
  id: string;
  calendar_id?: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  timezone?: string;
  is_all_day: boolean;
  is_recurring: boolean;
  color?: string;
  etag?: string;
}

export interface CalendarViewResponse {
  view_type: CalendarViewType;
  start_date: string;
  end_date: string;
  events: EventDTO[];
  calendars: CalendarDTO[];
}

export interface CalendarSubscriptionDTO {
  id: string;
  calendar: CalendarDTO | null;
  source_url: string | null;
  color_override: string | null;
  is_hidden: boolean;
}

export interface CreateCalendarPayload {
  name: string;
  color?: string;
  visibility?: string;
  timezone?: string;
  is_primary?: boolean;
  description?: string;
}

export const CalendarAPI = {
  listCalendars: () => api.get<CalendarDTO[]>("/api/v1/calendars/"),

  createCalendar: (payload: CreateCalendarPayload) =>
    api.post<CalendarDTO>("/api/v1/calendars/", payload),

  listSubscriptions: () =>
    api.get<CalendarSubscriptionDTO[]>("/api/v1/subscriptions/"),

  updateSubscription: (
    subscriptionId: string,
    data: Partial<Pick<CalendarSubscriptionDTO, "color_override" | "is_hidden">>,
  ) =>
    api.patch<CalendarSubscriptionDTO>(
      `/api/v1/subscriptions/${subscriptionId}/`,
      data,
    ),

  getDayView: (params: { date: string; calendar_ids?: string[] }) =>
    api.get<CalendarViewResponse>("/api/v1/views/day/", {
      params: {
        date: params.date,
        calendar_ids: params.calendar_ids?.join(","),
      },
    }),

  getWeekView: (params: { start_date: string; calendar_ids?: string[] }) =>
    api.get<CalendarViewResponse>("/api/v1/views/week/", {
      params: {
        start_date: params.start_date,
        calendar_ids: params.calendar_ids?.join(","),
      },
    }),

  getMonthView: (params: {
    year: number;
    month: number;
    calendar_ids?: string[];
  }) =>
    api.get<CalendarViewResponse>("/api/v1/views/month/", {
      params: {
        year: params.year,
        month: params.month,
        calendar_ids: params.calendar_ids?.join(","),
      },
    }),

  getAgendaView: (params: {
    start_date: string;
    end_date?: string;
    calendar_ids?: string[];
  }) =>
    api.get<CalendarViewResponse>("/api/v1/views/agenda/", {
      params: {
        start_date: params.start_date,
        end_date: params.end_date,
        calendar_ids: params.calendar_ids?.join(","),
      },
    }),

  createEvent: (payload: Partial<EventDTO>) =>
    api.post<EventDTO>("/api/v1/events/", payload),

  // For now we do not send If-Match headers to avoid 412 conflicts
  // when the same user updates an event multiple times quickly.
  updateEvent: (eventId: string, payload: Partial<EventDTO>, _etag?: string) =>
    api.patch<EventDTO>(`/api/v1/events/${eventId}/`, payload),

  deleteEvent: (eventId: string, _etag?: string) =>
    api.delete<void>(`/api/v1/events/${eventId}/`),

  // Fetch system-derived calendar events (from Decisions and Tasks, read-only)
  getDerivedEvents: (params: { start: string; end: string }) =>
    api.get<{ count: number; results: DerivedCalendarEventDTO[] }>("/api/v1/derived-events/", {
      params: {
        start: params.start,
        end: params.end,
      },
    }),
};

// Derived CalendarEvent from Decision/Task (read-only, system-generated)
export interface DerivedCalendarEventDTO {
  id: number;
  event_type: "decision" | "task" | "decision_review";
  title: string;
  start_time: string;
  end_time: string | null;
  decision_id: number | null;
  task_id: number | null;
  review_id: number | null;
  project_id: number | null;  // For permission header on navigation
}

// Convert a DerivedCalendarEvent to EventDTO format for display in calendar
export function derivedEventToEventDTO(event: DerivedCalendarEventDTO): EventDTO {
  return {
    id: `derived-${event.id}`,  // Prefix to prevent ID conflicts with regular events
    title: event.title,
    start_datetime: event.start_time,
    end_datetime: event.end_time ?? event.start_time,
    is_all_day: false,
    is_recurring: false,
    color: eventTypeToColor(event.event_type),
    // Store source entity metadata in description for click navigation
    description: JSON.stringify({
      isDerived: true,
      event_type: event.event_type,
      decision_id: event.decision_id,
      task_id: event.task_id,
      review_id: event.review_id,
      project_id: event.project_id,  // Used to build correct navigation URL with permission
    }),
  };
}

// Map event type to display color
function eventTypeToColor(eventType: string): string {
  switch (eventType) {
    case "decision": return "#8B5CF6";        // Purple - Decision
    case "decision_review": return "#F59E0B"; // Orange - Review
    case "task": return "#10B981";            // Green - Task
    default: return "#6B7280";
  }
}