"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  addDays,
  format,
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfMonth,
  isSameMonth,
  isSameDay,
  startOfYear,
  endOfYear,
} from "date-fns";
import Layout from "@/components/layout/Layout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useCalendarSidebarData } from "@/hooks/useCalendarSidebarData";
import { useCalendarView } from "@/hooks/useCalendarView";
import { CalendarAPI, CalendarDTO, EventDTO } from "@/lib/api/calendarApi";
import {
  AlignLeft,
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  MapPin,
  Pencil,
  Trash2,
  X,
  User,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import toast from "react-hot-toast";

type CalendarViewType = "day" | "week" | "month" | "year" | "agenda";
type EventPanelPosition = { top: number; left: number };

const VIEW_LABELS: Record<CalendarViewType, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  year: "Year",
  agenda: "Agenda",
};

const VIEW_SHORTCUTS: Record<CalendarViewType, string> = {
  day: "D",
  week: "W",
  month: "M",
  year: "Y",
  agenda: "A",
};

const CALENDAR_FILTER_STORAGE_KEY = "calendar:selected_calendar_id";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractCalendarIdFromStoredValue(raw: string | null): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const toValidId = (value: unknown): string | null => {
    if (typeof value !== "string") {
      return null;
    }
    const id = value.trim();
    if (!id) {
      return null;
    }
    return UUID_PATTERN.test(id) ? id : null;
  };

  const direct = toValidId(trimmed);
  if (direct) {
    return direct;
  }

  if (
    trimmed.startsWith("[") ||
    trimmed.startsWith("{") ||
    trimmed.startsWith('"')
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return toValidId(parsed[0]);
      }
      if (typeof parsed === "object" && parsed) {
        const fromCalendarId = toValidId(
          (parsed as { calendarId?: unknown }).calendarId,
        );
        if (fromCalendarId) {
          return fromCalendarId;
        }
        return toValidId((parsed as { id?: unknown }).id);
      }
      return toValidId(parsed);
    } catch {
      return null;
    }
  }

  return null;
}

function sameCalendarIdList(
  a: string[] | undefined,
  b: string[] | undefined,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a && !b) {
    return true;
  }
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

