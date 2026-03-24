import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
  AgendaView,
  DayView,
  MonthView,
  WeekView,
  YearView,
} from "@/components/calendar/CalendarViews";
import type { CalendarDTO, EventDTO } from "@/lib/api/calendarApi";
import {
  getSampleCalendars,
  getSampleEvents,
} from "@/stories/calendar/calendarData";

const meta: Meta = {
  title: "Calendar/Views",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    currentDate: {
      control: "date",
      description: "The date to display",
    },
    isLoading: {
      control: "boolean",
      description: "Loading state",
    },
    hasError: {
      control: "boolean",
      description: "Show error state",
    },
  },
};

export default meta;

type ViewStoryArgs = {
  currentDate: number;
  isLoading?: boolean;
  hasError?: boolean;
};
type Story = StoryObj<ViewStoryArgs>;

const frameClass = "flex-1 overflow-auto bg-white rounded-3xl mb-4";

function WeekViewStory(args: ViewStoryArgs) {
  const currentDate = new Date(args.currentDate);
  const [events, setEvents] = React.useState<EventDTO[]>(() =>
    getSampleEvents(currentDate),
  );
  const calendars = getSampleCalendars();

  React.useEffect(() => {
    setEvents(getSampleEvents(currentDate));
  }, [args.currentDate]);

  return (
    <div className={frameClass}>
      <WeekView
        currentDate={currentDate}
        events={events}
        calendars={calendars}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onTimeSlotClick={() => {}}
        onEventClick={() => {}}
        onEventTimeChange={async (event, start, end) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === event.id
                ? {
                    ...e,
                    start_datetime: start.toISOString(),
                    end_datetime: end.toISOString(),
                  }
                : e,
            ),
          );
        }}
      />
    </div>
  );
}

function DayViewStory(args: ViewStoryArgs) {
  const currentDate = new Date(args.currentDate);
  const [events, setEvents] = React.useState<EventDTO[]>(() =>
    getSampleEvents(currentDate),
  );
  const calendars = getSampleCalendars();

  React.useEffect(() => {
    setEvents(getSampleEvents(currentDate));
  }, [args.currentDate]);

  return (
    <div className={frameClass}>
      <DayView
        currentDate={currentDate}
        events={events}
        calendars={calendars}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onTimeSlotClick={() => {}}
        onEventClick={() => {}}
        onEventTimeChange={async (event, start, end) => {
          setEvents((prev) =>
            prev.map((e) =>
              e.id === event.id
                ? {
                    ...e,
                    start_datetime: start.toISOString(),
                    end_datetime: end.toISOString(),
                  }
                : e,
            ),
          );
        }}
      />
    </div>
  );
}

export const Week: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
  },
  render: (args) => <WeekViewStory {...args} />,
};

export const Day: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
  },
  render: (args) => <DayViewStory {...args} />,
};

export const Month: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
  },
  render: (args) => (
    <div className={frameClass}>
      <MonthView
        currentDate={new Date(args.currentDate)}
        events={getSampleEvents(new Date(args.currentDate))}
        calendars={getSampleCalendars()}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onDaySelect={() => {}}
        onEventClick={() => {}}
      />
    </div>
  ),
};

export const Year: Story = {
  args: {
    currentDate: Date.now(),
  },
  render: (args) => (
    <div className={frameClass}>
      <YearView
        currentDate={new Date(args.currentDate)}
        onDaySelect={() => {}}
      />
    </div>
  ),
};

export const Agenda: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
  },
  render: (args) => (
    <div className={frameClass}>
      <AgendaView
        currentDate={new Date(args.currentDate)}
        events={getSampleEvents(new Date(args.currentDate))}
        calendars={getSampleCalendars()}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onEventClick={() => {}}
      />
    </div>
  ),
};

export const WeekLoading: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: true,
    hasError: false,
  },
  render: (args) => <WeekViewStory {...args} />,
};

export const WeekError: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
    hasError: true,
  },
  render: (args) => <WeekViewStory {...args} />,
};

export const DayLoading: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: true,
    hasError: false,
  },
  render: (args) => <DayViewStory {...args} />,
};

export const DayError: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
    hasError: true,
  },
  render: (args) => <DayViewStory {...args} />,
};

export const MonthLoading: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: true,
    hasError: false,
  },
  render: (args) => (
    <div className={frameClass}>
      <MonthView
        currentDate={new Date(args.currentDate)}
        events={getSampleEvents(new Date(args.currentDate))}
        calendars={getSampleCalendars()}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onDaySelect={() => {}}
        onEventClick={() => {}}
      />
    </div>
  ),
};

export const MonthError: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
    hasError: true,
  },
  render: (args) => (
    <div className={frameClass}>
      <MonthView
        currentDate={new Date(args.currentDate)}
        events={getSampleEvents(new Date(args.currentDate))}
        calendars={getSampleCalendars()}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onDaySelect={() => {}}
        onEventClick={() => {}}
      />
    </div>
  ),
};

export const AgendaLoading: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: true,
    hasError: false,
  },
  render: (args) => (
    <div className={frameClass}>
      <AgendaView
        currentDate={new Date(args.currentDate)}
        events={getSampleEvents(new Date(args.currentDate))}
        calendars={getSampleCalendars()}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onEventClick={() => {}}
      />
    </div>
  ),
};

export const AgendaError: Story = {
  args: {
    currentDate: Date.now(),
    isLoading: false,
    hasError: true,
  },
  render: (args) => (
    <div className={frameClass}>
      <AgendaView
        currentDate={new Date(args.currentDate)}
        events={getSampleEvents(new Date(args.currentDate))}
        calendars={getSampleCalendars()}
        isLoading={args.isLoading ?? false}
        error={args.hasError ? new Error("Failed to load events.") : null}
        onEventClick={() => {}}
      />
    </div>
  ),
};
