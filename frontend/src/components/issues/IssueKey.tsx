import * as React from "react"
import { cn } from "@/lib/utils"

export interface IssueKeyProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  issueKey: string
}

const IssueKey = React.forwardRef<HTMLAnchorElement, IssueKeyProps>(
  ({ issueKey, className, onClick, ...props }, ref) => {
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      onClick?.(event)
    }

    return (
      <a
        ref={ref}
        href="#"
        onClick={handleClick}
        className={cn(
          "text-[11px] font-medium tracking-wide text-slate-400 transition-colors",
          "hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
          className
        )}
        {...props}
      >
        {issueKey}
      </a>
    )
  }
)
IssueKey.displayName = "IssueKey"

export default IssueKey
