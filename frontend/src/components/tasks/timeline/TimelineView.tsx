'use client';

import { useMemo, useState } from 'react';
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { TaskData } from '@/types/task';
import TimelineHeader from './TimelineHeader';
import TimelineGrid from './TimelineGrid';
import LongStoryRow from './LongStoryRow';
import TaskRow from './TaskRow';
import { buildTimelineColumns, toDate } from './timelineUtils';
import type { TimelineScale } from './timelineUtils';

interface TimelineViewProps {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
}

// Color mapping for different projects 
const GROUP_COLORS = [
  'bg-blue-200',
  'bg-emerald-200',
  'bg-amber-200',
  'bg-rose-200',
  'bg-sky-200',
  'bg-lime-200',
  'bg-orange-200',
  'bg-teal-200',
];

const getGroupColor = (key: string) => {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % GROUP_COLORS.length;
  }
  return GROUP_COLORS[hash];
};

const getDefaultRange = (scale: TimelineScale) => {
  const today = new Date();
  if (scale === 'today') {
    return {
      start: startOfDay(today),
      end: endOfDay(today),
    };
  }

  if (scale === 'week') {
    const start = startOfWeek(today, { weekStartsOn: 1 });
    return { start, end: addDays(start, 6) };
  }

  const start = startOfMonth(today);
  return { start, end: endOfMonth(today) };
};

const normalizeRange = (start: Date, end: Date) => ({
  start: startOfDay(start),
  end: endOfDay(end),
});

const TimelineView = ({ tasks, onTaskClick }: TimelineViewProps) => {
  const [scale, setScale] = useState<TimelineScale>('week');
  const initialRange = useMemo(() => normalizeRange(...Object.values(getDefaultRange('week')) as [Date, Date]), []);
  const [rangeStart, setRangeStart] = useState(initialRange.start);
  const [rangeEnd, setRangeEnd] = useState(initialRange.end);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [groupOverrides, setGroupOverrides] = useState<Record<number, string>>({});

  const columns = useMemo(
    () => buildTimelineColumns(rangeStart, rangeEnd, scale),
    [rangeStart, rangeEnd, scale]
  );

  const groupedTasks = useMemo(() => {
    // Previous type (before color support):
    // const map = new Map<string, { key: string; label: string; tasks: TaskData[] }>();
    // New type: added color field to support different project colors
    const map = new Map<string, { key: string; label: string; tasks: TaskData[]; color: string }>();

    tasks.forEach((task) => {
      const projectId = task.project?.id ?? task.project_id ?? null;
      const baseKey =
        task.id && groupOverrides[task.id]
          ? groupOverrides[task.id]
          : projectId
          ? `project-${projectId}`
          : 'project-none';

      const label = task.project?.name || (projectId ? `Campaign ${projectId}` : 'No Campaign');

      // Previous logic (before color support):
      // const existing = map.get(baseKey) ?? { key: baseKey, label, tasks: [] };
      // New logic: added color field using getGroupColor function
      const existing = map.get(baseKey) ?? { key: baseKey, label, tasks: [], color: getGroupColor(baseKey) };
      existing.tasks.push(task);
      map.set(baseKey, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks, groupOverrides]);

  const handleScaleChange = (nextScale: TimelineScale) => {
    setScale(nextScale);
    const nextRange = normalizeRange(...Object.values(getDefaultRange(nextScale)) as [Date, Date]);
    setRangeStart(nextRange.start);
    setRangeEnd(nextRange.end);
  };

  const handleRangeChange = (start: Date, end: Date) => {
    const nextRange = normalizeRange(start, end);
    setRangeStart(nextRange.start);
    setRangeEnd(nextRange.end);
  };

  const handleToggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleDropTask = (taskId: number, groupId: string) => {
    setGroupOverrides((prev) => ({
      ...prev,
      [taskId]: groupId,
    }));
  };

  const getTaskRange = (task: TaskData) => {
    const start = toDate(task.start_date) || toDate(task.due_date) || rangeStart;
    const end = toDate(task.due_date) || toDate(task.start_date) || rangeEnd;
    const minDuration = scale === 'today' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const safeEnd = end.getTime() < start.getTime() ? new Date(start.getTime() + minDuration) : end;
    return { start, end: safeEnd };
  };

  return (
    <div className="flex flex-col gap-4">
      <TimelineHeader
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        scale={scale}
        onRangeChange={handleRangeChange}
        onScaleChange={handleScaleChange}
      />

      <div className="text-xs text-gray-500">
        Version1 
      </div>

      <TimelineGrid columns={columns}>
        {groupedTasks.map((group) => {
          const collapsed = !!collapsedGroups[group.key];
          const ranges = group.tasks.map(getTaskRange);
          const groupStart = ranges.length ? ranges.reduce((min, range) => (range.start < min ? range.start : min), ranges[0].start) : rangeStart;
          const groupEnd = ranges.length ? ranges.reduce((max, range) => (range.end > max ? range.end : max), ranges[0].end) : rangeEnd;

          return (
            <div key={group.key}>
              <LongStoryRow
                groupId={group.key}
                label={group.label}
                taskCount={group.tasks.length}
                collapsed={collapsed}
                onToggle={() => handleToggleGroup(group.key)}
                columns={columns}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                groupStart={groupStart}
                groupEnd={groupEnd}
                scale={scale}
                onDropTask={handleDropTask}
                // Previous: no groupColor prop (used default bg-indigo-100)
                // New: pass group color to support different project colors
                groupColor={group.color}
              />
              {!collapsed && (
                <div className="divide-y divide-gray-200">
                  {group.tasks.map((task) => (
                    <TaskRow
                      key={task.id || task.summary}
                      task={task}
                      columns={columns}
                      rangeStart={rangeStart}
                      rangeEnd={rangeEnd}
                      scale={scale}
                      onTaskClick={onTaskClick}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </TimelineGrid>
    </div>
  );
};

export default TimelineView;
