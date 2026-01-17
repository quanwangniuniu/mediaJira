import * as React from "react"
import { cn } from "@/lib/utils"

export interface TicketDetailHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  left?: React.ReactNode
  right?: React.ReactNode
}

const TicketDetailHeader = React.forwardRef<
  HTMLDivElement,
  TicketDetailHeaderProps
>(({ left, right, className, ...props }, ref) => (
  // Layout-only header shell with left/right slots.
  <header
    ref={ref}
    className={cn(
      "w-full border-b border-slate-200 bg-white px-6 py-4",
      className
    )}
    {...props}
  >
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">{left}</div>
      {right ? (
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      ) : null}
    </div>
  </header>
))

TicketDetailHeader.displayName = "TicketDetailHeader"

export default TicketDetailHeader
