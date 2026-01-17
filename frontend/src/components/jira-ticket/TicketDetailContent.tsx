import * as React from "react"
import { cn } from "@/lib/utils"
import JiraTicketCard, {
  JiraTicketCardBody,
  JiraTicketCardHeader,
} from "./JiraTicketCard"

export interface TicketDetailContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

const TicketDetailContent = React.forwardRef<
  HTMLDivElement,
  TicketDetailContentProps
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex w-full flex-col gap-4", className)}
    {...props}
  >
    {/* Placeholder blocks for layout-only preview. */}
    <JiraTicketCard>
      <JiraTicketCardHeader>Description</JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="text-sm text-slate-600">
          Add a detailed description of the ticket, goals, and expected
          outcomes. Use this space for context and acceptance criteria.
        </div>
      </JiraTicketCardBody>
    </JiraTicketCard>

    <JiraTicketCard>
      <JiraTicketCardHeader>Linked work items</JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <span className="font-medium text-slate-800">WEB-114</span>
            <span className="text-xs text-slate-500">Blocked by</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
            <span className="font-medium text-slate-800">API-332</span>
            <span className="text-xs text-slate-500">Relates to</span>
          </div>
        </div>
      </JiraTicketCardBody>
    </JiraTicketCard>

    <JiraTicketCard>
      <JiraTicketCardHeader>Activity</JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="space-y-3">
          {/* Static tabs to illustrate layout only. */}
          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-slate-900"
            >
              All
            </button>
            {["Comments", "History", "Work log"].map((tab) => (
              <button
                key={tab}
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 hover:bg-slate-50"
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-600">
            Recent updates, comments, and work logs will appear here. Use this
            space for collaboration notes and progress tracking.
          </div>
        </div>
      </JiraTicketCardBody>
    </JiraTicketCard>
  </div>
))

TicketDetailContent.displayName = "TicketDetailContent"

export default TicketDetailContent
