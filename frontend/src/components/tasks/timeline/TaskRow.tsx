'use client';

import { useState } from 'react';
import { addDays, addHours } from 'date-fns';
import { CheckSquare, GripVertical, Square, X } from 'lucide-react';
import type { TaskData } from '@/types/task';
import { dateToX, getColumnWidth, toDate, widthFromRange } from './timelineUtils';
import type { TimelineColumn, TimelineScale } from './timelineUtils';
import { TaskAPI } from '@/lib/api/taskApi';

const TYPE_STYLES: Record<string, { dot: string }> = {
  budget: { dot: 'bg-purple-500' },
  asset: { dot: 'bg-indigo-500' },
  retrospective: { dot: 'bg-orange-500' },
  report: { dot: 'bg-blue-500' },
  scaling: { dot: 'bg-green-500' },
  alert: { dot: 'bg-red-500' },
  experiment: { dot: 'bg-amber-500' },
  other: { dot: 'bg-slate-400' },
};

interface TaskRowProps {
  task: TaskData;
  columns: TimelineColumn[];
  rangeStart: Date;
  rangeEnd: Date;
  scale: TimelineScale;
  leftColumnWidth?: number;
  onTaskClick?: (task: TaskData) => void;
  onReorder?: (draggedId: number, targetId: number, position: 'before' | 'after') => void;
  onDelete?: (taskId: number) => void;
}

const TaskRow = ({
  task,
  columns,
  rangeStart,
  rangeEnd,
  scale,
  leftColumnWidth = 280,
  onTaskClick,
  onReorder,
  onDelete,
}: TaskRowProps) => {
  const [hoverPos, setHoverPos] = useState<'before' | 'after' | null>(null);
  const columnWidth = getColumnWidth(scale);
  const gridWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const startDateRaw = toDate(task.start_date);
  const endDateRaw = toDate(task.due_date);
  const hasBothDates = Boolean(startDateRaw && endDateRaw);
  const defaultDuration = (() => {
    if (scale === 'today') return addHours(rangeStart, 4);
    if (scale === 'week') return addDays(rangeStart, 3);
    return addDays(rangeStart, 14);
  })();
  const fallbackStart = (() => {
    const rangeMs = rangeEnd.getTime() - rangeStart.getTime();
    if (rangeMs <= 0) return rangeStart;
    return new Date(rangeStart.getTime() + rangeMs * 0.2);
  })();

  let startDate = startDateRaw || null;
  let endDate = endDateRaw || null;

  if (startDateRaw && !endDateRaw) {
    endDate = scale === 'today' ? addHours(startDateRaw, 4) : addDays(startDateRaw, scale === 'week' ? 3 : 14);
  }
  if (!startDateRaw && endDateRaw) {
    startDate = scale === 'today' ? addHours(endDateRaw, -4) : addDays(endDateRaw, scale === 'week' ? -3 : -14);
  }
  if (!startDateRaw && !endDateRaw) {
    startDate = fallbackStart;
    endDate = defaultDuration;
  }

  startDate = startDate || rangeStart;
  endDate = endDate || rangeEnd;
  const minDurationMs = scale === 'today' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const safeEnd = endDate.getTime() < startDate.getTime() ? new Date(startDate.getTime() + minDurationMs) : endDate;
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const width = widthFromRange(startDate, safeEnd, rangeStart, rangeEnd, columns, 10);
  const left = dateToX(startDate, rangeStart, rangeEnd, columns);
  const typeKey = task.type || 'other';
  const typeStyle = TYPE_STYLES[typeKey] || TYPE_STYLES.other;

  return (
    <div
      className="grid items-stretch relative"
      style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
      draggable={!!task.id}
      onDragStart={(e) => {
        if (!task.id) return;
        e.dataTransfer.setData('text/plain', String(task.id));
        e.dataTransfer.setData('application/task-project', String(task.project?.id ?? task.project_id ?? ''));
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        setHoverPos(e.clientY < mid ? 'before' : 'after');
      }}
      onDragLeave={() => setHoverPos(null)}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = Number(e.dataTransfer.getData('text/plain'));
        const draggedProjectId = e.dataTransfer.getData('application/task-project');
        const targetProjectId = String(task.project?.id ?? task.project_id ?? '');

        if (draggedProjectId !== targetProjectId) {
          setHoverPos(null);
          return;
        }

        if (task.id && !Number.isNaN(draggedId) && draggedId !== task.id && hoverPos) {
          onReorder?.(draggedId, task.id, hoverPos);
        }
        setHoverPos(null);
      }}
    >
      {hoverPos === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500 z-10" />
      )}
      {hoverPos === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 z-10" />
      )}
      <div className="flex items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 group">
        <button
          type="button"
          onClick={() => onTaskClick?.(task)}
          className="flex items-center gap-2 flex-1 min-w-0 hover:bg-slate-50 -ml-2 -mr-2 px-2 py-1 rounded"
        >
          <span className="text-slate-400">
            <GripVertical className="h-4 w-4" />
          </span>
          <span className="text-slate-400">
            {task.status?.toLowerCase() === 'done' ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
          </span>
          <span className={`h-2 w-2 rounded-full ${typeStyle.dot}`} />
          <span
            className="truncate font-medium"
            style={{ maxWidth: Math.max(120, leftColumnWidth - 220) }}
            title={task.summary}
          >
            {task.summary}
          </span>
          <span
            className={`ml-2 rounded px-2 py-0.5 text-[10px] font-semibold ${
              task.type === 'report'
                ? 'bg-blue-100 text-blue-700'
                : task.type === 'asset'
                ? 'bg-indigo-100 text-indigo-700'
                : task.type === 'retrospective'
                ? 'bg-orange-100 text-orange-700'
                : task.type === 'budget'
                ? 'bg-purple-100 text-purple-700'
                : task.type === 'scaling'
                ? 'bg-green-100 text-green-700'
                : task.type === 'alert'
                ? 'bg-red-100 text-red-700'
                : task.type === 'experiment'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {task.type || 'other'}
          </span>
          <span className="ml-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700">
            {task.status?.replace('_', ' ') || 'N/A'}
          </span>
        </button>

        {task.id && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation();
              if (!task.id) return;
              if (!window.confirm(`Delete task #${task.id} "${task.summary}"?`)) return;
              try {
                await TaskAPI.deleteTask(task.id);
                onDelete?.(task.id);
              } catch (error) {
                console.error('Failed to delete task:', error);
                alert('Failed to delete task. Please try again.');
              }
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
            title="Delete task"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className="relative overflow-x-auto overflow-y-visible scrollbar-hide"
        data-timeline-scroll
      >
        <div
          className="relative flex h-11 items-center"
          style={{ minWidth: gridWidth || columnWidth }}
        >
          <div
            data-testid={`task-bar-${task.id}`}
            className="absolute top-1/2 h-[18px] -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,_#E9D5FF_0%,_#A855F7_100%)] shadow-[0_2px_6px_rgba(120,80,200,0.18)] z-10"
            style={{ left, width }}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskRow;
