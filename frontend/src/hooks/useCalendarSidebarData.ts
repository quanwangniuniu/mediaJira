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

export function useCalendarSidebarData(): UseCalendarSidebarResult {
  const [calendars, setCalendars] = useState<CalendarDTO[]>([]);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscriptionDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const { user } = useAuthStore();
  const currentUserId = user?.id;

  useEffect(() => {
    if (sidebarCache.calendars && sidebarCache.subscriptions) {
      setCalendars(sidebarCache.calendars);
      setSubscriptions(sidebarCache.subscriptions);
      return;
    }

    setIsLoading(true);
    setError(null);

    Promise.all([CalendarAPI.listCalendars(), CalendarAPI.listSubscriptions()])
      .then(([calRes, subRes]) => {
        sidebarCache.calendars = calRes.data;
        sidebarCache.subscriptions = subRes.data;
        setCalendars(calRes.data);
        setSubscriptions(subRes.data);
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

  const myCalendars = items.filter((item) => item.isMine);
  const otherCalendars = items.filter((item) => !item.isMine);

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