function CalendarPageContent() {
  const [currentView, setCurrentView] = useState<CalendarViewType>("week");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [visibleCalendarIds, setVisibleCalendarIds] = useState<string[] | undefined>(undefined);
  const [hasLoadedCalendarFilter, setHasLoadedCalendarFilter] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] =
    useState<"create" | "edit" | "view">("create");
  const [dialogStart, setDialogStart] = useState<Date | null>(null);
  const [dialogEnd, setDialogEnd] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventDTO | null>(null);
  const [panelPosition, setPanelPosition] =
    useState<EventPanelPosition | null>(null);
  const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);
  const viewSwitcherRef = useRef<HTMLDivElement>(null);

  const { events, calendars, isLoading, error, refetch } = useCalendarView({
    viewType: currentView,
    currentDate,
    calendarIds: visibleCalendarIds,
  });

  const handleVisibleCalendarsChange = useCallback(
    (calendarIds: string[] | undefined) => {
      setVisibleCalendarIds((current) =>
        sameCalendarIdList(current, calendarIds) ? current : calendarIds,
      );
    },
    [],
  );

  const selectedCalendarId = useMemo(
    () =>
      visibleCalendarIds && visibleCalendarIds.length === 1
        ? visibleCalendarIds[0]
        : null,
    [visibleCalendarIds],
  );

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const storedValue = window.localStorage.getItem(
      CALENDAR_FILTER_STORAGE_KEY,
    );
    const storedCalendarId = extractCalendarIdFromStoredValue(storedValue);
    if (storedCalendarId) {
      setVisibleCalendarIds([storedCalendarId]);
    } else if (storedValue) {
      // Drop malformed legacy/local data so it cannot break next reload.
      window.localStorage.removeItem(CALENDAR_FILTER_STORAGE_KEY);
    }
    setHasLoadedCalendarFilter(true);
  }, []);

  React.useEffect(() => {
    if (!hasLoadedCalendarFilter || typeof window === "undefined") {
      return;
    }
    if (visibleCalendarIds && visibleCalendarIds.length === 1) {
      window.localStorage.setItem(
        CALENDAR_FILTER_STORAGE_KEY,
        visibleCalendarIds[0],
      );
      return;
    }
    window.localStorage.removeItem(CALENDAR_FILTER_STORAGE_KEY);
  }, [hasLoadedCalendarFilter, visibleCalendarIds]);

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

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const tag = target.tagName.toLowerCase();
      const isTypingElement =
        tag === "input" ||
        tag === "textarea" ||
        target.getAttribute("contenteditable") === "true";
      if (isTypingElement) {
        return;
      }

      if (event.key === "t" || event.key === "T") {
        event.preventDefault();
        handleToday();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleOffset("prev");
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleOffset("next");
        return;
      }

      if (event.key === "d" || event.key === "D") {
        event.preventDefault();
        setCurrentView("day");
        return;
      }
      if (event.key === "w" || event.key === "W") {
        event.preventDefault();
        setCurrentView("week");
        return;
      }
      if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setCurrentView("month");
        return;
      }
      if (event.key === "y" || event.key === "Y") {
        event.preventDefault();
        setCurrentView("year");
        return;
      }
      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        setCurrentView("agenda");
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentView, currentDate]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        viewSwitcherRef.current &&
        !viewSwitcherRef.current.contains(event.target as Node)
      ) {
        setViewSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Layout>
      <div className="flex min-h-screen flex-col bg-[#f8fafd]">
        {/* Top toolbar */}
        <header className="flex items-center justify-between bg-inherit px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToday}
              className="inline-flex items-center rounded-full border border-gray-400 px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
            >
              Today
            </button>
            <div className="flex items-center rounded-full">
              <button
                type="button"
                onClick={() => handleOffset("prev")}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200"
                aria-label="Previous period"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleOffset("next")}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200"
                aria-label="Next period"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900">
                {headerTitle}
              </span>
              {/* {currentView === "week" && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  Week view
                </span>
              )} */}
            </div>
          </div>

          <div className="flex items-center gap-2" ref={viewSwitcherRef}>
            {/* View switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setViewSwitcherOpen((o) => !o)}
                aria-label="Calendar view"
                aria-expanded={viewSwitcherOpen}
                aria-haspopup="listbox"
                className="inline-flex items-center gap-1.5 rounded-full border border-gray-400 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                {VIEW_LABELS[currentView]}
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {viewSwitcherOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  role="listbox"
                >
                  {(Object.keys(VIEW_LABELS) as CalendarViewType[]).map(
                    (view) => (
                      <button
                        key={view}
                        type="button"
                        role="option"
                        aria-selected={currentView === view}
                        onClick={() => {
                          setCurrentView(view);
                          setViewSwitcherOpen(false);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {VIEW_LABELS[view]}
                        <span className="text-xs text-gray-400">
                          {VIEW_SHORTCUTS[view]}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content: sidebar + view */}
        <div className="flex flex-1 overflow-hidden">
          <CalendarSidebar
            currentDate={currentDate}
            onVisibleCalendarsChange={handleVisibleCalendarsChange}
            onDateChange={setCurrentDate}
            selectedCalendarId={selectedCalendarId}
          />

          <section className="flex-1 overflow-auto bg-white rounded-3xl mb-4">
            {currentView === "week" && (
              <WeekView
                currentDate={currentDate}
                events={events}
                calendars={calendars}
                isLoading={isLoading}
                error={error}
                onTimeSlotClick={(start, position) => {
                  const end = new Date(start);
                  end.setHours(start.getHours() + 1);
                  setDialogMode("create");
                  setEditingEvent(null);
                  setDialogStart(start);
                  setDialogEnd(end);
                  setPanelPosition(position);
                  setIsDialogOpen(true);
                }}
                onEventClick={(event, position) => {
                  setDialogMode("view");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
                  setPanelPosition(position);
                  setIsDialogOpen(true);
                }}
                onEventTimeChange={async (event, start, end) => {
                  try {
                    await CalendarAPI.updateEvent(
                      event.id,
                      {
                        start_datetime: start.toISOString(),
                        end_datetime: end.toISOString(),
                        timezone: event.timezone,
                        calendar_id: event.calendar_id,
                      },
                      event.etag,
                    );
                    await refetch();
                  } catch {
                    toast.error("Failed to update event time");
                  }
                }}
              />
            )}

            {currentView === "day" && (
              <DayView
                currentDate={currentDate}
                events={events}
                calendars={calendars}
                isLoading={isLoading}
                error={error}
                onTimeSlotClick={(start, position) => {
                  const end = new Date(start);
                  end.setHours(start.getHours() + 1);
                  setDialogMode("create");
                  setEditingEvent(null);
                  setDialogStart(start);
                  setDialogEnd(end);
                  setPanelPosition(position);
                  setIsDialogOpen(true);
                }}
                onEventClick={(event, position) => {
                  setDialogMode("view");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
                  setPanelPosition(position);
                  setIsDialogOpen(true);
                }}
                onEventTimeChange={async (event, start, end) => {
                  try {
                    await CalendarAPI.updateEvent(
                      event.id,
                      {
                        start_datetime: start.toISOString(),
                        end_datetime: end.toISOString(),
                        timezone: event.timezone,
                        calendar_id: event.calendar_id,
                      },
                      event.etag,
                    );
                    await refetch();
                  } catch {
                    toast.error("Failed to update event time");
                  }
                }}
              />
            )}

            {currentView === "month" && (
              <MonthView
                currentDate={currentDate}
                events={events}
                calendars={calendars}
                isLoading={isLoading}
                error={error}
                onDaySelect={(day) => {
                  setCurrentDate(day);
                  setCurrentView("day");
                }}
                onEventClick={(event) => {
                  setDialogMode("view");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
                  setPanelPosition({
                    top: 120,
                    left: 320,
                  });
                  setIsDialogOpen(true);
                }}
              />
            )}

            {currentView === "agenda" && (
              <AgendaView
                currentDate={currentDate}
                events={events}
                calendars={calendars}
                isLoading={isLoading}
                error={error}
                onEventClick={(event, position) => {
                  setDialogMode("view");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
                   setPanelPosition(position);
                  setIsDialogOpen(true);
                }}
              />
            )}

            {currentView === "year" && (
              <YearView
                currentDate={currentDate}
                onDaySelect={(day) => {
                  setCurrentDate(day);
                  setCurrentView("day");
                }}
              />
            )}

            {currentView !== "week" &&
              currentView !== "day" &&
              currentView !== "month" &&
              currentView !== "agenda" &&
              currentView !== "year" && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-500">
                <List className="h-6 w-6" />
                <p className="text-sm">
                  {VIEW_LABELS[currentView]} view layout will be implemented in
                  later steps.
                </p>
              </div>
            )}
          </section>

          {/* key forces remount when switching events or create view, so slide-up animation replays each time */}
          <EventDialog
            key={editingEvent?.id ?? (isDialogOpen ? "create" : "closed")}
            open={isDialogOpen}
            mode={dialogMode}
            onModeChange={setDialogMode}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setPanelPosition(null);
              }
            }}
            start={dialogStart}
            end={dialogEnd}
            event={editingEvent}
            calendars={calendars}
            preferredCalendarId={selectedCalendarId}
            position={panelPosition}
            onSave={async (payload) => {
              try {
                await payload.action();
                await refetch();
                setIsDialogOpen(false);
              } catch (err: any) {
                toast.error("Failed to save event");
              }
            }}
            onDelete={async (eventToDelete) => {
              try {
                await CalendarAPI.deleteEvent(eventToDelete.id, eventToDelete.etag);
                await refetch();
                setIsDialogOpen(false);
              } catch (err: any) {
                toast.error("Failed to delete event");
              }
            }}
          />
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
  onTimeSlotClick,
  onEventClick,
  onEventTimeChange,
}: {
  currentDate: Date;
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
  onTimeSlotClick: (start: Date, position: EventPanelPosition) => void;
  onEventClick: (event: EventDTO, position: EventPanelPosition) => void;
  onEventTimeChange: (event: EventDTO, start: Date, end: Date) => Promise<void>;
}) {
  const start = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(start, index)),
    [start],
  );

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, index) => index),
    [],
  );

  const [dragState, setDragState] = React.useState<{
    eventId: string;
    mode: "move" | "resize";
    originY: number;
    originX: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  const [previewTimes, setPreviewTimes] = React.useState<
    Record<string, { start: Date; end: Date }>
  >({});

  const [suppressClick, setSuppressClick] = React.useState(false);

  const calendarColorById = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((cal) => {
      map.set(cal.id, cal.color);
    });
    return map;
  }, [calendars]);

  const eventById = useMemo(() => {
    const map = new Map<string, EventDTO>();
    events.forEach((ev) => map.set(ev.id, ev));
    return map;
  }, [events]);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragState) return;
    // Only respond while primary mouse button is pressed.
    if ((e.buttons & 1) === 0) return;

    const pixelsPerMinute = 48 / 60;
    const stepMinutes = 30;

    const deltaY = e.clientY - dragState.originY;
    const rawMinutes = deltaY / pixelsPerMinute;
    const snappedMinutes =
      Math.round(rawMinutes / stepMinutes) * stepMinutes;

    let dayOffset = 0;
    if (dragState.mode === "move") {
      const gridElement = e.currentTarget as HTMLDivElement;
      const rect = gridElement.getBoundingClientRect();
      const totalWidth = rect.width - 60; // subtract time column
      const dayWidth = totalWidth / 7;
      const deltaX = e.clientX - dragState.originX;
      dayOffset = Math.round(deltaX / dayWidth);
    }

    if (snappedMinutes !== 0 || dayOffset !== 0) {
      setSuppressClick(true);
    }

    const totalMinutesOffset = snappedMinutes + dayOffset * 24 * 60;

    const newStart = new Date(
      dragState.originalStart.getTime() + totalMinutesOffset * 60000,
    );
    let newEnd: Date;

    if (dragState.mode === "move") {
      newEnd = new Date(
        dragState.originalEnd.getTime() + totalMinutesOffset * 60000,
      );
    } else {
      const minDurationMinutes = 15;
      const candidateEnd = new Date(
        dragState.originalEnd.getTime() + snappedMinutes * 60000,
      );
      if (
        candidateEnd.getTime() -
          dragState.originalStart.getTime() <
        minDurationMinutes * 60000
      ) {
        newEnd = new Date(
          dragState.originalStart.getTime() +
            minDurationMinutes * 60000,
        );
      } else {
        newEnd = candidateEnd;
      }
    }

    setPreviewTimes((prev) => ({
      ...prev,
      [dragState.eventId]: { start: newStart, end: newEnd },
    }));
  };

  const finishDrag = async () => {
    if (!dragState) return;
    const preview = previewTimes[dragState.eventId];
    const baseEvent = eventById.get(dragState.eventId);
    setDragState(null);
    setPreviewTimes((prev) => {
      const next = { ...prev };
      delete next[dragState.eventId];
      return next;
    });

    if (!preview || !baseEvent) return;
    await onEventTimeChange(baseEvent, preview.start, preview.end);
  };

  const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    void finishDrag();
  };

  return (
    <div className="flex h-full flex-col rounded-3xl bg-white shadow-sm">
      <div className="grid grid-cols-[60px_repeat(7,minmax(0,1fr))] border-b bg-white text-xs font-medium text-gray-500">
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

      <div
        className="grid flex-1 grid-cols-[60px_repeat(7,minmax(0,1fr))] overflow-auto text-xs"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="border-r bg-white">
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
            <div key={day.toISOString()} className="relative border-r last:border-r-0">
              {hours.map((hour) => {
                const slotStart = new Date(dayStart);
                slotStart.setHours(hour, 0, 0, 0);

                return (
                  <button
                    key={hour}
                    type="button"
                    className="h-12 w-full border-b border-gray-100 bg-white text-left hover:bg-blue-50"
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const position = computePanelPosition(rect);
                      onTimeSlotClick(slotStart, position);
                    }}
                  />
                );
              })}

              {dayEvents.map((event) => {
                const preview = previewTimes[event.id];
                const evStart = preview
                  ? preview.start
                  : new Date(event.start_datetime);
                const evEnd = preview
                  ? preview.end
                  : new Date(event.end_datetime);

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
                  <button
                    key={event.id + event.start_datetime}
                    type="button"
                onClick={(e) => {
                  if (suppressClick) {
                    e.preventDefault();
                    setSuppressClick(false);
                    return;
                  }
                  const rect = e.currentTarget.getBoundingClientRect();
                  const position = computePanelPosition(rect);
                  onEventClick(event, position);
                }}
                onMouseDown={(e) => {
                  if (event.is_recurring) return;
                  if (e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragState({
                    eventId: event.id,
                    mode: "move",
                    originY: e.clientY,
                    originX: e.clientX,
                    originalStart: new Date(event.start_datetime),
                    originalEnd: new Date(event.end_datetime),
                  });
                }}
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
                    {!event.is_recurring && (
                      <div
                        className="mt-1 h-1 w-full cursor-row-resize rounded bg-white/60"
                        onMouseDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setDragState({
                            eventId: event.id,
                            mode: "resize",
                            originY: e.clientY,
                            originX: e.clientX,
                            originalStart: new Date(event.start_datetime),
                            originalEnd: new Date(event.end_datetime),
                          });
                        }}
                      />
                    )}
                  </button>
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

function DayView({
  currentDate,
  events,
  calendars,
  isLoading,
  error,
  onTimeSlotClick,
  onEventClick,
  onEventTimeChange,
}: {
  currentDate: Date;
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
  onTimeSlotClick: (start: Date, position: EventPanelPosition) => void;
  onEventClick: (event: EventDTO, position: EventPanelPosition) => void;
  onEventTimeChange: (event: EventDTO, start: Date, end: Date) => Promise<void>;
}) {
  const dayStart = startOfDay(currentDate);
  const dayEnd = addDays(dayStart, 1);

  const hours = useMemo(
    () => Array.from({ length: 24 }, (_, index) => index),
    [],
  );

  const [dragState, setDragState] = React.useState<{
    eventId: string;
    mode: "move" | "resize";
    originY: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  const [previewTimes, setPreviewTimes] = React.useState<
    Record<string, { start: Date; end: Date }>
  >({});

  const [suppressClick, setSuppressClick] = React.useState(false);

  const dayEvents = events.filter((event) => {
    const evStart = new Date(event.start_datetime);
    const evEnd = new Date(event.end_datetime);
    return evEnd > dayStart && evStart < dayEnd;
  });

  const calendarColorById = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((cal) => map.set(cal.id, cal.color));
    return map;
  }, [calendars]);

  const eventById = useMemo(() => {
    const map = new Map<string, EventDTO>();
    events.forEach((ev) => map.set(ev.id, ev));
    return map;
  }, [events]);

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!dragState) return;
    // Only respond while primary mouse button is pressed.
    if ((e.buttons & 1) === 0) return;

    const pixelsPerMinute = 48 / 60;
    const stepMinutes = 30;

    const deltaY = e.clientY - dragState.originY;
    const rawMinutes = deltaY / pixelsPerMinute;
    const snappedMinutes =
      Math.round(rawMinutes / stepMinutes) * stepMinutes;

    if (snappedMinutes !== 0) {
      setSuppressClick(true);
    }

    const newStart = new Date(
      dragState.originalStart.getTime() + snappedMinutes * 60000,
    );
    let newEnd: Date;

    if (dragState.mode === "move") {
      newEnd = new Date(
        dragState.originalEnd.getTime() + snappedMinutes * 60000,
      );
    } else {
      const minDurationMinutes = 15;
      const candidateEnd = new Date(
        dragState.originalEnd.getTime() + snappedMinutes * 60000,
      );
      if (
        candidateEnd.getTime() -
          dragState.originalStart.getTime() <
        minDurationMinutes * 60000
      ) {
        newEnd = new Date(
          dragState.originalStart.getTime() +
            minDurationMinutes * 60000,
        );
      } else {
        newEnd = candidateEnd;
      }
    }

    setPreviewTimes((prev) => ({
      ...prev,
      [dragState.eventId]: { start: newStart, end: newEnd },
    }));
  };

  const finishDrag = async () => {
    if (!dragState) return;
    const preview = previewTimes[dragState.eventId];
    const baseEvent = eventById.get(dragState.eventId);
    setDragState(null);
    setPreviewTimes((prev) => {
      const next = { ...prev };
      delete next[dragState.eventId];
      return next;
    });

    if (!preview || !baseEvent) return;
    await onEventTimeChange(baseEvent, preview.start, preview.end);
  };

  const handleMouseUp: React.MouseEventHandler<HTMLDivElement> = () => {
    void finishDrag();
  };

  return (
    <div className="flex flex-col rounded-xl bg-white">
      <div className="grid grid-cols-[60px_minmax(0,1fr)] border-b bg-white text-xs font-medium text-gray-500">
        <div className="border-r px-2 py-2" />
        <div className="flex flex-col px-2 py-2">
          <span>{format(currentDate, "EEE")}</span>
          <span className="mt-1 rounded-full px-1.5 py-0.5 text-sm font-semibold text-gray-800">
            {format(currentDate, "d")}
          </span>
        </div>
      </div>

      <div
        className="grid flex-1 grid-cols-[60px_minmax(0,1fr)] overflow-auto text-xs "
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="border-r bg-white">
          {hours.map((hour) => (
            <div
              key={hour}
              className="inline-block h-12 border-b border-gray-100 px-2 text-right text-[11px] text-gray-400"
            >
              {format(new Date().setHours(hour, 0, 0, 0), "ha")}
            </div>
          ))}
        </div>

        <div className="relative">
          {hours.map((hour) => {
            const slotStart = new Date(dayStart);
            slotStart.setHours(hour, 0, 0, 0);

            return (
              <button
                key={hour}
                type="button"
                className="h-12 w-full border-b border-gray-100 bg-white text-left hover:bg-blue-50"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const position = computePanelPosition(rect, "day");
                  onTimeSlotClick(slotStart, position);
                }}
              />
            );
          })}

          {dayEvents.map((event) => {
            const preview = previewTimes[event.id];
            const evStart = preview
              ? preview.start
              : new Date(event.start_datetime);
            const evEnd = preview
              ? preview.end
              : new Date(event.end_datetime);

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
            <button
              key={event.id + event.start_datetime}
              type="button"
              onClick={(e) => {
                  if (suppressClick) {
                    e.preventDefault();
                    setSuppressClick(false);
                    return;
                  }
                  onEventClick(event, computePanelPosition(null, "day"));
                }}
                onMouseDown={(e) => {
                  if (event.is_recurring) return;
                  if (e.button !== 0) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDragState({
                    eventId: event.id,
                    mode: "move",
                    originY: e.clientY,
                    originalStart: new Date(event.start_datetime),
                    originalEnd: new Date(event.end_datetime),
                  });
                }}
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
                {!event.is_recurring && (
                  <div
                    className="mt-1 h-1 w-full cursor-row-resize rounded bg-white/60"
                    onMouseDown={(e) => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      e.stopPropagation();
                      setDragState({
                        eventId: event.id,
                        mode: "resize",
                        originY: e.clientY,
                        originalStart: new Date(event.start_datetime),
                        originalEnd: new Date(event.end_datetime),
                      });
                    }}
                  />
                )}
              </button>
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
      </div>
    </div>
  );
}

