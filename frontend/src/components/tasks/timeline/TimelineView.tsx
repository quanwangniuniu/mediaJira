'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import type { TaskData } from '@/types/task';
import TimelineHeader from './TimelineHeader';
import TimelineGrid from './TimelineGrid';
import TaskRow from './TaskRow';
import { buildTimelineColumns } from './timelineUtils';
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
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const isSyncingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartXRef = useRef(0);
  const panStartScrollRef = useRef(0);

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

  useEffect(() => {
    const container = timelineRef.current;
    if (!container) return;
    const scrollEls = Array.from(container.querySelectorAll<HTMLElement>('[data-timeline-scroll]'));
    if (!scrollEls.length) return;

    const handleScroll = (source: HTMLElement) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const nextLeft = source.scrollLeft;
      scrollEls.forEach((el) => {
        if (el !== source && el.scrollLeft !== nextLeft) {
          el.scrollLeft = nextLeft;
        }
      });
      requestAnimationFrame(() => {
        isSyncingRef.current = false;
      });
    };

    const listeners = scrollEls.map((el) => {
      const onScroll = () => handleScroll(el);
      el.addEventListener('scroll', onScroll, { passive: true });
      return () => el.removeEventListener('scroll', onScroll);
    });

    return () => {
      listeners.forEach((cleanup) => cleanup());
    };
  }, [columns.length, groupedProjects.length]);

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

      <div
        className="relative"
        ref={timelineRef}
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          const target = event.target as HTMLElement;
          if (target.closest('button, a, input, textarea, select, [data-no-pan]')) return;
          if (!target.closest('[data-timeline-scroll]')) return;

          const scrollEl = timelineRef.current?.querySelector<HTMLElement>('[data-timeline-scroll]');
          if (!scrollEl) return;

          isPanningRef.current = true;
          panStartXRef.current = event.clientX;
          panStartScrollRef.current = scrollEl.scrollLeft;

          const onMove = (moveEvent: MouseEvent) => {
            if (!isPanningRef.current) return;
            const delta = moveEvent.clientX - panStartXRef.current;
            const nextLeft = Math.max(0, panStartScrollRef.current - delta);
            const scrollEls = timelineRef.current?.querySelectorAll<HTMLElement>('[data-timeline-scroll]') ?? [];
            scrollEls.forEach((el) => {
              el.scrollLeft = nextLeft;
            });
          };

          const onUp = () => {
            isPanningRef.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };

          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        }}
      >
        <TimelineGrid columns={columns} leftColumnWidth={leftColumnWidth}>
          {groupedProjects.map((project) => {
          const collapsed = !!collapsedProjects[project.key];

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
                  <span
                    className="truncate"
                    style={{ maxWidth: Math.max(120, leftColumnWidth - 90) }}
                    title={project.label}
                  >
                    {project.label}
                  </span>
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
                <div className="relative overflow-x-auto scrollbar-hide" data-timeline-scroll>
                  <div className="relative flex items-center" style={{ minWidth: columns.reduce((s, c) => s + c.width, 0) }} />
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

        {/* Resize handle */}
        <div
          className="timeline-resize-handle"
          style={{ left: leftColumnWidth - 1 }}
          data-no-pan
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
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
          onDoubleClick={() => {
            setUserResizedLeftColumn(false);
            setLeftColumnWidth(preferredLeftWidth);
          }}
        />
      </div>
    </div>
  );
};

export default TimelineView;
