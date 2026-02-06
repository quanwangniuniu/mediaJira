'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { addDays, endOfDay, endOfMonth, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { TaskData } from '@/types/task';
import TimelineHeader, {
  type TimelineFilterOption,
  type TimelineHeaderUser,
} from './TimelineHeader';
import TimelineGrid from './TimelineGrid';
import TaskRow from './TaskRow';
import { buildTimelineColumns, dateToX } from './timelineUtils';
import type { TimelineScale } from './timelineUtils';
import { TaskAPI } from '@/lib/api/taskApi';

type StatusCategoryFilter = 'all' | 'todo' | 'in_progress' | 'done' | 'other';

interface TimelineViewProps {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
  reloadTasks?: () => Promise<void>;
  onCreateTask?: (projectId: number | null) => void;
  currentUser?: TimelineHeaderUser;
}

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

const DONE_STATUSES = new Set([
  'APPROVED',
  'LOCKED',
  'DONE',
  'COMPLETED',
  'RESOLVED',
]);
const IN_PROGRESS_STATUSES = new Set([
  'SUBMITTED',
  'UNDER_REVIEW',
  'IN_REVIEW',
  'IN_PROGRESS',
  'REVIEW',
]);
const TODO_STATUSES = new Set(['DRAFT', 'REJECTED', 'CANCELLED', 'TODO', 'OPEN', 'BACKLOG']);

const STATUS_CATEGORY_OPTIONS: TimelineFilterOption[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'other', label: 'Other' },
];

const normalizeEpicLabel = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number') {
    return `Epic ${value}`;
  }
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const candidates = [
      source.name,
      source.title,
      source.label,
      source.key,
      source.summary,
      source.id,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeEpicLabel(candidate);
      if (normalized) return normalized;
    }
  }
  return null;
};

const getTaskEpicLabel = (task: TaskData): string => {
  const taskLike = task as TaskData & Record<string, unknown>;
  const linkedObject =
    taskLike.linked_object && typeof taskLike.linked_object === 'object'
      ? (taskLike.linked_object as Record<string, unknown>)
      : null;

  const candidates = [
    taskLike.epic,
    taskLike.epic_name,
    taskLike.epicName,
    taskLike.epic_key,
    taskLike.epicKey,
    linkedObject?.epic,
    linkedObject?.epic_name,
    linkedObject?.epicName,
    linkedObject?.epic_key,
    linkedObject?.epicKey,
  ];

  for (const candidate of candidates) {
    const label = normalizeEpicLabel(candidate);
    if (label) return label;
  }
  return 'No epic';
};

const getStatusCategory = (status?: string | null): Exclude<StatusCategoryFilter, 'all'> => {
  const normalized = (status || '').toUpperCase();
  if (DONE_STATUSES.has(normalized)) return 'done';
  if (IN_PROGRESS_STATUSES.has(normalized)) return 'in_progress';
  if (TODO_STATUSES.has(normalized)) return 'todo';
  return 'other';
};

const taskMatchesSearch = (task: TaskData, query: string) => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  const text = [
    task.id?.toString(),
    task.summary,
    task.description,
    task.type,
    task.status,
    task.project?.name,
    task.owner?.username,
    task.owner?.email,
    task.current_approver?.username,
    task.current_approver?.email,
    getTaskEpicLabel(task),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes(normalized);
};

