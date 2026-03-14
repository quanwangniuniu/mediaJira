"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Settings2, Trash2 } from "lucide-react"

interface FilterBarProps {
  typeFilter: string
  priorityFilter: string
  ownerFilter: string
  onTypeChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onOwnerChange: (value: string) => void
  owners: { name: string; initials: string }[]
  // Batch manage props
  isManaging?: boolean
  onEnterManage?: () => void
  onExitManage?: () => void
  selectedCount?: number
  isAllSelected?: boolean
  isIndeterminate?: boolean
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onDeleteClick?: () => void
  isDeleting?: boolean
  hasItems?: boolean
  onNewTask?: () => void
}

export function FilterBar({
  typeFilter,
  priorityFilter,
  ownerFilter,
  onTypeChange,
  onPriorityChange,
  onOwnerChange,
  owners,
  isManaging,
  onEnterManage,
  onExitManage,
  selectedCount = 0,
  isAllSelected,
  isIndeterminate,
  onSelectAll,
  onDeselectAll,
  onDeleteClick,
  isDeleting,
  hasItems,
  onNewTask,
}: FilterBarProps) {
  if (isManaging) {
    return (
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isAllSelected ? true : isIndeterminate ? "indeterminate" : false}
            onCheckedChange={() => isAllSelected ? onDeselectAll?.() : onSelectAll?.()}
          />
          <span className="text-sm text-muted-foreground">
            {selectedCount > 0 ? `${selectedCount} selected` : "Select items"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={selectedCount === 0 || isDeleting}
            onClick={onDeleteClick}
          >
            <Trash2 className="size-4 mr-1.5" />
            Delete ({selectedCount})
          </Button>
          <Button size="sm" variant="outline" onClick={onExitManage} disabled={isDeleting}>
            Exit
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="budget">Budget</SelectItem>
            <SelectItem value="asset">Asset</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="retrospective">Retrospective</SelectItem>
            <SelectItem value="experiment">Experiment</SelectItem>
            <SelectItem value="execution">Execution</SelectItem>
            <SelectItem value="scaling">Scaling</SelectItem>
            <SelectItem value="alert">Alert</SelectItem>
            <SelectItem value="optimization">Optimization</SelectItem>
            <SelectItem value="communication">Communication</SelectItem>
            <SelectItem value="platform_policy_update">Policy Update</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={onPriorityChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="HIGHEST">Highest</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="LOWEST">Lowest</SelectItem>
          </SelectContent>
        </Select>

        <Select value={ownerFilter} onValueChange={onOwnerChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Owners</SelectItem>
            {owners.map((o) => (
              <SelectItem key={o.initials} value={o.initials}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        {hasItems && (
          <Button size="sm" variant="outline" onClick={onEnterManage}>
            <Settings2 className="size-4 mr-1.5" />
            Manage
          </Button>
        )}
        <Button onClick={onNewTask}>
          <Plus className="size-4" />
          New Task
        </Button>
      </div>
    </div>
  )
}
