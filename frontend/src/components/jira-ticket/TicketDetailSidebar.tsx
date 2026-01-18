import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TicketDetailSidebarProps
    extends React.HTMLAttributes<HTMLElement> {
    defaultCollapsed?: boolean
    defaultWidth?: number
    minWidth?: number
    maxWidth?: number
}

const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max)

const TicketDetailSidebar = React.forwardRef<
    HTMLElement,
    TicketDetailSidebarProps
>(
    (
        {
            defaultCollapsed = false,
            defaultWidth = 320,
            minWidth = 260,
            maxWidth = 420,
            className,
            ...props
        },
        ref
    ) => {
        const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
        const [width, setWidth] = React.useState(() =>
            clamp(defaultWidth, minWidth, maxWidth)
        )
        const [isDragging, setIsDragging] = React.useState(false)
        const dragState = React.useRef({
            startX: 0,
            startWidth: clamp(defaultWidth, minWidth, maxWidth),
        })

        // Track global pointer moves while resizing the sidebar.
        React.useEffect(() => {
            if (!isDragging) {
                return
            }

            const handleMouseMove = (event: MouseEvent) => {
                const deltaX = event.clientX - dragState.current.startX
                const nextWidth = clamp(
                    dragState.current.startWidth - deltaX,
                    minWidth,
                    maxWidth
                )
                setWidth(nextWidth)
            }

            const handleMouseUp = () => {
                setIsDragging(false)
            }

            window.addEventListener("mousemove", handleMouseMove)
            window.addEventListener("mouseup", handleMouseUp)

            return () => {
                window.removeEventListener("mousemove", handleMouseMove)
                window.removeEventListener("mouseup", handleMouseUp)
            }
        }, [isDragging, minWidth, maxWidth])

        // Prevent text selection and show resize cursor during drag.
        React.useEffect(() => {
            if (!isDragging) {
                return
            }
            const body = document.body
            const previousUserSelect = body.style.userSelect
            const previousCursor = body.style.cursor
            body.style.userSelect = "none"
            body.style.cursor = "col-resize"
            return () => {
                body.style.userSelect = previousUserSelect
                body.style.cursor = previousCursor
            }
        }, [isDragging])

        const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault()
            dragState.current = {
                startX: event.clientX,
                startWidth: width,
            }
            setIsDragging(true)
        }

        // Placeholder details for the sidebar body.
        const details = [
            { label: "Assignee", value: "Unassigned" },
            { label: "Labels", value: "design, ux" },
            { label: "Parent", value: "EPIC-18" },
            { label: "Sprint", value: "Sprint 24" },
            { label: "Reporter", value: "Taylor Reid" },
            { label: "Priority", value: "Medium" },
        ]

        // Use a CSS custom property so the width can be used in Tailwind classes.
        const style = {
            "--sidebar-width": `${width}px`,
        } as React.CSSProperties

        return (
            <aside
                ref={ref}
                style={style}
                className={cn(
                    "relative flex w-full flex-col gap-4 border-l border-slate-200 bg-white px-5 py-4",
                    "md:w-[var(--sidebar-width)]",
                    className
                )}
                {...props}
            >
                {/* Left-edge drag handle for resizing. */}
                <div
                    onMouseDown={handleMouseDown}
                    className="group absolute left-0 top-0 h-full w-2 cursor-col-resize"
                    aria-hidden="true"
                >
                    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200 transition-colors group-hover:bg-slate-400" />
                </div>

                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
                        aria-expanded={!isCollapsed}
                    >
                        <span>Details</span>
                        <ChevronDown
                            className={cn(
                                "h-4 w-4 transition-transform",
                                isCollapsed ? "-rotate-90" : "rotate-0"
                            )}
                            aria-hidden="true"
                        />
                    </button>

                    {!isCollapsed ? (
                        <div className="space-y-2">
                            {details.map((detail) => (
                                <div
                                    key={detail.label}
                                    className="grid grid-cols-[120px_1fr] gap-3 text-sm"
                                >
                                    <span className="text-slate-500">{detail.label}</span>
                                    <span className="text-slate-800">{detail.value}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </aside>
        )
    }
)

TicketDetailSidebar.displayName = "TicketDetailSidebar"

export default TicketDetailSidebar