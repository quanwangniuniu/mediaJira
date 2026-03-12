/**
 * Single source of truth for task type display labels.
 * Used by NewTaskForm (with API overrides), TimelineView, and TaskRow.
 * When the backend adds a new task type, you can add it here for timeline/row
 * display, or rely on getTaskTypeLabel's formatted fallback.
 */

/** Static label map for known task types (fallback when API not used or before load). */
export const TASK_TYPE_LABELS: Record<string, string> = {
  task: "Task",
  budget: "Budget Request",
  asset: "Asset",
  retrospective: "Retrospective",
  report: "Report",
  scaling: "Scaling",
  alert: "Alert",
  experiment: "Experiment",
  optimization: "Optimization",
  communication: "Client Communication",
  platform_policy_update: "Platform Policy Update",
};

/**
 * Format an unknown task type value as a readable label (e.g. "platform_policy_update" -> "Platform Policy Update").
 * Used when the value is not in TASK_TYPE_LABELS or in the API overrides.
 */
function formatTaskTypeFallback(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "Task";
  return normalized
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

/**
 * Get display label for a task type.
 * @param value - Task type value (e.g. "budget", "platform_policy_update").
 * @param overrides - Optional list from API (e.g. GET /api/task-types/) so API labels take precedence.
 */
export function getTaskTypeLabel(
  value: string | null | undefined,
  overrides?: { value: string; label: string }[]
): string {
  if (value == null || value === "") return TASK_TYPE_LABELS.task ?? "Task";
  const normalized = value.trim().toLowerCase();
  if (overrides?.length) {
    const fromApi = overrides.find((t) => t.value.toLowerCase() === normalized);
    if (fromApi) return fromApi.label;
  }
  if (TASK_TYPE_LABELS[normalized]) return TASK_TYPE_LABELS[normalized];
  return formatTaskTypeFallback(normalized);
}
