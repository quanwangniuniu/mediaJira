import type { TaskType, TaskPriority } from "./TaskCard"

export const typeLabels: Record<TaskType, string> = {
  budget: "Budget",
  asset: "Asset",
  report: "Report",
  retrospective: "Retrospective",
  experiment: "Experiment",
  execution: "Execution",
  scaling: "Scaling",
  alert: "Alert",
  optimization: "Optimization",
  communication: "Communication",
  platform_policy_update: "Policy Update",
}

export const priorityLabels: Record<TaskPriority, string> = {
  HIGHEST: "Highest",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
  LOWEST: "Lowest",
}

export const priorityColors: Record<TaskPriority, string> = {
  HIGHEST: "bg-red-500/20 text-red-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  MEDIUM: "bg-yellow-500/20 text-yellow-400",
  LOW: "bg-green-500/20 text-green-400",
  LOWEST: "bg-zinc-500/20 text-zinc-400",
}
