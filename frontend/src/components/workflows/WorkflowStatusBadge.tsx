"use client";

import StatusBadge from "@/components/ui/StatusBadge";
import type { WorkflowStatus } from "@/lib/api/workflowApi";

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

const STATUS_MAPPING: Record<WorkflowStatus, string> = {
  draft: "draft",
  published: "active",
  archived: "completed",
};

interface WorkflowStatusBadgeProps {
  status: WorkflowStatus;
}

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  const mapped = STATUS_MAPPING[status] ?? "default";
  return <StatusBadge status={mapped}>{STATUS_LABELS[status] ?? status}</StatusBadge>;
}

export default WorkflowStatusBadge;

