import { useEffect, useMemo, useState } from "react";
import {
  CalendarAPI,
  CalendarDTO,
  CalendarSubscriptionDTO,
} from "@/lib/api/calendarApi";
import { useAuthStore } from "@/lib/authStore";

export interface SidebarCalendarItem {
  calendarId: string;
  subscriptionId: string | null;
  name: string;
  color: string;
  isHidden: boolean;
  isMine: boolean;
}

interface UseCalendarSidebarResult {
  myCalendars: SidebarCalendarItem[];
  otherCalendars: SidebarCalendarItem[];
  isLoading: boolean;
  error: Error | null;
  toggleVisibility: (item: SidebarCalendarItem) => Promise<void>;
}

const sidebarCache: {
  calendars?: CalendarDTO[];
  subscriptions?: CalendarSubscriptionDTO[];
} = {};

function normalizeListResponse<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { results?: unknown[] }).results)
  ) {
    return (payload as { results: T[] }).results;
  }
  return [];
}

export function useCalendarSidebarData(): UseCalendarSidebarResult {
  const [calendars, setCalendars] = useState<CalendarDTO[]>([]);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscriptionDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { user } = useAuthStore();
  const currentUserId = user?.id;

  useEffect(() => {
    if (
      Array.isArray(sidebarCache.calendars) &&
      Array.isArray(sidebarCache.subscriptions)
    ) {
      setCalendars(sidebarCache.calendars);
      setSubscriptions(sidebarCache.subscriptions);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([CalendarAPI.listCalendars(), CalendarAPI.listSubscriptions()])
      .then(([calRes, subRes]) => {
        const normalizedCalendars = normalizeListResponse<CalendarDTO>(calRes.data);
        const normalizedSubscriptions = normalizeListResponse<CalendarSubscriptionDTO>(
          subRes.data,
        );
        sidebarCache.calendars = normalizedCalendars;
        sidebarCache.subscriptions = normalizedSubscriptions;
        setCalendars(normalizedCalendars);
        setSubscriptions(normalizedSubscriptions);
      })
      .catch((err: any) => {
        setError(
          err instanceof Error ? err : new Error("Failed to load calendar sidebar data"),
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const items = useMemo<SidebarCalendarItem[]>(() => {
    if (!calendars.length && !subscriptions.length) {
      return [];
    }

    const byCalendarId = new Map<string, CalendarSubscriptionDTO>();
    subscriptions.forEach((sub) => {
      if (sub.calendar) {
        byCalendarId.set(sub.calendar.id, sub);
      }
    });

    return calendars.map((cal) => {
      const sub = byCalendarId.get(cal.id);
      const effectiveColor = sub?.color_override || cal.color;
      const isHidden = sub?.is_hidden ?? false;
      const subscriptionId = sub ? sub.id : null;
      const isMine =
        typeof currentUserId === "number"
          ? cal.owner?.id === currentUserId
          : false;

      return {
        calendarId: cal.id,
        subscriptionId,
        name: cal.name,
        color: effectiveColor,
        isHidden,
        isMine,
      };
    });
  }, [calendars, subscriptions, currentUserId]);

  const myCalendars = useMemo(
    () => items.filter((item) => item.isMine),
    [items],
  );
  const otherCalendars = useMemo(
    () => items.filter((item) => !item.isMine),
    [items],
  );

  const toggleVisibility = async (item: SidebarCalendarItem) => {
    if (!item.subscriptionId) {
      return;
    }

    const nextHidden = !item.isHidden;
    const previousSubscriptions = [...subscriptions];

    setSubscriptions((current) =>
      current.map((sub) =>
        sub.id === item.subscriptionId
          ? { ...sub, is_hidden: nextHidden }
          : sub,
      ),
    );

    try {
      await CalendarAPI.updateSubscription(item.subscriptionId, {
        is_hidden: nextHidden,
      });
    } catch (err) {
      setSubscriptions(previousSubscriptions);
      throw err;
    }
  };

  return {
    myCalendars,
    otherCalendars,
    isLoading,
    error,
    toggleVisibility,
  };
}
