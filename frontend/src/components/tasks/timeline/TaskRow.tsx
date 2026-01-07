'use client';

import { useRef, useState } from 'react';
import type { TaskData } from '@/types/task';
import { dateToX, getColumnWidth, toDate, widthFromRange } from './timelineUtils';
import type { TimelineColumn, TimelineScale } from './timelineUtils';

const TYPE_STYLES: Record<string, { dot: string; bar: string }> = {
  budget: { dot: 'bg-purple-500', bar: 'bg-purple-400/80' },
  asset: { dot: 'bg-indigo-500', bar: 'bg-indigo-400/80' },
  retrospective: { dot: 'bg-orange-500', bar: 'bg-orange-400/80' },
  report: { dot: 'bg-blue-500', bar: 'bg-blue-400/80' },
  other: { dot: 'bg-gray-400', bar: 'bg-gray-300/80' },
};

interface TaskRowProps {
  task: TaskData;
  columns: TimelineColumn[];
  rangeStart: Date;
  rangeEnd: Date;
  scale: TimelineScale;
  leftColumnWidth?: number;
  onTaskClick?: (task: TaskData) => void;
  onDragStart?: (taskId: number) => void;
  onTaskMove?: (task: TaskData, deltaX: number) => void;
  onReorder?: (draggedId: number, targetId: number, position: 'before' | 'after') => void;
}

const TaskRow = ({
  task,
  columns,
  rangeStart,
  rangeEnd,
  scale,
  leftColumnWidth = 280,
  onTaskClick,
  onDragStart,
  onTaskMove,
  onReorder,
}: TaskRowProps) => {
  const dragStartX = useRef<number | null>(null);
  const [hoverPos, setHoverPos] = useState<'before' | 'after' | null>(null);
  const columnWidth = getColumnWidth(scale);
  const gridWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const startDate = toDate(task.start_date) || toDate(task.due_date) || rangeStart;
  const endDate = toDate(task.due_date) || toDate(task.start_date) || rangeEnd;
  const minDurationMs = scale === 'today' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const safeEnd = endDate.getTime() < startDate.getTime() ? new Date(startDate.getTime() + minDurationMs) : endDate;
  const left = dateToX(startDate, rangeStart, rangeEnd, columns);
  const width = widthFromRange(startDate, safeEnd, rangeStart, rangeEnd, columns, 10);
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

        console.log('drop', draggedId, 'on', task.id, 'position', hoverPos, 'projects', draggedProjectId, '->', targetProjectId);

        if (draggedProjectId !== targetProjectId) {
          console.warn('Cross-project reorder blocked');
          setHoverPos(null);
          return;
        }

        if (task.id && !Number.isNaN(draggedId) && draggedId !== task.id && hoverPos) {
          onReorder?.(draggedId, task.id, hoverPos);
        }
        setHoverPos(null);
      }}
    >
      {/* Drop position indicators */}
      {hoverPos === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500 z-10" />
      )}
      {hoverPos === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500 z-10" />
      )}
      <button
        type="button"
        onClick={() => onTaskClick?.(task)}
        className="flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        <span className="mr-2 cursor-grab text-gray-400 select-none">☰</span>
        <span className={`h-2 w-2 rounded-full ${typeStyle.dot}`} />
        <span className="truncate font-medium">{task.summary}</span>

        {/* Type badge */}
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
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          {task.type || 'other'}
        </span>

        {/* Status badge */}
        <span className="ml-1 rounded px-2 py-0.5 text-[10px] font-semibold bg-gray-100 text-gray-700">
          {task.status?.replace('_', ' ') || 'N/A'}
        </span>
      </button>
      <div className="overflow-x-auto">
        <div
          className="relative flex items-center"
          style={{
            minWidth: gridWidth || columnWidth,
            backgroundImage: 'linear-gradient(to right, rgba(148, 163, 184, 0.2) 1px, transparent 1px)',
            backgroundSize: `${columnWidth}px 100%`,
          }}
        >
          <div
            data-testid={`task-bar-${task.id}`}
            className={`absolute top-1/2 h-4 -translate-y-1/2 rounded-full shadow-sm transition-shadow hover:shadow-md ${typeStyle.bar} bg-gradient-to-r from-white/40 to-transparent`}
            style={{ left, width }}
            draggable={!!task.id}
            onDragStart={(e) => {
              if (!task.id) {
                e.preventDefault();
                return;
              }
              e.stopPropagation(); // 关键：阻止触发整行拖拽
              e.dataTransfer.setData('application/task-date-move', String(task.id));
              dragStartX.current = e.clientX;
              e.dataTransfer.effectAllowed = 'move';
              onDragStart?.(task.id);
            }}
            onDragEnd={(event) => {
              if (dragStartX.current === null) return;
              // Only update date if dropped on timeline (not on another task row)
              const delta = event.clientX - dragStartX.current;
              if (Math.abs(delta) > 5) { // Only if moved significantly
                onTaskMove?.(task, delta);
              }
              dragStartX.current = null;
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskRow;
