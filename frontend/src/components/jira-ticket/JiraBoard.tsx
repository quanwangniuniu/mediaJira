import * as React from "react";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import ScrollableContainer from "@/components/layout/primitives/ScrollableContainer";
import JiraTicketKey from "@/components/jira-ticket/JiraTicketKey";
import JiraTicketTypeIcon, {
  JiraTicketType,
} from "@/components/jira-ticket/JiraTicketTypeIcon";
import { Avatar } from "@/components/avatar/Avatar";

export interface JiraBoardColumnsProps
  extends React.HTMLAttributes<HTMLDivElement> {
  minWidth?: number;
}

const JiraBoardColumns = React.forwardRef<HTMLDivElement, JiraBoardColumnsProps>(
  ({ children, className, minWidth = 920, ...props }, ref) => (
    <ScrollableContainer direction="horizontal" className="mt-4 pb-2">
      <div
        ref={ref}
        className={cn("flex items-start gap-4", className)}
        style={{ minWidth }}
        {...props}
      >
        {children}
      </div>
    </ScrollableContainer>
  )
);
JiraBoardColumns.displayName = "JiraBoardColumns";

export interface JiraBoardColumnProps
  extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  count?: number;
  showDoneIcon?: boolean;
  footer?: React.ReactNode;
}

const JiraBoardColumn = React.forwardRef<HTMLDivElement, JiraBoardColumnProps>(
  ({ title, count, showDoneIcon = false, footer, children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex w-[252px] flex-col rounded-md border border-slate-200 bg-[#f7f8f9] p-3",
        className
      )}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <div className="flex items-center gap-2">
          <span>{title}</span>
          {typeof count === "number" ? (
            <span className="rounded-sm bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
              {count}
            </span>
          ) : null}
        </div>
        {showDoneIcon ? <Check className="h-4 w-4 text-emerald-500" /> : null}
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {children}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </div>
  )
);
JiraBoardColumn.displayName = "JiraBoardColumn";

export type JiraBoardDueTone = "default" | "warning" | "danger";

export interface JiraBoardCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  summary: React.ReactNode;
  ticketKey: string;
  type: JiraTicketType | string;
  dueDate?: string;
  dueTone?: JiraBoardDueTone;
  assignee?: {
    name: string;
    src?: string;
    initials?: string;
  } | null;
  meta?: React.ReactNode;
  isDragging?: boolean;
  isDropTarget?: boolean;
}

const dueToneClasses: Record<JiraBoardDueTone, string> = {
  default: "border-slate-300 bg-white text-slate-500",
  warning: "border-amber-400 bg-white text-amber-600",
  danger: "border-red-500 bg-white text-red-500",
};

const JiraBoardCard = React.forwardRef<HTMLDivElement, JiraBoardCardProps>(
  (
    {
      summary,
      ticketKey,
      type,
      dueDate,
      dueTone = "default",
      assignee,
      meta,
      isDragging = false,
      isDropTarget = false,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      className={cn(
        "min-h-[88px] rounded-md border bg-white px-3 py-2.5 text-[13px] shadow-sm transition",
        "border-slate-200 hover:border-slate-300 hover:shadow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        isDragging && "border-blue-400 bg-blue-50 shadow-lg",
        isDropTarget && "border-blue-500 ring-2 ring-blue-200",
        className
      )}
      {...props}
    >
      {typeof summary === "string" ? (
        <div className="text-[13px] font-medium text-slate-900">{summary}</div>
      ) : (
        summary
      )}
      {dueDate ? (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-semibold",
            dueToneClasses[dueTone]
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          {dueDate}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <JiraTicketTypeIcon type={type} size={18} />
          <JiraTicketKey jiraTicketKey={ticketKey} onClick={() => {}} />
        </div>
        <div className="flex items-center gap-2">
          {meta}
          {assignee ? (
            <Avatar
              size="xs"
              src={assignee.src}
              alt={assignee.name}
              fallback={assignee.initials || assignee.name.charAt(0).toUpperCase()}
              className="h-6 w-6 border border-slate-200 bg-slate-100 text-xs text-slate-600"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-500">
              <span className="sr-only">Unassigned</span>
              <svg
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="8" r="3" />
                <path d="M5 19c1.5-3 5-4 7-4s5.5 1 7 4" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
);
JiraBoardCard.displayName = "JiraBoardCard";

export { JiraBoardColumns, JiraBoardColumn, JiraBoardCard };
