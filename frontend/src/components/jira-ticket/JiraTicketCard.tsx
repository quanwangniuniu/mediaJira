import * as React from "react"
import { cn } from "@/lib/utils"

export interface JiraTicketCardProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const JiraTicketCard = React.forwardRef<HTMLDivElement, JiraTicketCardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col rounded-md border border-slate-200 bg-white",
        className
      )}
      {...props}
    />
  )
)
JiraTicketCard.displayName = "JiraTicketCard"

export interface JiraTicketCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const JiraTicketCardHeader = React.forwardRef<
  HTMLDivElement,
  JiraTicketCardHeaderProps
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 text-base font-semibold text-slate-900",
        className
      )}
      {...props}
    />
  )
)
JiraTicketCardHeader.displayName = "JiraTicketCardHeader"

export interface JiraTicketCardBodyProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const JiraTicketCardBody = React.forwardRef<
  HTMLDivElement,
  JiraTicketCardBodyProps
>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-4 py-3", className)} {...props} />
  )
)
JiraTicketCardBody.displayName = "JiraTicketCardBody"

export interface JiraTicketCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const JiraTicketCardFooter = React.forwardRef<
  HTMLDivElement,
  JiraTicketCardFooterProps
>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "border-t border-slate-200 px-4 py-3 text-xs text-slate-500",
        className
      )}
      {...props}
    />
  )
)
JiraTicketCardFooter.displayName = "JiraTicketCardFooter"

export {
  JiraTicketCard,
  JiraTicketCardHeader,
  JiraTicketCardBody,
  JiraTicketCardFooter,
}
export default JiraTicketCard