function MonthView({
  currentDate,
  events,
  calendars,
  isLoading,
  error,
  onDaySelect,
  onEventClick,
}: {
  currentDate: Date;
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
  onDaySelect: (day: Date) => void;
  onEventClick: (event: EventDTO) => void;
}) {
  const startMonth = startOfMonth(currentDate);
  const gridStart = startOfWeek(startMonth, { weekStartsOn: 1 });
  const days = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)),
    [gridStart],
  );

  const calendarColorById = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((cal) => map.set(cal.id, cal.color));
    return map;
  }, [calendars]);

  const eventsByDay = useMemo(() => {
    const result = new Map<string, EventDTO[]>();
    days.forEach((day) => {
      const key = format(day, "yyyy-MM-dd");
      result.set(key, []);
    });

    events.forEach((event) => {
      const evStart = new Date(event.start_datetime);
      const evEnd = new Date(event.end_datetime);

      days.forEach((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = addDays(dayStart, 1);
        if (evEnd > dayStart && evStart < dayEnd) {
          const key = format(day, "yyyy-MM-dd");
          const bucket = result.get(key);
          if (bucket) {
            bucket.push(event);
          }
        }
      });
    });

    return result;
  }, [events, days]);

  const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();

  return (
    <div className="flex h-full flex-col rounded-xl bg-white">
      <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-700">
        {/* <span>{format(currentDate, "MMMM yyyy")}</span> */}
        {isLoading && <span className="text-xs text-gray-400">Loading…</span>}
        {error && (
          <span className="text-xs text-red-500">Failed to load events.</span>
        )}
      </div>

      <div className="grid flex-1 grid-rows-[auto_1fr]">
        <div className="grid grid-cols-7 bg-white text-[11px] font-medium text-gray-500">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="flex items-center justify-center py-1"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid flex-1 grid-cols-7 grid-rows-6 text-xs">
          {days.map((day) => {
            const inMonth = isSameMonth(day, startMonth);
            const isSelected = isSameDay(day, currentDate);
            const isToday = isSameDay(day, today);
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) || [];

            const baseClasses =
              "flex h-full flex-col border-b border-r bg-white px-1.5 py-1";
            let className = baseClasses;

            if (!inMonth) {
              className += " bg-white";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                className={className}
                onClick={() => onDaySelect(day)}
              >
                <div className="mb-1 flex items-center justify-center text-[11px]">
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isToday
                        ? "border border-blue-500 text-blue-700"
                        : inMonth
                        ? "text-gray-800"
                        : "text-gray-300"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => {
                    const color =
                      event.color ||
                      calendarColorById.get(event.calendar_id || "") ||
                      "#1E88E5";
                    return (
                      <div
                        key={event.id + event.start_datetime}
                        className="flex cursor-pointer items-center gap-1 truncate rounded px-1 py-0.5 text-[11px] text-gray-900 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate">{event.title}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-500">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AgendaView({
  currentDate,
  events,
  calendars,
  isLoading,
  error,
  onEventClick,
}: {
  currentDate: Date;
  events: EventDTO[];
  calendars: CalendarDTO[];
  isLoading: boolean;
  error: Error | null;
  onEventClick: (event: EventDTO, position: EventPanelPosition) => void;
}) {
  const calendarColorById = useMemo(() => {
    const map = new Map<string, string>();
    calendars.forEach((cal) => map.set(cal.id, cal.color));
    return map;
  }, [calendars]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, EventDTO[]>();
    const sorted = [...events].sort(
      (a, b) =>
        new Date(a.start_datetime).getTime() -
        new Date(b.start_datetime).getTime(),
    );

    sorted.forEach((event) => {
      const key = format(new Date(event.start_datetime), "yyyy-MM-dd");
      const bucket = grouped.get(key);
      if (bucket) {
        bucket.push(event);
      } else {
        grouped.set(key, [event]);
      }
    });

    return grouped;
  }, [events]);

  const dateKeys = Array.from(eventsByDate.keys());

  return (
    <div className="flex h-full flex-col rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-semibold text-gray-700">
        <span>
          {format(currentDate, "MMM d, yyyy")} –{" "}
          {format(addDays(currentDate, 7), "MMM d, yyyy")}
        </span>
        {isLoading && <span className="text-xs text-gray-400">Loading…</span>}
        {error && (
          <span className="text-xs text-red-500">Failed to load events.</span>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {dateKeys.length === 0 && !isLoading && !error && (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No events in this range.
          </div>
        )}
        {dateKeys.map((key) => {
          const day = new Date(key);
          const dayEvents = eventsByDate.get(key) || [];
          return (
            <div key={key} className="border-b px-4 py-3 text-sm">
              <div className="mb-2 font-semibold text-gray-800">
                {format(day, "EEE, MMM d")}
              </div>
              <ul className="space-y-1">
                {dayEvents.map((event) => {
                  const color =
                    event.color ||
                    calendarColorById.get(event.calendar_id || "") ||
                    "#1E88E5";
                  const start = new Date(event.start_datetime);
                  const end = new Date(event.end_datetime);
                  return (
                    <li key={event.id + event.start_datetime}>
                      <button
                        type="button"
                        onClick={(e) => {
                          const rect =
                            e.currentTarget.getBoundingClientRect();
                          const position = computePanelPosition(rect);
                          onEventClick(event, position);
                        }}
                        className="flex w-full items-center justify-between rounded px-2 py-1 text-left hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-gray-500">
                            {format(start, "HH:mm")} – {format(end, "HH:mm")}
                          </span>
                          <span className="truncate text-sm text-gray-900">
                            {event.title}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearView({
  currentDate,
  onDaySelect,
}: {
  currentDate: Date;
  onDaySelect: (day: Date) => void;
}) {
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);

  const months = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => {
        const d = new Date(yearStart);
        d.setMonth(index, 1);
        return d;
      }),
    [yearStart],
  );

  const today = new Date();

  return (
    <div className="flex h-full flex-col rounded-xl bg-white">
      {/* <div className="flex items-center justify-between px-4 py-2 text-sm font-semibold text-gray-700">
        <span>{format(yearStart, "yyyy")}</span>
      </div> */}
      <div className="grid flex-1 grid-cols-3 gap-4 overflow-auto p-4 text-[11px]">
        {months.map((monthDate) => {
          const startMonth = startOfMonth(monthDate);
          const gridStart = startOfWeek(startMonth, { weekStartsOn: 1 });
          const days = Array.from({ length: 42 }, (_, index) =>
            addDays(gridStart, index),
          );
          const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

          return (
            <div key={monthDate.toISOString()} className="rounded bg-white p-2">
              <div className="mb-1 text-center text-[11px] font-semibold text-gray-700">
                {format(monthDate, "MMMM")}
              </div>
              <div className="grid grid-cols-7 place-items-center gap-0.5 text-[10px] text-gray-400">
                {weekdayLabels.map((label) => (
                  <div
                    key={label}
                    className="flex h-4 items-center justify-center"
                  >
                    {label}
                  </div>
                ))}
                {days.map((day) => {
                  const inMonth = isSameMonth(day, startMonth);
                  const isToday = isSameDay(day, today);
                  const baseClasses =
                    "flex h-5 w-5 items-center justify-center rounded-full";
                  let className = baseClasses;
                  if (!inMonth) {
                    className += " text-gray-300";
                  } else if (isToday) {
                    className +=
                      " border border-blue-500 text-blue-700 bg-white";
                  } else {
                    className += " text-gray-700 hover:bg-white";
                  }

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      className={className}
                      onClick={() => onDaySelect(day)}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSidebar({
  currentDate,
  onVisibleCalendarsChange,
  onDateChange,
  selectedCalendarId,
}: {
  currentDate: Date;
  onVisibleCalendarsChange: (calendarIds: string[] | undefined) => void;
  onDateChange: (next: Date) => void;
  selectedCalendarId: string | null;
}) {
  const { myCalendars, otherCalendars, isLoading, error } =
    useCalendarSidebarData();

  const handleCalendarItemClick = useCallback(
    (calendarId: string) => {
      if (selectedCalendarId === calendarId) {
        onVisibleCalendarsChange(undefined);
        return;
      }
      onVisibleCalendarsChange([calendarId]);
    },
    [onVisibleCalendarsChange, selectedCalendarId],
  );

  React.useEffect(() => {
    if (!selectedCalendarId || isLoading || error) {
      return;
    }
    const allItems = [...myCalendars, ...otherCalendars];
    const hasSelectedCalendar = allItems.some(
      (item) => item.calendarId === selectedCalendarId,
    );
    if (!hasSelectedCalendar) {
      onVisibleCalendarsChange(undefined);
    }
  }, [
    error,
    isLoading,
    myCalendars,
    onVisibleCalendarsChange,
    otherCalendars,
    selectedCalendarId,
  ]);

  return (
    <aside className="hidden w-72 bg-inherit p-4 lg:block">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-800">
        <CalendarDays className="h-4 w-4 text-blue-600" />
        <span>Calendar</span>
      </div>

      <MiniMonthCalendar currentDate={currentDate} onDateChange={onDateChange} />

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
              {myCalendars.map((item) => {
                const isSelected = selectedCalendarId === item.calendarId;
                return (
                  <li key={item.calendarId}>
                    <button
                      type="button"
                      onClick={() => handleCalendarItemClick(item.calendarId)}
                      className={`flex w-full items-center gap-2 rounded-3xl px-2 py-1 text-left text-sm ${
                        isSelected
                          ? "bg-[#E4E8ED]"
                          : "border-transparent text-gray-800 hover:bg-[#E9EEF6]"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-sm border"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {otherCalendars.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Other calendars
            </h3>
            <ul className="space-y-1">
              {otherCalendars.map((item) => {
                const isSelected = selectedCalendarId === item.calendarId;
                return (
                  <li key={item.calendarId}>
                    <button
                      type="button"
                      onClick={() => handleCalendarItemClick(item.calendarId)}
                      className={`flex w-full items-center gap-2 rounded border px-2 py-1 text-left text-sm ${
                        isSelected
                          ? "border-blue-200 bg-blue-50 text-blue-900"
                          : "border-transparent text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className="h-3 w-3 rounded-sm border"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="flex-1 truncate">{item.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

function MiniMonthCalendar({
  currentDate,
  onDateChange,
}: {
  currentDate: Date;
  onDateChange: (next: Date) => void;
}) {
  const startMonth = startOfMonth(currentDate);
  const endMonth = endOfMonth(currentDate);
  const gridStart = startOfWeek(startMonth, { weekStartsOn: 1 });

  const days = useMemo(
    () => Array.from({ length: 42 }, (_, index) => addDays(gridStart, index)),
    [gridStart],
  );

  const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
  const today = new Date();

  return (
    <div className="mb-6 rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
        <span>{format(currentDate, "MMMM yyyy")}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-[11px] text-gray-500">
        {weekdayLabels.map((label) => (
          <div key={label} className="flex h-5 items-center justify-center">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, startMonth);
          const isSelected = isSameDay(day, currentDate);
          const isToday = isSameDay(day, today);

          const baseClasses =
            "flex h-7 w-7 items-center justify-center rounded-full text-xs";
          let className = baseClasses;

          if (isSelected) {
            className += " bg-blue-600 text-white";
          } else if (isToday) {
            className += " border border-blue-500 text-blue-700";
          } else if (!inMonth) {
            className += " text-gray-300";
          } else {
            className += " text-gray-700 hover:bg-white";
          }

          return (
            <button
              key={day.toISOString()}
              type="button"
              className={className}
              onClick={() => onDateChange(day)}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

//Computes event panel position based on view.
function computePanelPosition(
  rect: DOMRect | null,
  view?: CalendarViewType,
): EventPanelPosition {
  const panelWidth = 420;
  const panelHeight = 388;

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1024;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 768;

  if (view === "day" || !rect) {
    const top = Math.max(0, (viewportHeight - panelHeight) / 2);
    const left = Math.max(0, (viewportWidth - panelWidth) / 2);
    return { top, left };
  }

  const margin = 16;

  // Horizontal: prefer right of target, flip to left if no space
  let left = rect.right + margin;
  if (left + panelWidth > viewportWidth - margin) {
    left = rect.left - panelWidth - margin;
  }
  left = Math.max(margin, Math.min(left, viewportWidth - panelWidth - margin));

  // Vertical
  let top = rect.top;
  if (top < margin) {
    // Not enough space above: show below target
    top = rect.bottom + margin;
  } else if (top + panelHeight > viewportHeight - margin) {
    // Not enough space below: show above target
    top = rect.bottom - panelHeight - margin;
    
  }
  top = Math.max(margin, Math.min(top, viewportHeight - panelHeight - margin));

  return { top, left };
}

function EventDialog({
  open,
  mode,
  onModeChange,
  onOpenChange,
  start,
  end,
  event,
  calendars,
  preferredCalendarId,
  onSave,
  onDelete,
  position,
}: {
  open: boolean;
  mode: "create" | "edit" | "view";
  onModeChange: (mode: "create" | "edit" | "view") => void;
  onOpenChange: (open: boolean) => void;
  start: Date | null;
  end: Date | null;
  event: EventDTO | null;
  calendars: CalendarDTO[];
  preferredCalendarId?: string | null;
  onSave: (payload: { action: () => Promise<void> }) => Promise<void>;
  onDelete?: (event: EventDTO) => Promise<void>;
  position: EventPanelPosition | null;
}) {
  const resolveDefaultCalendarId = useCallback(
    (eventCalendarId?: string | null) => {
      const availableIds = new Set(calendars.map((cal) => cal.id));
      if (eventCalendarId && availableIds.has(eventCalendarId)) {
        return eventCalendarId;
      }
      if (preferredCalendarId && availableIds.has(preferredCalendarId)) {
        return preferredCalendarId;
      }
      return calendars[0]?.id || "";
    },
    [calendars, preferredCalendarId],
  );

  // console.log("Dialog Data Check:", {
  //   mode,
  //   calendarsCount: calendars?.length,
  //   currentCalendarId: event?.calendar_id,
  //   allCalendars: calendars
  // });
  
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [description, setDescription] = React.useState(
    event?.description ?? "",
  );
  const [localStart, setLocalStart] = React.useState<Date | null>(start);
  const [localEnd, setLocalEnd] = React.useState<Date | null>(end);
  const [calendarId, setCalendarId] = React.useState<string>(
    resolveDefaultCalendarId(event?.calendar_id),
  );

  React.useEffect(() => {
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setCalendarId(resolveDefaultCalendarId(event?.calendar_id));
    setLocalStart(start);
    setLocalEnd(end);
  }, [event, mode, resolveDefaultCalendarId, start, end]);

  if (!open || !localStart || !localEnd || !position) {
    return null;
  }

  // Clicking the backdrop closes the panel
  const backdrop = (
    <div
      className="fixed inset-0 z-40"
      aria-hidden
      onClick={() => onOpenChange(false)}
    />
  );

  if (mode === "view" && event) {
    const calendarName =
      calendars.find((c) => c.id === event.calendar_id)?.name || "Calendar";
    const color =
      event.color ||
      calendars.find((c) => c.id === event.calendar_id)?.color ||
      "#1E88E5";

    return (
      <>
        {backdrop}
        <div
          className="fixed z-50 w-[360px] rounded-3xl border bg-[#f0f4f9] shadow-xl animate-in slide-in-from-bottom-8 fade-in duration-300"
          style={{ top: position.top, left: position.left }}
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-semibold text-gray-900">
              {event.title || "(No title)"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            {!event.is_recurring && onDelete && (
              <button
                type="button"
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={() => onModeChange("edit")}
                aria-label="Edit event"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {!event.is_recurring && onDelete && (
              <button
                type="button"
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={async () => {
                  await onDelete(event);
                }}
                aria-label="Delete event"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              className="rounded-full p-1 hover:bg-gray-100"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="px-4 pb-4 pt-2 text-sm">
          <div className="mb-2 flex items-start gap-3 text-gray-700">
            <Clock className="mt-0.5 h-4 w-4 text-gray-500" />
              <div>
                <div>
                  {format(localStart, "EEEE, MMMM d")} •{" "}
                  {format(localStart, "h:mm a")} –{" "}
                  {format(localEnd, "h:mm a")}
                </div>
              </div>
          </div>
          {event.description && (
            <div className="mb-2 flex items-start gap-3 text-gray-700">
              <AlignLeft className="mt-0.5 h-4 w-4 text-gray-500" />
              <p className="whitespace-pre-line text-sm">
                {event.description}
              </p>
            </div>
          )}
          <div className="flex items-start gap-3 text-gray-700">
            <CalendarIcon className="mt-0.5 h-4 w-4 text-gray-500" />
            <span className="text-sm">{calendarName}</span>
          </div>
          {event.is_recurring && (
            <p className="mt-2 text-xs text-gray-500">
              This is a recurring event. Editing applies to the entire series.
            </p>
          )}
        </div>
        </div>
      </>
    );
  }

  const formatForInput = (date: Date) =>
    format(date, "yyyy-MM-dd'T'HH:mm");

  const handleSubmit = async () => {
    if (!calendarId) {
      toast.error("Please select a calendar");
      return;
    }
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const timezone =
      typeof Intl !== "undefined" &&
      Intl.DateTimeFormat().resolvedOptions().timeZone
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC";

    if (mode === "create") {
      await onSave({
        action: async () => {
          await CalendarAPI.createEvent({
            calendar_id: calendarId,
            title: title.trim(),
            description: description || "",
            start_datetime: localStart.toISOString(),
            end_datetime: localEnd.toISOString(),
            timezone,
            is_all_day: false,
          });
        },
      });
    } else if (mode === "edit" && event) {
      await onSave({
        action: async () => {
          await CalendarAPI.updateEvent(
            event.id,
            {
              calendar_id: calendarId || event.calendar_id,
              title: title.trim(),
              description: description || "",
              start_datetime: localStart.toISOString(),
              end_datetime: localEnd.toISOString(),
              timezone: event.timezone || timezone,
            },
            event.etag,
          );
        },
      });
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete) {
      return;
    }
    await onDelete(event);
  };

  return (
    <>
      {backdrop}
      <div
        className="fixed z-50 w-[420px] rounded-3xl border bg-[#f0f4f9] shadow-xl animate-in slide-in-from-bottom-8 fade-in duration-300"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
      <div className="flex flex-col">
        <div className="px-6 pt-4 pb-2">
          <input
            autoFocus
            className="w-full border-b border-gray-200 pb-1 text-xl font-semibold text-gray-900 outline-none focus:border-blue-500 bg-inherit"
            placeholder="Add title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="px-6 pb-4">
          <div className="mb-3 flex gap-2 text-sm">
            <button
              type="button"
              className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700"
            >
              Event
            </button>
            <button
              type="button"
              disabled
              className="cursor-default rounded-full px-3 py-1 text-xs font-medium text-gray-400"
            >
              Task
            </button>
            <button
              type="button"
              disabled
              className="cursor-default rounded-full px-3 py-1 text-xs font-medium text-gray-400"
            >
              Appointment schedule
            </button>
          </div>
   
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-4">
              <Clock className="mt-1 h-4 w-4 text-gray-500" />
              <div className="flex-1 space-y-1">
                <p className="text-gray-900 bg-inherit">
                  {format(localStart, "EEEE, MMMM d")}{" "}
                  <span className="text-gray-500">
                    • {format(localStart, "HH:mm")} -{" "}
                    {format(localEnd, "HH:mm")}
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-500 bg-[#dde3ea]"
                    value={formatForInput(localStart)}
                    onChange={(e) => {
                      const next = new Date(e.target.value);
                      if (!Number.isNaN(next.getTime())) {
                        setLocalStart(next);
                      }
                    }}
                  />
                  <input
                    type="datetime-local"
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-500 bg-[#dde3ea]"
                    value={formatForInput(localEnd)}
                    onChange={(e) => {
                      const next = new Date(e.target.value);
                      if (!Number.isNaN(next.getTime())) {
                        setLocalEnd(next);
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Time zone • Does not repeat
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <AlignLeft className="mt-1 h-4 w-4 text-gray-500" />
              <textarea
                className="min-h-[72px] w-full resize-none rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-500 bg-[#dde3ea]"
                placeholder="Add description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {mode === "create" ? (
              <div className="flex items-center gap-4">
                {/* <CalendarIcon className="h-4 w-4 text-gray-500" /> */}
                <div className="flex-1">
                  {/* <p className="text-xs text-gray-500">Calendar</p> */}
                  <select
                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 outline-none focus:border-blue-500 bg-[#dde3ea]"
                    value={calendarId}
                    onChange={(e) => setCalendarId(e.target.value)}
                  >
                    {calendars.map((cal) => (
                      <option key={cal.id} value={cal.id}>
                        {cal.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              event && (
                <div className="flex items-center gap-4">
                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                  <div className="flex items-center gap-2 text-sm text-gray-900">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          calendars.find((c) => c.id === event.calendar_id)
                            ?.color || "#1E88E5",
                      }}
                    />
                    <span>
                      {
                        calendars.find((c) => c.id === event.calendar_id)
                          ?.name
                      }
                    </span>
                  </div>
                </div>
              )
            )}

            {event?.is_recurring && (
              <p className="text-xs text-gray-500">
                This is a recurring event. Editing is currently applied to the
                entire series. Per-instance editing will be added later.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t bg-inherit px-6 py-3">
          <button
            type="button"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
            onClick={() => {
              // Placeholder for future advanced options
            }}
          >
            More options
          </button>
          <div className="flex items-center gap-2">
            {mode === "edit" && event && !event.is_recurring && (
              <button
                type="button"
                className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={handleDelete}
              >
                Delete
              </button>
            )}
            <button
              type="button"
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-full bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              onClick={handleSubmit}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarPageContent />
    </ProtectedRoute>
  );
}
