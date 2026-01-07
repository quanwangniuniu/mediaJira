'use client';

import type { TaskData } from '@/types/task';
import { dateToX, getColumnWidth, toDate, widthFromRange } from './timelineUtils';
import type { TimelineColumn, TimelineScale } from './timelineUtils';

const TYPE_STYLES: Record<string, { dot: string; bar: string }> = {
  budget: { dot: 'bg-purple-500', bar: 'bg-purple-500/80' },
  asset: { dot: 'bg-indigo-500', bar: 'bg-indigo-500/80' },
  retrospective: { dot: 'bg-orange-500', bar: 'bg-orange-500/80' },
  report: { dot: 'bg-blue-500', bar: 'bg-blue-500/80' },
  other: { dot: 'bg-gray-400', bar: 'bg-gray-400/70' },
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
}: TaskRowProps) => {
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
      className="grid items-stretch"
      style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
    >
      <button
        type="button"
        onClick={() => onTaskClick?.(task)}
        className="flex items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        <span className={`h-2 w-2 rounded-full ${typeStyle.dot}`} />
        <span className="truncate font-medium">{task.summary}</span>
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
            className={`absolute top-1/2 h-4 -translate-y-1/2 rounded-full ${typeStyle.bar}`}
            style={{ left, width }}
            draggable={!!task.id}
            onDragStart={(event) => {
              if (!task.id) return;
              event.dataTransfer.setData('text/plain', String(task.id));
              event.dataTransfer.effectAllowed = 'move';
              onDragStart?.(task.id);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskRow;
