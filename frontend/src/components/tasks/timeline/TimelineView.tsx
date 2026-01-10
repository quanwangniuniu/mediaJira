'use client';

import { useMemo, useState, useEffect } from 'react';
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { TaskData } from '@/types/task';
import TimelineHeader from './TimelineHeader';
import TimelineGrid from './TimelineGrid';
import TaskRow from './TaskRow';
import { buildTimelineColumns, toDate, dateToX, widthFromRange } from './timelineUtils';
import type { TimelineScale } from './timelineUtils';
import { TaskAPI } from '@/lib/api/taskApi';

interface TimelineViewProps {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
  reloadTasks?: () => Promise<void>;
  onCreateTask?: (projectId: number | null) => void;
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

const TimelineView = ({ tasks, onTaskClick, reloadTasks, onCreateTask }: TimelineViewProps) => {
  const [scale, setScale] = useState<TimelineScale>('week');
  const initialRange = useMemo(() => normalizeRange(...Object.values(getDefaultRange('week')) as [Date, Date]), []);
  const [rangeStart, setRangeStart] = useState(initialRange.start);
  const [rangeEnd, setRangeEnd] = useState(initialRange.end);
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [leftColumnWidth, setLeftColumnWidth] = useState(280);
  const [userResizedLeftColumn, setUserResizedLeftColumn] = useState(false);
  const minLeftWidth = 200;
  const maxLeftWidth = 520;

  const columns = useMemo(
    () => buildTimelineColumns(rangeStart, rangeEnd, scale),
    [rangeStart, rangeEnd, scale]
  );

  // Group by project only (no parent-child hierarchy)
  const groupedProjects = useMemo(() => {
    const map = new Map<string, { key: string; label: string; tasks: TaskData[]; projectId: number | null }>();

    tasks.forEach((task) => {
      const projectId = task.project?.id ?? task.project_id ?? null;
      const key = projectId ? `project-${projectId}` : 'project-none';
      const label = task.project?.name || (projectId ? `Project ${projectId}` : 'No Project');

      const existing = map.get(key) ?? { key, label, tasks: [], projectId };
      existing.tasks.push(task);
      map.set(key, existing);
    });

    // Sort tasks within each project by order_in_project
    const projects = Array.from(map.values());
    projects.forEach((project) => {
      project.tasks.sort((a, b) => {
        const aOrder = a.order_in_project ?? 0;
        const bOrder = b.order_in_project ?? 0;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (a.id ?? 0) - (b.id ?? 0);
      });
    });

    return projects.sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks]);

  // Calculate preferred left column width based on content
  const preferredLeftWidth = useMemo(() => {
    const projectLabels = groupedProjects.map(p => p.label);
    const taskLabels = tasks.map(t => t.summary ?? '');
    const allLabels = [...projectLabels, ...taskLabels];
    const longestLabelLength = allLabels.reduce((max, label) => Math.max(max, label.length), 0);
    
    // Estimate width: character width * 8 + padding for badges/icons (160px)
    const estimatedWidth = longestLabelLength * 8 + 160;
    
    // Clamp between min and max, but ensure at least 280
    return Math.min(maxLeftWidth, Math.max(minLeftWidth, Math.max(estimatedWidth, 280)));
  }, [groupedProjects, tasks, minLeftWidth, maxLeftWidth]);

  // Update left column width if user hasn't manually resized
  useEffect(() => {
    if (!userResizedLeftColumn) {
      setLeftColumnWidth(preferredLeftWidth);
    }
  }, [preferredLeftWidth, userResizedLeftColumn]);

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

  const handleTaskMove = async (task: TaskData, deltaX: number) => {
    if (!task.id) return;

    const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
    if (!totalWidth) return;

    const start = toDate(task.start_date) || toDate(task.due_date) || rangeStart;
    const end = toDate(task.due_date) || toDate(task.start_date) || rangeEnd;

    const totalMs = rangeEnd.getTime() - rangeStart.getTime();
    const deltaMs = (deltaX / totalWidth) * totalMs;

    const nextStart = new Date(start.getTime() + deltaMs);
    const nextEnd = new Date(end.getTime() + deltaMs);

    try {
      await TaskAPI.updateTask(task.id, {
        start_date: nextStart.toISOString().slice(0, 10),
        due_date: nextEnd.toISOString().slice(0, 10),
      });
      if (reloadTasks) {
        await reloadTasks();
      }
    } catch (e) {
      console.error('Failed to update task dates', e);
    }
  };

  const getTaskRange = (task: TaskData) => {
    const start = toDate(task.start_date) || toDate(task.due_date) || rangeStart;
    const end = toDate(task.due_date) || toDate(task.start_date) || rangeEnd;
    const minDuration = scale === 'today' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const safeEnd = end.getTime() < start.getTime() ? new Date(start.getTime() + minDuration) : end;
    return { start, end: safeEnd };
  };

  const handleReorder = async (
    draggedId: number,
    targetId: number,
    list: TaskData[],
    position: 'before' | 'after'
  ) => {
    const next = [...list];
    const from = next.findIndex((t) => t.id === draggedId);
    const to = next.findIndex((t) => t.id === targetId);

    console.log('reorder', { draggedId, targetId, from, to, position, listLength: list.length });

    if (from < 0 || to < 0 || from === to) {
      console.warn('Reorder skipped: invalid indices', { from, to });
      return;
    }

    const [moved] = next.splice(from, 1);
    const insertIndex = position === 'before' ? to : to + 1;
    next.splice(insertIndex > from ? insertIndex - 1 : insertIndex, 0, moved);

    try {
      await Promise.all(
        next.map((t, idx) =>
          t.id ? TaskAPI.updateTask(t.id, { order_in_project: idx }) : Promise.resolve()
        )
      );
    } catch (e) {
      console.error('Reorder failed', e);
    } finally {
      if (reloadTasks) {
        await reloadTasks();
      }
    }
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

      <div className="relative">
        <TimelineGrid columns={columns} leftColumnWidth={leftColumnWidth}>
          {groupedProjects.map((project) => {
          const collapsed = !!collapsedProjects[project.key];

          const taskRanges = project.tasks.map(getTaskRange);
          const projectStart = taskRanges.reduce(
            (min, r) => (r.start < min ? r.start : min),
            taskRanges[0]?.start ?? rangeStart
          );
          const projectEnd = taskRanges.reduce(
            (max, r) => (r.end > max ? r.end : max),
            taskRanges[0]?.end ?? rangeEnd
          );
          const projectLeft = dateToX(projectStart, rangeStart, rangeEnd, columns);
          const projectWidth = widthFromRange(projectStart, projectEnd, rangeStart, rangeEnd, columns, 24);

          return (
            <div key={project.key} className="border-b border-gray-200">
              {/* Project row with timeline bar */}
              <div
                className="grid items-stretch bg-gray-100"
                style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
              >
                <div className="px-4 py-2 text-xs font-semibold text-gray-600 flex items-center">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedProjects((prev) => ({
                        ...prev,
                        [project.key]: !prev[project.key],
                      }))
                    }
                    className="mr-2 text-gray-500"
                  >
                    {collapsed ? '▸' : '▾'}
                  </button>
                  {project.label}
                  {/* 加任务按钮（项目级）- 只在有 projectId 时显示 */}
                  {project.projectId && (
                    <button
                      className="ml-auto text-indigo-600 text-sm"
                      onClick={() => onCreateTask?.(project.projectId)}
                    >
                      +
                    </button>
                  )}
                </div>
                <div className="relative overflow-x-auto">
                  <div className="relative flex items-center" style={{ minWidth: columns.reduce((s, c) => s + c.width, 0) }}>
                    <div
                      className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-indigo-200 to-indigo-300 shadow-sm"
                      style={{ left: projectLeft, width: projectWidth }}
                    />
                  </div>
                </div>
              </div>

              {/* Task rows */}
              {!collapsed && (() => {
                const sortedTasks = [...project.tasks].sort((a, b) => {
                  const aOrder = a.order_in_project ?? 0;
                  const bOrder = b.order_in_project ?? 0;
                  if (aOrder !== bOrder) return aOrder - bOrder;
                  return (a.id ?? 0) - (b.id ?? 0);
                });

                return (
                  <div className="divide-y divide-gray-200">
                    {sortedTasks.map((task) => (
                      <TaskRow
                        key={task.id || task.summary}
                        task={task}
                        columns={columns}
                        rangeStart={rangeStart}
                        rangeEnd={rangeEnd}
                        scale={scale}
                        leftColumnWidth={leftColumnWidth}
                        onTaskClick={onTaskClick}
                        onTaskMove={handleTaskMove}
                        onReorder={(draggedId, targetId, position) =>
                          handleReorder(draggedId, targetId, sortedTasks, position)
                        }
                        onDelete={async () => {
                          if (reloadTasks) await reloadTasks();
                        }}
                      />
                    ))}
                  </div>
                );
              })()}
            </div>
          );
        })}
        </TimelineGrid>

        {/* Drag handle */}
        <div
          className="absolute top-[46px] bottom-0"
          style={{ left: leftColumnWidth - 2, width: 6, cursor: 'col-resize' }}
          onMouseDown={(e) => {
            e.preventDefault();
            setUserResizedLeftColumn(true);
            const startX = e.clientX;
            const startWidth = leftColumnWidth;

            const onMove = (ev: MouseEvent) => {
              const next = Math.min(maxLeftWidth, Math.max(minLeftWidth, startWidth + (ev.clientX - startX)));
              setLeftColumnWidth(next);
            };

            const onUp = () => {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mouseup', onUp);
            };

            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
          }}
        />
      </div>
    </div>
  );
};

export default TimelineView;
