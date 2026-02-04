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

export const CalendarAPI = {
  listCalendars: () => api.get<CalendarDTO[]>("/api/v1/calendars/"),

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

  // Raw view endpoints – higher level hooks will choose which one to call.
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
};
