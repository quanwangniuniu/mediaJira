import { useEffect, useState } from "react";
import { derivedEventToEventDTO } from "@/lib/api/calendarApi";
import {
  CalendarAPI,
  CalendarDTO,
  CalendarViewResponse,
  CalendarViewType,
  EventDTO,
} from "@/lib/api/calendarApi";
import { addDays, startOfDay, startOfWeek } from "date-fns";

interface UseCalendarViewOptions {
  viewType: CalendarViewType;
  currentDate: Date;
  calendarIds?: string[];
  activeEventTypes?: string[];
}

interface UseCalendarViewResult {
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Cache stores all merged events (regular + derived) keyed by view/date/calendar
const cache = new Map<string, { events: EventDTO[]; calendars: CalendarDTO[] }>();

// Build cache key from view type, date, and calendar IDs only.
// activeEventTypes is intentionally excluded so toggling filters
// does not trigger a new network request.
function buildCacheKey(opts: UseCalendarViewOptions): string {
  const { viewType, currentDate, calendarIds } = opts;
  const baseDate = startOfDay(currentDate).toISOString();
  const ids = (calendarIds || []).slice().sort().join(",");
  return `${viewType}:${baseDate}:${ids}`;
}

export function useCalendarView(
  options: UseCalendarViewOptions,
): UseCalendarViewResult {
  // allEvents holds all unfiltered events (regular + derived)
  // Filtering by activeEventTypes is applied at return time, not stored here
  const [allEvents, setAllEvents] = useState<EventDTO[]>([]);
  const [calendars, setCalendars] = useState<CalendarDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { viewType, currentDate, calendarIds } = options;

  const key = buildCacheKey(options);

  const load = () => {
    setIsLoading(true);
    setError(null);

    // Return cached data immediately if available
    const existing = cache.get(key);
    if (existing) {
      setAllEvents(existing.events);
      setCalendars(existing.calendars);
      setIsLoading(false);
      return;
    }

    let request;
    if (viewType === "day") {
      const start = startOfDay(currentDate);
      const end = addDays(start, 1);
      request = CalendarAPI.getAgendaView({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        calendar_ids: calendarIds,
      });
    } else if (viewType === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 7);
      request = CalendarAPI.getAgendaView({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        calendar_ids: calendarIds,
      });
    } else if (viewType === "month") {
      request = CalendarAPI.getMonthView({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        calendar_ids: calendarIds,
      });
    } else {
      // agenda & year views reuse the agenda endpoint
      const start = startOfDay(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + (viewType === "agenda" ? 7 : 365));
      request = CalendarAPI.getAgendaView({
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        calendar_ids: calendarIds,
      });
    }

    request
      .then(async (response) => {
        // Fetch system-derived events (auto-generated from Tasks and Decisions)
        let derivedEvents: EventDTO[] = [];
        try {
          let start: string;
          let end: string;
          if (viewType === "day") {
            start = startOfDay(currentDate).toISOString();
            end = addDays(startOfDay(currentDate), 1).toISOString();
          } else if (viewType === "week") {
            const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
            start = weekStart.toISOString();
            end = addDays(weekStart, 7).toISOString();
          } else if (viewType === "month") {
            start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
            end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1).toISOString();
          } else {
            start = startOfDay(currentDate).toISOString();
            end = addDays(startOfDay(currentDate), 7).toISOString();
          }

          const derivedResponse = await CalendarAPI.getDerivedEvents({ start, end });
          derivedEvents = derivedResponse.data.results.map(derivedEventToEventDTO);
        } catch {
          // Derived event fetch failure should not block the main calendar display
          console.warn("Failed to load derived calendar events");
        }

        // Merge regular and derived events, store in cache without filtering.
        // Filtering is applied at return time so toggling filters is instant.
        const merged = [...response.data.events, ...derivedEvents];
        cache.set(key, { events: merged, calendars: response.data.calendars });
        setAllEvents(merged);
        setCalendars(response.data.calendars);
      })
      .catch((err: any) => {
        setError(
          err instanceof Error ? err : new Error("Failed to load calendar view"),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refetch = () => {
    cache.delete(key);
    load();
  };

  // Filter events by activeEventTypes at return time (pure client-side, no network request).
  // Regular events (non-derived) are always shown regardless of filter state.
  // Derived events are shown only if their event_type is in activeEventTypes.
  const activeEventTypes = options.activeEventTypes;
  const filteredEvents = allEvents.filter((e) => {
    try {
      const meta = JSON.parse(e.description || "{}");
      if (meta.isDerived) {
        if (!activeEventTypes || activeEventTypes.length === 0) return false;
        return activeEventTypes.includes(meta.event_type);
      }
    } catch {}
    // Non-derived events are always visible
    return true;
  });

  return { events: filteredEvents, calendars, isLoading, error, refetch };
}