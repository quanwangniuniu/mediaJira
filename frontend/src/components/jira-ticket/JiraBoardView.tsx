import React, { useEffect, useRef, useState } from "react";
import { Filter, Search, Plus } from "lucide-react";
import {
  JiraBoardCard,
  JiraBoardColumn,
} from "@/components/jira-ticket/JiraBoard";

type BoardColumn = {
  key: string;
  title: string;
  empty: string;
};

type TaskLike = {
  id?: number;
  summary?: string;
  type?: string;
  due_date?: string;
  current_approver?: {
    username?: string;
    email?: string;
  } | null;
};

interface JiraBoardViewProps {
  boardColumns: BoardColumn[];
  tasksByType: Record<string, TaskLike[]>;
  onCreateTask: () => void;
  onTaskClick: (task: TaskLike) => void;
  getTicketKey: (task: TaskLike) => string;
  getBoardTypeIcon: (type?: string) => string;
  formatBoardDate: (dateString?: string) => string;
  getDueTone: (dateString?: string) => "default" | "warning" | "danger";
  editingTaskId: number | null;
  editingSummary: string;
  setEditingSummary: (value: string) => void;
  startBoardEdit: (task: TaskLike) => void;
  cancelBoardEdit: () => void;
  saveBoardEdit: (task: TaskLike) => void;
}

const BoardFilterPanel = () => (
  <div className="w-[520px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
    <div className="grid grid-cols-[180px_1fr]">
      <div className="border-r border-slate-200 p-3 text-sm text-slate-700">
        <div className="space-y-2">
          {[
            "Parent",
            "Assignee",
            "Work type",
            "Labels",
            "Status",
            "Priority",
          ].map((item) => (
            <button
              key={item}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-100"
            >
              {item}
              <span className="text-slate-300">+</span>
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 text-sm text-slate-500">
        Select a field to start creating a filter.
      </div>
    </div>
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-400">
      <span className="inline-flex items-center gap-2">Give feedback</span>
      <span>Press Shift + F to open and close</span>
    </div>
  </div>
);

const FilterPopover = ({
  trigger,
  children,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <span onClick={() => setOpen((prev) => !prev)}>{trigger}</span>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2">
          {children}
        </div>
      ) : null}
    </div>
  );
};

const JiraBoardView: React.FC<JiraBoardViewProps> = ({
  boardColumns,
  tasksByType,
  onCreateTask,
  onTaskClick,
  getTicketKey,
  getBoardTypeIcon,
  formatBoardDate,
  getDueTone,
  editingTaskId,
  editingSummary,
  setEditingSummary,
  startBoardEdit,
  cancelBoardEdit,
  saveBoardEdit,
}) => {
  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search board"
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">
            JX
          </div>
          <FilterPopover
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                Filter
              </button>
            }
          >
            <BoardFilterPanel />
          </FilterPopover>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {boardColumns.map((column) => {
          const columnTasks = tasksByType[column.key] || [];
          return (
            <JiraBoardColumn
              key={column.key}
              title={column.title}
              count={columnTasks.length}
              className="w-full"
              footer={
                <button
                  type="button"
                  onClick={onCreateTask}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                >
                  <span className="text-base">+</span>
                  Create
                </button>
              }
            >
              {columnTasks.length === 0 ? (
                <p className="text-xs text-slate-400">{column.empty}</p>
              ) : (
                columnTasks.map((task) => (
                  <JiraBoardCard
                    key={task.id}
                    summary={
                      editingTaskId === task.id ? (
                        <input
                          value={editingSummary}
                          onChange={(event) =>
                            setEditingSummary(event.target.value)
                          }
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              saveBoardEdit(task);
                            }
                            if (event.key === "Escape") {
                              event.preventDefault();
                              cancelBoardEdit();
                            }
                          }}
                          onBlur={() => saveBoardEdit(task)}
                          className="w-full rounded border border-slate-300 px-2 py-1 text-[13px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            startBoardEdit(task);
                          }}
                          className="w-full text-left text-[13px] font-medium text-slate-900 hover:text-slate-900"
                        >
                          {task.summary || "Untitled task"}
                        </button>
                      )
                    }
                    ticketKey={getTicketKey(task)}
                    type={getBoardTypeIcon(task.type)}
                    dueDate={formatBoardDate(task.due_date)}
                    dueTone={getDueTone(task.due_date)}
                    assignee={
                      task?.current_approver
                        ? {
                            name:
                              task.current_approver.username ||
                              task.current_approver.email ||
                              "User",
                            initials: (
                              task.current_approver.username ||
                              task.current_approver.email ||
                              "?"
                            )
                              .slice(0, 2)
                              .toUpperCase(),
                          }
                        : null
                    }
                    onClick={() => onTaskClick(task)}
                  />
                ))
              )}
            </JiraBoardColumn>
          );
        })}
        <button
          type="button"
          onClick={onCreateTask}
          className="flex h-full min-h-[120px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default JiraBoardView;
