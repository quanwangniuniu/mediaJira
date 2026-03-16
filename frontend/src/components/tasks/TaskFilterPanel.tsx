"use client";

import { useMemo, useState } from "react";
import type { TaskListFilters } from "@/types/task";
import { Button } from "@/components/ui/button";

type FilterKey =
  | "assignee"
  | "owner"
  | "type"
  | "status"
  | "priority"
  | "project"
  | "parent"
  | "due_date"
  | "created_date";

export interface SimpleOption {
  value: string | number;
  label: string;
}

export interface TaskFilterPanelProps {
  filters: TaskListFilters;
  onChange: (next: TaskListFilters) => void;
  onClearAll: () => void;
  projectOptions?: { id: number; name: string }[];
  ownerOptions?: { id: number; name: string }[];
  approverOptions?: { id: number; name: string }[];
  typeOptions?: SimpleOption[];
}

const STATUS_OPTIONS: SimpleOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "LOCKED", label: "Locked" },
  { value: "CANCELLED", label: "Cancelled" },
];

const PRIORITY_OPTIONS: SimpleOption[] = [
  { value: "HIGHEST", label: "Highest" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
  { value: "LOWEST", label: "Lowest" },
];

const FILTER_LIST: { key: FilterKey; label: string }[] = [
  { key: "assignee", label: "Assignee" },
  { key: "owner", label: "Owner" },
  { key: "type", label: "Work type" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "project", label: "Project" },
  { key: "parent", label: "Parent" },
  { key: "due_date", label: "Due date" },
  { key: "created_date", label: "Created date" },
];

export function TaskFilterPanel({
  filters,
  onChange,
  onClearAll,
  projectOptions,
  ownerOptions,
  approverOptions,
  typeOptions,
}: TaskFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<FilterKey>("assignee");

  const activeCount = useMemo(() => {
    const keys: (keyof TaskListFilters)[] = [
      "project_id",
      "type",
      "status",
      "priority",
      "owner_id",
      "current_approver_id",
      "has_parent",
      "due_date_after",
      "due_date_before",
      "created_after",
      "created_before",
    ];
    return keys.reduce((acc, key) => {
      const v = filters[key];
      return acc + (v === undefined || v === null || v === "" ? 0 : 1);
    }, 0);
  }, [filters]);

  const handlePartialChange = (patch: Partial<TaskListFilters>) => {
    onChange({ ...filters, ...patch });
  };

  const renderRightPanel = () => {
    switch (activeKey) {
      case "assignee":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Current approver
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={filters.current_approver_id ?? ""}
              onChange={(e) =>
                handlePartialChange({
                  current_approver_id: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <option value="">Any assignee</option>
              {approverOptions?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        );
      case "owner":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Owner
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={filters.owner_id ?? ""}
              onChange={(e) =>
                handlePartialChange({
                  owner_id: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            >
              <option value="">Any owner</option>
              {ownerOptions?.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        );
      case "type":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Work type
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={filters.type ?? ""}
              onChange={(e) =>
                handlePartialChange({ type: e.target.value || undefined })
              }
            >
              <option value="">Any type</option>
              {typeOptions?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "status":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Status
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={filters.status ?? ""}
              onChange={(e) =>
                handlePartialChange({ status: e.target.value || undefined })
              }
            >
              <option value="">Any status</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "priority":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Priority
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={filters.priority ?? ""}
              onChange={(e) =>
                handlePartialChange({ priority: e.target.value || undefined })
              }
            >
              <option value="">Any priority</option>
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        );
      case "project":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Project
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={filters.project_id ?? ""}
              onChange={(e) =>
                handlePartialChange({
                  project_id: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
            >
              <option value="">Any project</option>
              {projectOptions?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        );
      case "parent":
        return (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Parent relationship
            </label>
            <select
              className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={
                filters.has_parent === undefined
                  ? ""
                  : filters.has_parent
                  ? "true"
                  : "false"
              }
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  handlePartialChange({ has_parent: undefined });
                } else {
                  handlePartialChange({ has_parent: v === "true" });
                }
              }}
            >
              <option value="">Any</option>
              <option value="false">Top-level only</option>
              <option value="true">Subtasks only</option>
            </select>
          </div>
        );
      case "due_date":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Due on or after
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={filters.due_date_after ?? ""}
                onChange={(e) =>
                  handlePartialChange({
                    due_date_after: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Due on or before
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={filters.due_date_before ?? ""}
                onChange={(e) =>
                  handlePartialChange({
                    due_date_before: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        );
      case "created_date":
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Created on or after
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={filters.created_after ?? ""}
                onChange={(e) =>
                  handlePartialChange({
                    created_after: e.target.value || undefined,
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Created on or before
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                value={filters.created_before ?? ""}
                onChange={(e) =>
                  handlePartialChange({
                    created_before: e.target.value || undefined,
                  })
                }
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="relative inline-block text-left">
      <Button
        type="button"
        variant={activeCount > 0 ? "default" : "outline"}
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        Filter
        {activeCount > 0 && (
          <span className="ml-2 inline-flex items-center rounded-full bg-primary-foreground px-2 py-0.5 text-xs font-medium text-primary">
            {`Filter ${activeCount}`}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute z-50 mt-2 w-[520px] rounded-md border bg-popover shadow-md">
          <div className="flex">
            <div className="w-40 border-r bg-muted/40 py-2">
              {FILTER_LIST.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`block w-full px-3 py-1.5 text-left text-sm ${
                    activeKey === item.key
                      ? "bg-background font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setActiveKey(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex-1 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-foreground">
                  {FILTER_LIST.find((f) => f.key === activeKey)?.label}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      onClearAll();
                      setOpen(false);
                    }}
                  >
                    Clear all
                  </Button>
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
              {renderRightPanel()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

