"use client"

import { GripVertical, Maximize2, Minimize2, X } from "lucide-react"
import { useAgentLayout } from "../AgentLayoutContext"

interface FloatingTitleBarProps {
  title: string
  onPointerDown?: (e: React.PointerEvent) => void
}

export function FloatingTitleBar({ title, onPointerDown }: FloatingTitleBarProps) {
  const { floatingChat, toggleMaximize, closeFloatingChat } = useAgentLayout()
  const isMaximized = floatingChat.mode === "maximized"

  return (
    <div
      className="flex items-center h-10 px-2 border-b border-border bg-muted/60 select-none shrink-0"
      onPointerDown={onPointerDown}
      style={{ cursor: isMaximized ? "default" : "grab", touchAction: "none" }}
    >
      {/* Drag handle */}
      {!isMaximized && (
        <GripVertical className="w-4 h-4 text-muted-foreground/50 shrink-0 mr-1" />
      )}

      {/* Title */}
      <span className="flex-1 text-sm font-medium text-foreground truncate px-1">
        {title}
      </span>

      {/* Maximize / Restore */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleMaximize()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>

      {/* Close */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          closeFloatingChat()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="p-1.5 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
        title="Close"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
