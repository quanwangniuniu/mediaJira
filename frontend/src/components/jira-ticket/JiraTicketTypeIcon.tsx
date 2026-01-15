import * as React from "react"
import { Bug, Bookmark, SquaresExclude } from "lucide-react"
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline"
import { cn } from "@/lib/utils"

export type JiraTicketType = "task" | "bug" | "story" | "custom"

const JIRA_TICKET_TYPE_META: Record<
  JiraTicketType,
  { label: string; color: string }
> = {
  task: { label: "Task", color: "text-[#4c9aff]" },
  bug: { label: "Bug", color: "text-[#de350b]" },
  story: { label: "Story", color: "text-[#36b37e]" },
  custom: { label: "Custom", color: "text-slate-500" },
}

const ICONS: Record<
  JiraTicketType,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  task: SquaresExclude,
  bug: Bug,
  story: Bookmark,
  custom: AdjustmentsHorizontalIcon,
}

function normalizeType(type: JiraTicketType | string): JiraTicketType {
  const normalized = type.toLowerCase()
  if (normalized === "bug") return "bug"
  if (normalized === "story") return "story"
  if (normalized === "custom") return "custom"
  return "task"
}

export interface JiraTicketTypeIconProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  type: JiraTicketType | string
  size?: number
}

const JiraTicketTypeIcon = React.forwardRef<
  HTMLSpanElement,
  JiraTicketTypeIconProps
>(
  ({ type, size = 22, className, ...props }, ref) => {
    const normalizedType = normalizeType(type)
    const meta = JIRA_TICKET_TYPE_META[normalizedType]
    const iconSize = Math.max(14, Math.round(size * 0.75))
    const Icon = ICONS[normalizedType]

    return (
      <span
        ref={ref}
        role="img"
        aria-label={meta.label}
        className={cn("inline-flex items-center justify-center", meta.color, className)}
        style={{ width: size, height: size }}
        {...props}
      >
        <Icon
          width={iconSize}
          height={iconSize}
          strokeWidth={2}
          aria-hidden="true"
        />
      </span>
    )
  }
)
JiraTicketTypeIcon.displayName = "JiraTicketTypeIcon"

export default JiraTicketTypeIcon
