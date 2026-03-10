"use client"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"

interface FilterBarProps {
  typeFilter: string
  priorityFilter: string
  ownerFilter: string
  onTypeChange: (value: string) => void
  onPriorityChange: (value: string) => void
  onOwnerChange: (value: string) => void
  owners: { name: string; initials: string }[]
}

export function FilterBar({
  typeFilter,
  priorityFilter,
  ownerFilter,
  onTypeChange,
  onPriorityChange,
  onOwnerChange,
  owners,
}: FilterBarProps) {
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

      <Button>
        <Plus className="size-4" />
        New Task
      </Button>
    </div>
  )
}
