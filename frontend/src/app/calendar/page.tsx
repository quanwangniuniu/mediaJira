"use client";

import React, { useMemo, useState } from "react";
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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TextInput, TextArea, Select } from "@/components/input/InputPrimitives";
import toast from "react-hot-toast";

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [dialogStart, setDialogStart] = useState<Date | null>(null);
  const [dialogEnd, setDialogEnd] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventDTO | null>(null);

  const { events, calendars, isLoading, error, refetch } = useCalendarView({
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

  return (
    <Layout>
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
            currentDate={currentDate}
            onVisibleCalendarsChange={setVisibleCalendarIds}
            onDateChange={setCurrentDate}
          />

          <section className="flex-1 overflow-auto bg-gray-50 p-4">
            {currentView === "week" && (
              <WeekView
                currentDate={currentDate}
                events={events}
                calendars={calendars}
                isLoading={isLoading}
                error={error}
                onTimeSlotClick={(start) => {
                  const end = new Date(start);
                  end.setHours(start.getHours() + 1);
                  setDialogMode("create");
                  setEditingEvent(null);
                  setDialogStart(start);
                  setDialogEnd(end);
                  setIsDialogOpen(true);
                }}
                onEventClick={(event) => {
                  setDialogMode("edit");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
                  setIsDialogOpen(true);
                }}
                onEventTimeChange={async (event, start, end) => {
                  try {
                    await CalendarAPI.updateEvent(
                      event.id,
                      {
                        start_datetime: start.toISOString(),
                        end_datetime: end.toISOString(),
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
                onTimeSlotClick={(start) => {
                  const end = new Date(start);
                  end.setHours(start.getHours() + 1);
                  setDialogMode("create");
                  setEditingEvent(null);
                  setDialogStart(start);
                  setDialogEnd(end);
                  setIsDialogOpen(true);
                }}
                onEventClick={(event) => {
                  setDialogMode("edit");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
                  setIsDialogOpen(true);
                }}
                onEventTimeChange={async (event, start, end) => {
                  try {
                    await CalendarAPI.updateEvent(
                      event.id,
                      {
                        start_datetime: start.toISOString(),
                        end_datetime: end.toISOString(),
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
                  setDialogMode("edit");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
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
                onEventClick={(event) => {
                  setDialogMode("edit");
                  setEditingEvent(event);
                  setDialogStart(new Date(event.start_datetime));
                  setDialogEnd(new Date(event.end_datetime));
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

          <EventDialog
            open={isDialogOpen}
            mode={dialogMode}
            onOpenChange={setIsDialogOpen}
            start={dialogStart}
            end={dialogEnd}
            event={editingEvent}
            calendars={calendars}
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
  onTimeSlotClick: (start: Date) => void;
  onEventClick: (event: EventDTO) => void;
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

      <div
        className="grid flex-1 grid-cols-[60px_repeat(7,minmax(0,1fr))] overflow-auto text-xs"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
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
            <div key={day.toISOString()} className="relative border-r last:border-r-0">
              {hours.map((hour) => {
                const slotStart = new Date(dayStart);
                slotStart.setHours(hour, 0, 0, 0);

                return (
                  <button
                    key={hour}
                    type="button"
                    className="h-12 w-full border-b border-gray-100 bg-white text-left hover:bg-blue-50"
                    onClick={() => onTimeSlotClick(slotStart)}
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
                      onEventClick(event);
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
  onTimeSlotClick: (start: Date) => void;
  onEventClick: (event: EventDTO) => void;
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
    <div className="flex h-full flex-col rounded-xl border bg-white shadow-sm">
      <div className="grid grid-cols-[60px_minmax(0,1fr)] border-b bg-gray-50 text-xs font-medium text-gray-500">
        <div className="border-r px-2 py-2" />
        <div className="flex flex-col items-center px-2 py-2">
          <span>{format(currentDate, "EEE")}</span>
          <span className="mt-1 rounded-full px-1.5 py-0.5 text-sm font-semibold text-gray-800">
            {format(currentDate, "d")}
          </span>
        </div>
      </div>

      <div
        className="grid flex-1 grid-cols-[60px_minmax(0,1fr)] overflow-auto text-xs"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
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

        <div className="relative border-r">
          {hours.map((hour) => {
            const slotStart = new Date(dayStart);
            slotStart.setHours(hour, 0, 0, 0);

            return (
              <button
                key={hour}
                type="button"
                className="h-12 w-full border-b border-gray-100 bg-white text-left hover:bg-blue-50"
                onClick={() => onTimeSlotClick(slotStart)}
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
                  onEventClick(event);
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
    <div className="flex h-full flex-col rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-semibold text-gray-700">
        <span>{format(currentDate, "MMMM yyyy")}</span>
        {isLoading && <span className="text-xs text-gray-400">Loading…</span>}
        {error && (
          <span className="text-xs text-red-500">Failed to load events.</span>
        )}
      </div>

      <div className="grid flex-1 grid-rows-[auto_1fr]">
        <div className="grid grid-cols-7 border-b bg-gray-50 text-[11px] font-medium text-gray-500">
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
              className += " bg-gray-50";
            }

            return (
              <button
                key={day.toISOString()}
                type="button"
                className={className}
                onClick={() => onDaySelect(day)}
              >
                <div className="mb-1 flex items-center justify-between text-[11px]">
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
  onEventClick: (event: EventDTO) => void;
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
    <div className="flex h-full flex-col rounded-xl border bg-white shadow-sm">
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
                        onClick={() => onEventClick(event)}
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
    <div className="flex h-full flex-col rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-semibold text-gray-700">
        <span>{format(yearStart, "yyyy")}</span>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-4 overflow-auto p-4 text-[11px]">
        {months.map((monthDate) => {
          const startMonth = startOfMonth(monthDate);
          const gridStart = startOfWeek(startMonth, { weekStartsOn: 1 });
          const days = Array.from({ length: 42 }, (_, index) =>
            addDays(gridStart, index),
          );
          const weekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];

          return (
            <div key={monthDate.toISOString()} className="rounded border bg-gray-50 p-2">
              <div className="mb-1 text-center text-[11px] font-semibold text-gray-700">
                {format(monthDate, "MMMM")}
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-[10px] text-gray-400">
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
  calendars,
  currentDate,
  onVisibleCalendarsChange,
  onDateChange,
}: {
  calendars: CalendarDTO[];
  currentDate: Date;
  onVisibleCalendarsChange: (calendarIds: string[] | undefined) => void;
  onDateChange: (next: Date) => void;
}) {
  const { myCalendars, otherCalendars, isLoading, error, toggleVisibility } =
    useCalendarSidebarData();

  React.useEffect(() => {
    const visibleIds = [...myCalendars, ...otherCalendars]
      .filter((item) => !item.isHidden)
      .map((item) => item.calendarId);

    onVisibleCalendarsChange(visibleIds.length ? visibleIds : undefined);
  }, [myCalendars, otherCalendars, onVisibleCalendarsChange]);

  return (
    <aside className="hidden w-72 border-r bg-white p-4 lg:block">
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
    <div className="mb-6 rounded-xl border bg-gray-50 p-3">
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

function EventDialog({
  open,
  mode,
  onOpenChange,
  start,
  end,
  event,
  calendars,
  onSave,
  onDelete,
}: {
  open: boolean;
  mode: "create" | "edit";
  onOpenChange: (open: boolean) => void;
  start: Date | null;
  end: Date | null;
  event: EventDTO | null;
  calendars: CalendarDTO[];
  onSave: (payload: { action: () => Promise<void> }) => Promise<void>;
  onDelete?: (event: EventDTO) => Promise<void>;
}) {
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [description, setDescription] = React.useState(event?.description ?? "");
  const [calendarId, setCalendarId] = React.useState<string>(
    event?.calendar_id || calendars[0]?.id || "",
  );

  React.useEffect(() => {
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setCalendarId(event?.calendar_id || calendars[0]?.id || "");
  }, [event, calendars]);

  if (!start || !end) {
    return null;
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
            start_datetime: start.toISOString(),
            end_datetime: end.toISOString(),
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
              calendar_id: calendarId,
              title: title.trim(),
              description: description || "",
              start_datetime: start.toISOString(),
              end_datetime: end.toISOString(),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create event" : "Edit event"}
          </DialogTitle>
          <DialogDescription>
            Set the basic information for this calendar event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <TextInput
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Select
            label="Calendar"
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            options={calendars.map((cal) => ({
              label: cal.name,
              value: cal.id,
            }))}
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextInput
              label="Start"
              type="datetime-local"
              value={formatForInput(start)}
              onChange={(e) => {
                const next = new Date(e.target.value);
                if (!Number.isNaN(next.getTime())) {
                  start.setTime(next.getTime());
                }
              }}
            />
            <TextInput
              label="End"
              type="datetime-local"
              value={formatForInput(end)}
              onChange={(e) => {
                const next = new Date(e.target.value);
                if (!Number.isNaN(next.getTime())) {
                  end.setTime(next.getTime());
                }
              }}
            />
          </div>
          <TextArea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {event?.is_recurring && (
            <p className="text-xs text-gray-500">
              This is a recurring event. Editing is currently applied to the
              entire series. Per-instance editing will be added later.
            </p>
          )}
        </div>

        <DialogFooter className="mt-4 flex justify-end gap-2">
          {mode === "edit" && event && !event.is_recurring && (
            <button
              type="button"
              className="mr-auto rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              onClick={handleDelete}
            >
              Delete
            </button>
          )}
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={handleSubmit}
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarPageContent />
    </ProtectedRoute>
  );
}
