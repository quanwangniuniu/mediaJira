import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export type TaskType =
  | "budget"
  | "asset"
  | "report"
  | "retrospective"
  | "experiment"
  | "execution"
  | "scaling"
  | "alert"
  | "optimization"
  | "communication"
  | "platform_policy_update"

export type TaskPriority = "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" | "LOWEST"

export interface Task {
  id: string
  summary: string
  type: TaskType
  priority: TaskPriority
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED"
  dueDate: string
  owner: {
    name: string
    initials: string
  }
}

const typeColors: Record<TaskType, string> = {
  budget: "bg-blue-500/20 text-blue-400",
  asset: "bg-purple-500/20 text-purple-400",
  report: "bg-green-500/20 text-green-400",
  retrospective: "bg-orange-500/20 text-orange-400",
  experiment: "bg-cyan-500/20 text-cyan-400",
  execution: "bg-zinc-500/20 text-zinc-400",
  scaling: "bg-indigo-500/20 text-indigo-400",
  alert: "bg-red-500/20 text-red-400",
  optimization: "bg-teal-500/20 text-teal-400",
  communication: "bg-yellow-500/20 text-yellow-400",
  platform_policy_update: "bg-pink-500/20 text-pink-400",
}

const typeLabels: Record<TaskType, string> = {
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

const priorityColors: Record<TaskPriority, string> = {
  HIGHEST: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
  LOWEST: "bg-zinc-500",
}

export function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm hover:border-muted-foreground/30 transition-colors">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-card-foreground line-clamp-1">
          {task.summary}
        </p>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                typeColors[task.type]
              )}
            >
              {typeLabels[task.type]}
            </span>
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                priorityColors[task.priority]
              )}
              title={task.priority}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {task.dueDate}
            </span>
            <Avatar className="size-6">
              <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                {task.owner.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </div>
  )
}
