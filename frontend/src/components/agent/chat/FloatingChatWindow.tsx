"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { useAgentLayout } from "../AgentLayoutContext"
import { cn } from "@/lib/utils"
import { useFloatingChat } from "@/hooks/useFloatingChat"
import { FloatingTitleBar } from "./FloatingTitleBar"
import { AgentChatPage } from "./AgentChatPage"
import { SPRING } from "./animationConfig"
import { AgentAPI } from "@/lib/api/agentApi"

export function FloatingChatWindow() {
  const { floatingChat, closeFloatingChat } = useAgentLayout()
  const { getAnimateTarget, getInitialValues, dragConstraints, handleDrag, handleDragEnd } = useFloatingChat()
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
