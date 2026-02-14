import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { SidebarCalendarItem } from "@/hooks/useCalendarSidebarData";
import { MiniMonthCalendar } from "@/components/calendar/CalendarViews";

type CalendarSidebarPanelProps = {
  currentDate: Date;
  onDateChange: (next: Date) => void;
  selectedCalendarId: string | null;
  myCalendars: SidebarCalendarItem[];
  otherCalendars: SidebarCalendarItem[];
  isLoading: boolean;
  error: Error | null;
  onCalendarItemClick: (calendarId: string) => void;
};

export function CalendarSidebarPanel({
  currentDate,
  onDateChange,
  selectedCalendarId,
  myCalendars,
  otherCalendars,
  isLoading,
  error,
  onCalendarItemClick,
}: CalendarSidebarPanelProps) {
  return (
    <aside className="hidden w-72 bg-inherit p-4 lg:block">
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
                      onClick={() => onCalendarItemClick(item.calendarId)}
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
                      onClick={() => onCalendarItemClick(item.calendarId)}
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
