"use client";

import React, { useMemo, useState } from "react";
import { addDays, format, startOfDay, startOfWeek } from "date-fns";
import Layout from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useCalendarSidebarData } from "@/hooks/useCalendarSidebarData";
import { useCalendarView } from "@/hooks/useCalendarView";
import { CalendarDTO, EventDTO } from "@/lib/api/calendarApi";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

type CalendarViewType = "day" | "week" | "month" | "year" | "agenda";

const VIEW_LABELS: Record<CalendarViewType, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  agenda: "Agenda",
};

function CalendarPageContent() {
  const [currentView, setCurrentView] = useState<CalendarViewType>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[] | undefined>(undefined);

  const { events, calendars, isLoading, error } = useCalendarView({
    viewType: currentView,
    currentDate,
    calendarIds: visibleCalendarIds,
  });

  const headerTitle = useMemo(() => {
    if (currentView === "year") {
      return format(currentDate, "yyyy");
    }
    if (currentView === "month" || currentView === "agenda") {
      return format(currentDate, "MMMM yyyy");
    }
    if (currentView === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const sameYear = start.getFullYear() === end.getFullYear();

      if (sameMonth && sameYear) {
        return `${format(start, "MMMM d")} - ${format(end, "d, yyyy")}`;
      }

      if (sameYear) {
        return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      }

      return `${format(start, "MMM d, yyyy")} - ${format(
        end,
        "MMM d, yyyy",
      )}`;
    }

    // day view
    return format(currentDate, "EEEE, MMMM d, yyyy");
  }, [currentView, currentDate]);

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleOffset = (direction: "prev" | "next") => {
    const multiplier = direction === "next" ? 1 : -1;

    if (currentView === "day") {
      setCurrentDate((prev) => addDays(prev, 1 * multiplier));
    } else if (currentView === "week") {
      setCurrentDate((prev) => addDays(prev, 7 * multiplier));
    } else if (currentView === "month") {
      const next = new Date(currentDate);
      next.setMonth(next.getMonth() + 1 * multiplier);
      setCurrentDate(next);
    } else if (currentView === "year") {
      const next = new Date(currentDate);
      next.setFullYear(next.getFullYear() + 1 * multiplier);
      setCurrentDate(next);
    } else {
      // agenda: step one week by default
      setCurrentDate((prev) => addDays(prev, 7 * multiplier));
    }
  };

  return (
    <Layout showHeader={false} showSidebar={false}>
      <div className="flex min-h-screen flex-col bg-gray-50">
        {/* Top toolbar */}
        <header className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex items-center rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              Today
            </button>
            <div className="flex items-center rounded-full border border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => handleOffset("prev")}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleOffset("next")}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">
                {headerTitle}
              </span>
              {currentView === "week" && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Week view
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View switcher */}
            <nav
              aria-label="Calendar view"
              className="inline-flex rounded-full border border-gray-200 bg-white p-0.5 text-xs"
            >
              {(Object.keys(VIEW_LABELS) as CalendarViewType[]).map((view) => {
                const isActive = currentView === view;
                return (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setCurrentView(view)}
                    className={`rounded-full px-3 py-1 font-medium ${
                      isActive
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {VIEW_LABELS[view]}
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Main content: sidebar + view */}
        <div className="flex flex-1 overflow-hidden">
          <CalendarSidebar
            calendars={calendars}
            onVisibleCalendarsChange={setVisibleCalendarIds}
          />

          <section className="flex-1 overflow-auto bg-gray-50 p-4">
            {currentView === "week" ? (
              <WeekView
                currentDate={currentDate}
                events={events}
                calendars={calendars}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
                <List className="h-6 w-6" />
                <p className="text-sm">
                  {VIEW_LABELS[currentView]} view layout will be implemented in
                  later steps.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
}

function WeekView({
  currentDate,
  events,
  calendars,
  isLoading,
  error,
}: {
  currentDate: Date;
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
}) {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(start, index)),
    [start],
  );

  const hours = useMemo(() => Array.from({ length: 13 }, (_, index) => 8 + index), []);

  const calendarColorById = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((cal) => {
      map.set(cal.id, cal.color);
    });
    return map;
  }, [calendars]);

  return (
    <div className="flex h-full flex-col rounded-xl border bg-white shadow-sm">
      <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b bg-gray-50 text-xs font-medium text-gray-500">
        <div className="border-r px-2 py-2" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex flex-col items-center border-r px-2 py-2 last:border-r-0"
          >
            <span>{format(day, "EEE")}</span>
            <span className="mt-1 rounded-full px-1.5 py-0.5 text-sm font-semibold text-gray-800">
              {format(day, "d")}
            </span>
          </div>
        ))}
      </div>

      <div className="grid flex-1 grid-cols-[60px_repeat(7,minmax(0,1fr))] overflow-auto text-xs">
        <div className="border-r bg-gray-50">
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-12 border-b border-gray-100 px-2 py-1 text-right text-[11px] text-gray-400"
            >
              {format(new Date().setHours(hour, 0, 0, 0), "ha")}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);
          const dayEvents = events.filter((event) => {
            const evStart = new Date(event.start_datetime);
            const evEnd = new Date(event.end_datetime);
            return evEnd > dayStart && evStart < dayEnd;
          });

          return (
            <div
              key={day.toISOString()}
              className="relative border-r last:border-r-0"
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="h-12 border-b border-gray-100 bg-white hover:bg-blue-50"
                />
              ))}

              {dayEvents.map((event) => {
                const evStart = new Date(event.start_datetime);
                const evEnd = new Date(event.end_datetime);

                const clampedStart = evStart < dayStart ? dayStart : evStart;
                const clampedEnd = evEnd > dayEnd ? dayEnd : evEnd;

                const totalMinutes = 24 * 60;
                const startMinutes =
                  (clampedStart.getTime() - dayStart.getTime()) / 60000;
                const durationMinutes =
                  (clampedEnd.getTime() - clampedStart.getTime()) / 60000 || 30;

                const topPercent = (startMinutes / totalMinutes) * 100;
                const heightPercent = (durationMinutes / totalMinutes) * 100;

                const backgroundColor =
                  event.color ||
                  calendarColorById.get(event.calendar_id || "") ||
                  "#1E88E5";

                return (
                  <div
                    key={event.id + event.start_datetime}
                    className="absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[11px] text-white shadow-sm"
                    style={{
                      top: `${topPercent}%`,
                      height: `${heightPercent}%`,
                      backgroundColor,
                    }}
                  >
                    <div className="truncate font-semibold">{event.title}</div>
                    <div className="truncate opacity-90">
                      {format(evStart, "HH:mm")} - {format(evEnd, "HH:mm")}
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="pointer-events-none absolute inset-0 bg-white/40" />
              )}
              {error && (
                <div className="pointer-events-none absolute inset-x-2 top-2 rounded bg-red-50 px-2 py-1 text-[10px] text-red-600">
                  Failed to load events.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSidebar({
  calendars,
  onVisibleCalendarsChange,
}: {
  calendars: CalendarDTO[];
  onVisibleCalendarsChange: (calendarIds: string[] | undefined) => void;
}) {
  const { myCalendars, otherCalendars, isLoading, error, toggleVisibility } =
    useCalendarSidebarData();

  React.useEffect(() => {
    const allIds = calendars.map((cal) => cal.id);
    if (allIds.length) {
      onVisibleCalendarsChange(allIds);
    }
  }, [calendars, onVisibleCalendarsChange]);

  return (
    <aside className="hidden w-72 border-r bg-white p-4 lg:block">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <CalendarDays className="h-4 w-4 text-blue-600" />
        <span>Calendar</span>
      </div>

      {/* Mini calendar placeholder */}
      <div className="mb-6 rounded-xl border bg-gray-50 px-3 py-2 text-xs text-gray-500">
        Mini calendar will be implemented next. Clicking dates will move the
        main view.
      </div>

      <ScrollArea className="h-[calc(100vh-200px)] pr-2">
        {isLoading && (
          <p className="mb-2 text-xs text-gray-400">Loading calendars…</p>
        )}
        {error && (
          <p className="mb-2 text-xs text-red-500">
            Failed to load calendars. Please refresh the page.
          </p>
        )}

        {myCalendars.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              My calendars
            </h3>
            <ul className="space-y-1">
              {myCalendars.map((item) => (
                <li key={item.calendarId}>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(item)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-50"
                  >
                    <span
                      className="h-3 w-3 rounded-sm border"
                      style={{ backgroundColor: item.isHidden ? "transparent" : item.color }}
                    />
                    <span
                      className={`flex-1 truncate ${
                        item.isHidden ? "text-gray-400" : "text-gray-800"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {otherCalendars.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Other calendars
            </h3>
            <ul className="space-y-1">
              {otherCalendars.map((item) => (
                <li key={item.calendarId}>
                  <button
                    type="button"
                    onClick={() => toggleVisibility(item)}
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-gray-50"
                  >
                    <span
                      className="h-3 w-3 rounded-sm border"
                      style={{ backgroundColor: item.isHidden ? "transparent" : item.color }}
                    />
                    <span
                      className={`flex-1 truncate ${
                        item.isHidden ? "text-gray-400" : "text-gray-800"
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarPageContent />
    </ProtectedRoute>
  );
}
