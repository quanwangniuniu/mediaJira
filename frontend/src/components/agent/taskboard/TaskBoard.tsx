"use client"

import { useEffect, useState } from "react"
import { FilterBar } from "./FilterBar"
import { KanbanColumn, type ColumnStatus } from "./KanbanColumn"
import type { Task, TaskType, TaskPriority } from "./TaskCard"
import { TaskAPI } from "@/lib/api/taskApi"

const columns: ColumnStatus[] = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED"]

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  } catch {
    return dateStr
  }
}

export function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const response = await TaskAPI.getTasks()
        if (cancelled) return
        const results = response.data.results || response.data || []
        const mapped: Task[] = results.map((t: Record<string, unknown>) => {
          const ownerObj = t.owner as Record<string, string> | null
          const ownerName = ownerObj
            ? `${ownerObj.first_name || ""} ${ownerObj.last_name || ""}`.trim() || ownerObj.email || "Unknown"
            : "Unassigned"
          return {
            id: String(t.id),
            summary: (t.summary as string) || "Untitled",
            type: (t.type as TaskType) || "execution",
            priority: (t.priority as TaskPriority) || "MEDIUM",
            status: (t.status as string) || "DRAFT",
            dueDate: formatDate(t.due_date as string | null),
            owner: {
              name: ownerName,
              initials: getInitials(ownerName),
            },
          }
        })
        setTasks(mapped)
      } catch {
        setTasks([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Extract unique owners for filter dropdown
  const owners = Array.from(
    new Map(tasks.map((t) => [t.owner.initials, t.owner])).values()
  )

  const filteredTasks = tasks.filter((task) => {
    if (typeFilter !== "all" && task.type !== typeFilter) return false
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false
    if (ownerFilter !== "all" && task.owner.initials !== ownerFilter) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading tasks...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <FilterBar
        typeFilter={typeFilter}
        priorityFilter={priorityFilter}
        ownerFilter={ownerFilter}
        onTypeChange={setTypeFilter}
        onPriorityChange={setPriorityFilter}
        onOwnerChange={setOwnerFilter}
        owners={owners}
      />

      <div className="flex gap-4 flex-1 overflow-hidden">
        {columns.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={filteredTasks.filter((t) => t.status === status)}
          />
        ))}
      </div>
    </div>
  )
}
