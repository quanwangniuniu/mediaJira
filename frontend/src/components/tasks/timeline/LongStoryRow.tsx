'use client';

import { useState } from 'react';
import { dateToX, getColumnWidth, widthFromRange } from './timelineUtils';
import type { TimelineColumn, TimelineScale } from './timelineUtils';
import SubtaskModal from '@/components/tasks/SubtaskModal';

interface LongStoryRowProps {
  groupId: string;
  label: string;
  taskCount: number;
  collapsed: boolean;
  onToggle: () => void;
  columns: TimelineColumn[];
  rangeStart: Date;
  rangeEnd: Date;
  groupStart: Date;
  groupEnd: Date;
  scale: TimelineScale;
  leftColumnWidth?: number;
  onDropTask?: (taskId: number, parentTaskId: string) => void;
  parentTaskId?: number;
  parentTaskProjectId?: number;
  onSubtaskAdded?: () => void;
  groupColor?: string;
}

const LongStoryRow = ({
  groupId,
  label,
  taskCount,
  collapsed,
  onToggle,
  columns,
  rangeStart,
  rangeEnd,
  groupStart,
  groupEnd,
  scale,
  leftColumnWidth = 280,
  onDropTask,
  parentTaskId,
  parentTaskProjectId,
  onSubtaskAdded,
  // Previous: fixed color 'bg-indigo-100' for all groups
  // New: default to 'bg-indigo-100' but allow custom color per group
  groupColor = 'bg-indigo-100',
}: LongStoryRowProps) => {
  const [isSubtaskModalOpen, setIsSubtaskModalOpen] = useState(false);
  const columnWidth = getColumnWidth(scale);
  const gridWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const left = dateToX(groupStart, rangeStart, rangeEnd, columns);
  const width = widthFromRange(groupStart, groupEnd, rangeStart, rangeEnd, columns, 24);

  return (
    <div
      className="grid items-stretch bg-gray-50"
      style={{ gridTemplateColumns: `${leftColumnWidth}px 1fr` }}
    >
      <div className="flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-gray-800">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 hover:bg-gray-100 flex-1"
        >
          <span className="text-gray-400">{collapsed ? '▸' : '▾'}</span>
          <span className="truncate">{label}</span>
          <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
            {taskCount}
          </span>
        </button>
        {parentTaskId && (
          <>
            <button
              type="button"
              onClick={() => setIsSubtaskModalOpen(true)}
              className="px-2 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Add subtask"
            >
              +
            </button>
            <SubtaskModal
              isOpen={isSubtaskModalOpen}
              onClose={() => setIsSubtaskModalOpen(false)}
              onSubtaskAdded={() => {
                setIsSubtaskModalOpen(false);
                onSubtaskAdded?.();
              }}
              parentTaskId={parentTaskId}
              parentTaskProjectId={parentTaskProjectId}
            />
          </>
        )}
      </div>
      <div className="overflow-x-auto">
        <div
          className="relative flex items-center"
          style={{
            minWidth: gridWidth || columnWidth,
            backgroundImage: 'linear-gradient(to right, rgba(148, 163, 184, 0.18) 1px, transparent 1px)',
            backgroundSize: `${columnWidth}px 100%`,
          }}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
          }}
          onDrop={async (event) => {
            event.preventDefault();
            const taskId = Number(event.dataTransfer.getData('text/plain'));
            if (!Number.isNaN(taskId) && onDropTask) {
              onDropTask(taskId, groupId);
            }
          }}
        >
          {/* Previous: fixed className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-indigo-100" */}
          {/* New: use dynamic groupColor to support different project colors */}
          <div
            className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${groupColor}`}
            style={{ left, width }}
          />
        </div>
      </div>
    </div>
  );
};

export default LongStoryRow;
