import { useEffect, useState } from "react";
import {
  CalendarAPI,
  CalendarDTO,
  CalendarViewResponse,
  CalendarViewType,
  EventDTO,
} from "@/lib/api/calendarApi";
import { format, startOfDay, startOfWeek } from "date-fns";

interface UseCalendarViewOptions {
  viewType: CalendarViewType;
  currentDate: Date;
  calendarIds?: string[];
}

interface UseCalendarViewResult {
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const cache = new Map<string, CalendarViewResponse>();

function buildCacheKey(opts: UseCalendarViewOptions): string {
  const { viewType, currentDate, calendarIds } = opts;
  const baseDate = startOfDay(currentDate).toISOString();
  const ids = (calendarIds || []).slice().sort().join(",");
  return `${viewType}:${baseDate}:${ids}`;
}

export function useCalendarView(
  options: UseCalendarViewOptions,
): UseCalendarViewResult {
  const [events, setEvents] = useState<EventDTO[]>([]);
  const [calendars, setCalendars] = useState<CalendarDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { viewType, currentDate, calendarIds } = options;

  const key = buildCacheKey(options);

  const load = () => {
    setIsLoading(true);
    setError(null);

    const existing = cache.get(key);
    if (existing) {
      setEvents(existing.events);
      setCalendars(existing.calendars);
      setIsLoading(false);
      return;
    }

    let request;
    if (viewType === "day") {
      request = CalendarAPI.getDayView({
        date: format(startOfDay(currentDate), "yyyy-MM-dd"),
        calendar_ids: calendarIds,
      });
    } else if (viewType === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      request = CalendarAPI.getWeekView({
        start_date: format(start, "yyyy-MM-dd"),
        calendar_ids: calendarIds,
      });
    } else if (viewType === "month") {
      request = CalendarAPI.getMonthView({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        calendar_ids: calendarIds,
      });
    } else {
      // agenda & year reuse agenda endpoint for now.
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
      .then((response) => {
        cache.set(key, response.data);
        setEvents(response.data.events);
        setCalendars(response.data.calendars);
      })
      .catch((err: any) => {
        setError(err instanceof Error ? err : new Error("Failed to load calendar view"));
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

  return { events, calendars, isLoading, error, refetch };
}
