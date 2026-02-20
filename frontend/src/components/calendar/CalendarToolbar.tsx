import React from "react";
import type { CalendarViewType } from "@/lib/api/calendarApi";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { VIEW_LABELS, VIEW_SHORTCUTS } from "@/components/calendar/utils";

type CalendarToolbarProps = {
  headerTitle: string;
  currentView: CalendarViewType;
  viewSwitcherOpen: boolean;
  viewSwitcherRef: React.RefObject<HTMLDivElement>;
  onToggleViewSwitcher: () => void;
  onSelectView: (view: CalendarViewType) => void;
  onToday: () => void;
  onOffset: (direction: "prev" | "next") => void;
};

export function CalendarToolbar({
  headerTitle,
  currentView,
  viewSwitcherOpen,
  viewSwitcherRef,
  onToggleViewSwitcher,
  onSelectView,
  onToday,
  onOffset,
}: CalendarToolbarProps) {
  return (
    <header className="flex items-center justify-between bg-inherit px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToday}
          className="inline-flex items-center rounded-full border border-gray-400 px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200"
        >
          Today
        </button>
        <div className="flex items-center rounded-full">
          <button
            type="button"
            onClick={() => onOffset("prev")}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOffset("next")}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-200"
            aria-label="Next period"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-900">{headerTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-2" ref={viewSwitcherRef}>
        <div className="relative">
          <button
            type="button"
            onClick={onToggleViewSwitcher}
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
              {(Object.keys(VIEW_LABELS) as CalendarViewType[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  role="option"
                  aria-selected={currentView === view}
                  onClick={() => onSelectView(view)}
                  className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  {VIEW_LABELS[view]}
                  <span className="text-xs text-gray-400">{VIEW_SHORTCUTS[view]}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