const TimelineView = ({
  tasks,
  onTaskClick,
  reloadTasks,
  onCreateTask,
  currentUser,
}: TimelineViewProps) => {
  const [scale, setScale] = useState<TimelineScale>('week');
  const initialRange = useMemo(
    () => normalizeRange(...(Object.values(getDefaultRange('week')) as [Date, Date])),
    []
  );
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
  const [timelineSearchQuery, setTimelineSearchQuery] = useState('');
  const [selectedEpic, setSelectedEpic] = useState('all');
  const [selectedStatusCategory, setSelectedStatusCategory] =
    useState<StatusCategoryFilter>('all');

  const epicOptions = useMemo<TimelineFilterOption[]>(() => {
    const labels = Array.from(new Set(tasks.map((task) => getTaskEpicLabel(task)))).sort((a, b) =>
      a.localeCompare(b)
    );
    return [{ value: 'all', label: 'All epics' }, ...labels.map((label) => ({ value: label, label }))];
  }, [tasks]);

  useEffect(() => {
    if (!epicOptions.some((option) => option.value === selectedEpic)) {
      setSelectedEpic('all');
    }
  }, [epicOptions, selectedEpic]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const taskEpic = getTaskEpicLabel(task);
      if (selectedEpic !== 'all' && taskEpic !== selectedEpic) {
        return false;
      }

      const statusCategory = getStatusCategory(task.status);
      if (selectedStatusCategory !== 'all' && statusCategory !== selectedStatusCategory) {
        return false;
      }

      return taskMatchesSearch(task, timelineSearchQuery.trim());
    });
  }, [tasks, selectedEpic, selectedStatusCategory, timelineSearchQuery]);

  const columns = useMemo(
    () => buildTimelineColumns(rangeStart, rangeEnd, scale),
    [rangeStart, rangeEnd, scale]
  );
  const todayPosition = useMemo(() => {
    if (!columns.length) return null;
    const today = new Date();
    if (today < rangeStart || today > rangeEnd) return null;
    return dateToX(today, rangeStart, rangeEnd, columns);
  }, [columns, rangeStart, rangeEnd]);

  const groupedProjects = useMemo(() => {
    const map = new Map<string, { key: string; label: string; tasks: TaskData[]; projectId: number | null }>();

    filteredTasks.forEach((task) => {
      const projectId = task.project?.id ?? task.project_id ?? null;
      const key = projectId ? `project-${projectId}` : 'project-none';
      const label = task.project?.name || (projectId ? `Project ${projectId}` : 'No Project');

      const existing = map.get(key) ?? { key, label, tasks: [], projectId };
      existing.tasks.push(task);
      map.set(key, existing);
    });

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
  }, [filteredTasks]);

  const preferredLeftWidth = useMemo(() => {
    const projectLabels = groupedProjects.map((p) => p.label);
    const taskLabels = filteredTasks.map((t) => t.summary ?? '');
    const allLabels = [...projectLabels, ...taskLabels];
    const longestLabelLength = allLabels.reduce((max, label) => Math.max(max, label.length), 0);
    const estimatedWidth = longestLabelLength * 8 + 160;
    return Math.min(maxLeftWidth, Math.max(minLeftWidth, Math.max(estimatedWidth, 280)));
  }, [groupedProjects, filteredTasks, minLeftWidth, maxLeftWidth]);

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
    const nextRange = normalizeRange(...(Object.values(getDefaultRange(nextScale)) as [Date, Date]));
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

    if (from < 0 || to < 0 || from === to) {
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
    <div className="flex flex-col gap-3">
      <TimelineHeader
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        scale={scale}
        searchValue={timelineSearchQuery}
        onSearchChange={setTimelineSearchQuery}
        epicOptions={epicOptions}
        selectedEpic={selectedEpic}
        onEpicChange={setSelectedEpic}
        statusOptions={STATUS_CATEGORY_OPTIONS}
        selectedStatusCategory={selectedStatusCategory}
        onStatusCategoryChange={(value) => setSelectedStatusCategory(value as StatusCategoryFilter)}
        currentUser={currentUser}
        onRangeChange={handleRangeChange}
        onScaleChange={handleScaleChange}
      />

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
        <TimelineGrid
          columns={columns}
          leftColumnWidth={leftColumnWidth}
          todayPosition={todayPosition}
        >
          {groupedProjects.map((project) => {
            const collapsed = !!collapsedProjects[project.key];

            return (
              <div key={project.key} className="border-b border-slate-200">
                <div
                  className="grid items-stretch bg-slate-50"
                  style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
                >
                  <div className="px-3 py-2 text-xs font-semibold text-slate-600 flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedProjects((prev) => ({
                          ...prev,
                          [project.key]: !prev[project.key],
                        }))
                      }
                      className="mr-2 text-slate-500"
                      aria-label={
                        collapsed
                          ? `Expand project ${project.label}`
                          : `Collapse project ${project.label}`
                      }
                    >
                      {collapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <span
                      className="truncate"
                      style={{ maxWidth: Math.max(120, leftColumnWidth - 90) }}
                      title={project.label}
                    >
                      {project.label}
                    </span>
                    {project.projectId && (
                      <button
                        className="ml-auto text-blue-600 text-sm"
                        onClick={() => onCreateTask?.(project.projectId)}
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div className="relative overflow-x-auto scrollbar-hide" data-timeline-scroll>
                    <div
                      className="relative flex items-center"
                      style={{ minWidth: columns.reduce((s, c) => s + c.width, 0) }}
                    />
                  </div>
                </div>

                {!collapsed && (() => {
                  const sortedTasks = [...project.tasks].sort((a, b) => {
                    const aOrder = a.order_in_project ?? 0;
                    const bOrder = b.order_in_project ?? 0;
                    if (aOrder !== bOrder) return aOrder - bOrder;
                    return (a.id ?? 0) - (b.id ?? 0);
                  });

                  return (
                    <div className="divide-y divide-slate-200">
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
