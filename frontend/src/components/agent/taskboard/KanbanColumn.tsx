import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskCard, type Task } from "./TaskCard"

export type ColumnStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED"

interface KanbanColumnProps {
  status: ColumnStatus
  tasks: Task[]
}

const statusLabels: Record<ColumnStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  return (
    <div className="flex min-w-[280px] flex-1 flex-col rounded-lg bg-card/50">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">
          {statusLabels[status]}
        </h3>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
