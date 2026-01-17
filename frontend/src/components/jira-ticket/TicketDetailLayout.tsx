import * as React from "react"
import { cn } from "@/lib/utils"

export interface TicketDetailLayoutProps
  extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode
  content?: React.ReactNode
  sidebar?: React.ReactNode
}

const TicketDetailLayout = React.forwardRef<
  HTMLDivElement,
  TicketDetailLayoutProps
>(({ header, content, sidebar, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex w-full flex-col gap-4 bg-slate-50", className)}
    {...props}
  >
    {/* Each region can be rendered independently for Storybook. */}
    {header}
    {/* Stack on mobile, split into two columns on desktop. */}
    <div className="flex flex-col gap-4 px-6 pb-8 md:flex-row md:items-start">
      <div className="min-w-0 flex-1">{content}</div>
      <div className="w-full md:w-auto">{sidebar}</div>
    </div>
  </div>
))

TicketDetailLayout.displayName = "TicketDetailLayout"

export default TicketDetailLayout
