import * as React from "react"
import { cn } from "@/lib/utils"

export interface IssueCardProps extends React.HTMLAttributes<HTMLDivElement> {}

const IssueCard = React.forwardRef<HTMLDivElement, IssueCardProps>(
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
IssueCard.displayName = "IssueCard"

export interface IssueCardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const IssueCardHeader = React.forwardRef<HTMLDivElement, IssueCardHeaderProps>(
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
IssueCardHeader.displayName = "IssueCardHeader"

export interface IssueCardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const IssueCardBody = React.forwardRef<HTMLDivElement, IssueCardBodyProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-4 py-3", className)} {...props} />
  )
)
IssueCardBody.displayName = "IssueCardBody"

export interface IssueCardFooterProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const IssueCardFooter = React.forwardRef<HTMLDivElement, IssueCardFooterProps>(
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
IssueCardFooter.displayName = "IssueCardFooter"

export { IssueCard, IssueCardHeader, IssueCardBody, IssueCardFooter }
export default IssueCard
