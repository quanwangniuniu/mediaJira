"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { useAgentLayout } from "../AgentLayoutContext"
import { cn } from "@/lib/utils"
import { useFloatingChat } from "@/hooks/useFloatingChat"
import { FloatingTitleBar } from "./FloatingTitleBar"
import { AgentChatPage } from "./AgentChatPage"
import { SPRING, FLOATING_MIN_SIZE, FLOATING_MAX_SIZE } from "./animationConfig"
import { AgentAPI } from "@/lib/api/agentApi"

export function FloatingChatWindow() {
  const { floatingChat, closeFloatingChat } = useAgentLayout()
  const {
    getAnimateTarget,
    getInitialValues,
    dragConstraints,
    handleDrag,
    handleDragEnd,
    customSize,
    setCustomSize,
  } = useFloatingChat()
  const dragControls = useDragControls()
  const [title, setTitle] = useState("New Chat")
  const containerRef = useRef<HTMLDivElement>(null)

  const isOpen = floatingChat.mode !== "closed"
  const isMaximized = floatingChat.mode === "maximized"

  // Fetch session title when sessionId changes
  useEffect(() => {
    if (!floatingChat.sessionId) {
      setTitle("New Chat")
      return
    }
    AgentAPI.getSession(floatingChat.sessionId)
      .then((s) => setTitle(s.title || "Untitled"))
      .catch(() => setTitle("Chat"))
  }, [floatingChat.sessionId])

  // Listen for session changes — update title or close if deleted
  useEffect(() => {
    const handler = () => {
      if (!floatingChat.sessionId) return
      AgentAPI.getSession(floatingChat.sessionId)
        .then((s) => setTitle(s.title || "Untitled"))
        .catch(() => closeFloatingChat())
    }
    window.addEventListener("agent:sessions-changed", handler)
    return () => window.removeEventListener("agent:sessions-changed", handler)
  }, [floatingChat.sessionId, closeFloatingChat])

  const springType = isMaximized ? SPRING.maximize : SPRING.open

  const handleTitleBarPointerDown = (e: React.PointerEvent) => {
    if (isMaximized) return // no drag when maximized
    dragControls.start(e)
  }

  // Resize handle logic
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation()
      e.preventDefault()

      const startX = e.clientX
      const startY = e.clientY
      const el = containerRef.current
      const startWidth = el ? el.offsetWidth : (customSize?.width ?? 420)
      const startHeight = el ? el.offsetHeight : (customSize?.height ?? 560)

      const onPointerMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX
        const dy = ev.clientY - startY
        const newWidth = Math.min(
          FLOATING_MAX_SIZE.width,
          Math.max(FLOATING_MIN_SIZE.width, startWidth + dx)
        )
        const newHeight = Math.min(
          FLOATING_MAX_SIZE.height,
          Math.max(FLOATING_MIN_SIZE.height, startHeight + dy)
        )
        setCustomSize({ width: newWidth, height: newHeight })
      }

      const onPointerUp = () => {
        document.removeEventListener("pointermove", onPointerMove)
        document.removeEventListener("pointerup", onPointerUp)
      }

      document.addEventListener("pointermove", onPointerMove)
      document.addEventListener("pointerup", onPointerUp)
    },
    [customSize, setCustomSize]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={containerRef}
          key="floating-chat"
          initial={getInitialValues()}
          animate={getAnimateTarget()}
          exit={getInitialValues()}
          transition={springType}
          drag={!isMaximized}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragConstraints={dragConstraints}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className={cn(
            "fixed z-50 flex flex-col bg-background overflow-hidden",
            isMaximized ? "shadow-none border-0" : "border border-border shadow-2xl"
          )}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
          }}
        >
          <FloatingTitleBar
            title={title}
            onPointerDown={handleTitleBarPointerDown}
          />
          <div className="flex-1 overflow-hidden min-h-0">
            <AgentChatPage />
          </div>

          {/* Resize handle — bottom-right corner, visible only when floating */}
          {!isMaximized && (
            <div
              onPointerDown={handleResizePointerDown}
              className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-se-resize flex items-center justify-center"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground/50">
                <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" />
                <line x1="9" y1="5" x2="5" y2="9" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
