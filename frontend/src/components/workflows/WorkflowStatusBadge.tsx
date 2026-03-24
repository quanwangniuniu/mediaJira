"use client";

import StatusBadge from "@/status/StatusBadge";
import type { WorkflowStatus } from "@/lib/api/workflowApi";
import type { StatusTone } from "@/status/statusTypes";

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const STATUS_MAPPING: Record<WorkflowStatus, StatusTone> = {
  draft: "todo",
  published: "in_progress",
  archived: "done",
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
}

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  const tone = STATUS_MAPPING[status] ?? "default";
  const label = STATUS_LABELS[status] ?? status;
  return <StatusBadge label={label} tone={tone} />;
}

export default WorkflowStatusBadge;

