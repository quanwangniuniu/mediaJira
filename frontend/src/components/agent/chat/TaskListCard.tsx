"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ListChecks } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecommendedTask } from "@/types/agent"

const priorityColors = {
  HIGH: { bg: "bg-red-500/20", text: "text-red-400" },
  MEDIUM: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  LOW: { bg: "bg-green-500/20", text: "text-green-400" },
} as const

interface TaskListCardProps {
  tasks: RecommendedTask[]
  onCreateAll?: () => void
}

export function TaskListCard({ tasks, onCreateAll }: TaskListCardProps) {
  if (!tasks.length) return null

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 shrink-0">
            <ListChecks className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-sm font-semibold text-card-foreground">
            Recommended Tasks ({tasks.length})
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 space-y-2">
        {tasks.map((task, i) => {
          const priority = priorityColors[task.priority] || priorityColors.MEDIUM
          return (
            <div key={i} className="flex items-start gap-3 py-1.5">
              <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5", priority.bg, priority.text)}>
                {task.priority}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">{task.summary}</p>
                <p className="text-xs text-muted-foreground capitalize">{task.type}</p>
              </div>
            </div>
          )
        })}

        <div className="pt-2">
          <Button size="sm" onClick={onCreateAll}>
            Create All Tasks
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
