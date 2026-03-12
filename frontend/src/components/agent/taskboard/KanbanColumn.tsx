import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskCard, type Task } from "./TaskCard"
import { cn } from "@/lib/utils"

export type ColumnStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED"

interface KanbanColumnProps {
  status: ColumnStatus
  tasks: Task[]
  isManaging?: boolean
  selectedIds?: Set<string | number>
  exitingIds?: Set<string | number>
  onToggleSelect?: (id: string | number) => void
  onCardClick?: (task: Task) => void
}

const statusLabels: Record<ColumnStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
}

export function KanbanColumn({ status, tasks, isManaging, selectedIds, exitingIds, onToggleSelect, onCardClick }: KanbanColumnProps) {
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
            <div
              key={task.id}
              className={cn(
                "transition-all duration-300",
                exitingIds?.has(task.id) && "opacity-0 scale-95 max-h-0 overflow-hidden"
              )}
            >
              <TaskCard
                task={task}
                isManaging={isManaging}
                isSelected={selectedIds?.has(task.id)}
                onToggleSelect={() => onToggleSelect?.(task.id)}
                onClick={() => onCardClick?.(task)}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
