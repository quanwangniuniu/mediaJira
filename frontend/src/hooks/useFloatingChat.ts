"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useAgentLayout } from "@/components/agent/AgentLayoutContext"
import {
  FLOATING_SIZE,
  SIDEBAR_WIDTH,
  MAGNETIC_THRESHOLD,
  getFloatingPosition,
  getMaximizedBounds,
} from "@/components/agent/chat/animationConfig"

/**
 * Hook managing floating chat drag state, snap-zone detection,
 * position calculations, resize handling, and custom sizing.
 */
export function useFloatingChat() {
  const { floatingChat, isRightPanelOpen, closeFloatingChat, setIsInSnapZone } = useAgentLayout()
  const [position, setPosition] = useState(() => getFloatingPosition(true))
  const [customSize, setCustomSize] = useState<{ width: number; height: number } | null>(null)
  const isDragging = useRef(false)

  // Recalculate position on resize or right-panel toggle
  useEffect(() => {
    if (floatingChat.mode === "closed") return

    if (floatingChat.mode === "floating") {
      setPosition(getFloatingPosition(isRightPanelOpen))
    }

    const handleResize = () => {
      if (floatingChat.mode === "floating") {
        setPosition(getFloatingPosition(isRightPanelOpen))
        // Reset custom size so default recalculates for new viewport
        setCustomSize(null)
      }
    }

    let timer: ReturnType<typeof setTimeout>
    const debounced = () => {
      clearTimeout(timer)
      timer = setTimeout(handleResize, 100)
    }

    window.addEventListener("resize", debounced)
    return () => {
      window.removeEventListener("resize", debounced)
      clearTimeout(timer)
    }
  }, [floatingChat.mode, isRightPanelOpen])

  // Resolve actual floating size (custom or default)
  const floatingWidth = customSize?.width ?? FLOATING_SIZE.width
  const floatingHeight = customSize?.height ?? FLOATING_SIZE.height

  // Get the target animation values based on mode
  const getAnimateTarget = useCallback(() => {
    if (floatingChat.mode === "floating") {
      return {
        x: position.x,
        y: position.y,
        width: floatingWidth,
        height: floatingHeight,
        borderRadius: 12,
        opacity: 1,
        scale: 1,
      }
    }
    if (floatingChat.mode === "maximized") {
      const bounds = getMaximizedBounds(isRightPanelOpen)
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        borderRadius: 0,
        opacity: 1,
        scale: 1,
      }
    }
    // closed — animate to origin rect or default shrink
    const origin = floatingChat.originRect
    if (origin) {
      return {
        x: origin.x,
        y: origin.y,
        width: origin.width,
        height: origin.height,
        borderRadius: 4,
        opacity: 0,
        scale: 0.3,
      }
    }
    return {
      x: SIDEBAR_WIDTH,
      y: 200,
      width: 40,
      height: 40,
      borderRadius: 4,
      opacity: 0,
      scale: 0.3,
    }
  }, [floatingChat.mode, floatingChat.originRect, position, isRightPanelOpen, floatingWidth, floatingHeight])

  // Get the initial (entry) animation values
  const getInitialValues = useCallback(() => {
    const origin = floatingChat.originRect
    if (origin) {
      return {
        x: origin.x,
        y: origin.y,
        width: origin.width,
        height: origin.height,
        borderRadius: 4,
        opacity: 0,
        scale: 0.3,
      }
    }
    return {
      x: SIDEBAR_WIDTH,
      y: 200,
      width: 40,
      height: 40,
      borderRadius: 4,
      opacity: 0,
      scale: 0.3,
    }
  }, [floatingChat.originRect])

  // Drag constraint boundaries
  const dragConstraints = {
    left: 0,
    top: 0,
    right: typeof window !== "undefined" ? window.innerWidth - 100 : 1200,
    bottom: typeof window !== "undefined" ? window.innerHeight - 100 : 700,
  }

  // Handle drag — detect snap zone
  const handleDrag = useCallback((_: unknown, info: { point: { x: number } }) => {
    isDragging.current = true
    const inZone = info.point.x < SIDEBAR_WIDTH + MAGNETIC_THRESHOLD
    setIsInSnapZone(inZone)
  }, [setIsInSnapZone])

  // Handle drag end — snap or stay
  const handleDragEnd = useCallback((_: unknown, info: { point: { x: number; y: number } }) => {
    isDragging.current = false
    const inZone = info.point.x < SIDEBAR_WIDTH + MAGNETIC_THRESHOLD

    if (inZone) {
      // Find closest session item for snap animation
      const sessionEl = findClosestSessionElement(info.point.y)
      if (sessionEl) {
        const rect = sessionEl.getBoundingClientRect()
        // Update origin rect so exit animation flies to this position
        // Then close
        closeFloatingChat()
      } else {
        closeFloatingChat()
      }
    } else {
      // Stay at dropped position — use actual width for centering
      setPosition({
        x: info.point.x - floatingWidth / 2,
        y: info.point.y - 20, // offset for title bar grab
      })
    }
    setIsInSnapZone(false)
  }, [closeFloatingChat, setIsInSnapZone, floatingWidth])

  return {
    position,
    customSize,
    setCustomSize,
    getAnimateTarget,
    getInitialValues,
    dragConstraints,
    handleDrag,
    handleDragEnd,
    isDragging,
  }
}

/** Find the closest [data-session-id] element to a given y coordinate. */
function findClosestSessionElement(y: number): HTMLElement | null {
  const elements = document.querySelectorAll<HTMLElement>("[data-session-id]")
  if (!elements.length) return null

  let closest: HTMLElement | null = null
  let minDist = Infinity

  elements.forEach((el) => {
    const rect = el.getBoundingClientRect()
    const centerY = rect.top + rect.height / 2
    const dist = Math.abs(centerY - y)
    if (dist < minDist) {
      minDist = dist
      closest = el
    }
  })

  return closest
}
