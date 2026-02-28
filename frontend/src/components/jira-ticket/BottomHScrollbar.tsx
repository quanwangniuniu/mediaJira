import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import styles from "./BottomHScrollbar.module.css"

type BottomHScrollbarProps = {
  targetRef: React.RefObject<HTMLElement | null>
  thumbWidth?: number
  trackPadding?: number
}

type ScrollMetrics = {
  visible: boolean
  clientWidth: number
  scrollWidth: number
  scrollLeft: number
}

const THUMB_WIDTH_PX = 160

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

const BottomHScrollbar = ({
  targetRef,
  thumbWidth = THUMB_WIDTH_PX,
  trackPadding = 16,
}: BottomHScrollbarProps) => {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const trackRef = React.useRef<HTMLDivElement>(null)
  const thumbRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startThumbLeft: 0,
  })
  const [isDragging, setIsDragging] = React.useState(false)
  const [isActive, setIsActive] = React.useState(false)

  const [metrics, setMetrics] = React.useState<ScrollMetrics>({
    visible: false,
    clientWidth: 0,
    scrollWidth: 0,
    scrollLeft: 0,
  })

  const [trackWidth, setTrackWidth] = React.useState(0)
  const [mounted, setMounted] = React.useState(false)

  const effectiveThumbWidth = Math.min(thumbWidth, Math.max(trackWidth, 0))
  const maxScroll = Math.max(metrics.scrollWidth - metrics.clientWidth, 0)
  const maxThumbTravel = Math.max(trackWidth - effectiveThumbWidth, 0)
  const controlledElementId = targetRef.current?.id || "mj-board-columns-scroll"
  const thumbLeft =
    maxScroll > 0 ? (metrics.scrollLeft / maxScroll) * maxThumbTravel : 0

  const recomputeTargetMetrics = React.useCallback(() => {
    const target = targetRef.current
    if (!target) {
      setMetrics((prev) => ({ ...prev, visible: false }))
      return
    }

    const nextClientWidth = target.clientWidth
    const nextScrollWidth = target.scrollWidth
    const nextScrollLeft = target.scrollLeft
    const hasOverflow = nextScrollWidth - nextClientWidth > 0

    setMetrics({
      visible: hasOverflow,
      clientWidth: nextClientWidth,
      scrollWidth: nextScrollWidth,
      scrollLeft: nextScrollLeft,
    })
  }, [targetRef])

  const recomputeTrackWidth = React.useCallback(() => {
    if (!trackRef.current) return
    setTrackWidth(trackRef.current.clientWidth)
  }, [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useLayoutEffect(() => {
    if (!mounted || !metrics.visible) return
    const raf = window.requestAnimationFrame(() => {
      recomputeTrackWidth()
    })
    return () => cancelAnimationFrame(raf)
  }, [mounted, metrics.visible, recomputeTrackWidth])

  React.useEffect(() => {
    const target = targetRef.current
    if (!target) {
      const raf = window.requestAnimationFrame(() => {
        recomputeTargetMetrics()
        recomputeTrackWidth()
      })
      return () => cancelAnimationFrame(raf)
    }

    recomputeTargetMetrics()
    recomputeTrackWidth()

    let rafId: number | null = null
    const onScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(() => {
        recomputeTargetMetrics()
        rafId = null
      })
    }

    target.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", recomputeTargetMetrics)
    window.addEventListener("resize", recomputeTrackWidth)

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            recomputeTargetMetrics()
            recomputeTrackWidth()
          })
        : null

    resizeObserver?.observe(target)
    if (target.firstElementChild instanceof HTMLElement) {
      resizeObserver?.observe(target.firstElementChild)
    }
    if (trackRef.current) {
      resizeObserver?.observe(trackRef.current)
    }

    return () => {
      target.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", recomputeTargetMetrics)
      window.removeEventListener("resize", recomputeTrackWidth)
      resizeObserver?.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [metrics.visible, recomputeTargetMetrics, recomputeTrackWidth, targetRef])

  React.useEffect(() => {
    if (!isDragging) return

    const prevUserSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"

    return () => {
      document.body.style.userSelect = prevUserSelect
      document.body.style.cursor = prevCursor
    }
  }, [isDragging])

  React.useEffect(() => {
    if (!isActive) return

    const handlePointerDownOutside = (event: PointerEvent) => {
      const root = rootRef.current
      if (!root) return
      if (event.target instanceof Node && root.contains(event.target)) return
      setIsActive(false)
    }

    document.addEventListener("pointerdown", handlePointerDownOutside, true)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside, true)
    }
  }, [isActive])

  React.useEffect(() => {
    if (!isActive) return

    const handleWheel = (event: WheelEvent) => {
      const target = targetRef.current
      if (!target) return

      const currentMaxScroll = Math.max(target.scrollWidth - target.clientWidth, 0)
      if (currentMaxScroll <= 0) return
      if (event.ctrlKey) return

      const delta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (!delta) return

      event.preventDefault()
      target.scrollLeft += delta
    }

    window.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      window.removeEventListener("wheel", handleWheel)
    }
  }, [isActive, targetRef])

  React.useEffect(() => {
    if (metrics.visible) return
    setIsActive(false)
    setIsDragging(false)
  }, [metrics.visible])

  const setTargetScrollFromThumb = React.useCallback(
    (nextThumbLeft: number) => {
      const target = targetRef.current
      if (!target) return
      if (maxThumbTravel <= 0 || maxScroll <= 0) return

      const clampedThumbLeft = clamp(nextThumbLeft, 0, maxThumbTravel)
      const ratio = clampedThumbLeft / maxThumbTravel
      target.scrollLeft = ratio * maxScroll
    },
    [maxScroll, maxThumbTravel, targetRef]
  )

  const handleThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!metrics.visible) return
    event.preventDefault()
    event.stopPropagation()
    setIsActive(true)

    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startThumbLeft: thumbLeft,
    }
    setIsDragging(true)

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleThumbPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || dragRef.current.pointerId !== event.pointerId) return
    const deltaX = event.clientX - dragRef.current.startX
    setTargetScrollFromThumb(dragRef.current.startThumbLeft + deltaX)
  }

  const stopDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.pointerId !== event.pointerId) return
    dragRef.current.active = false
    dragRef.current.pointerId = -1
    setIsDragging(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  const handleThumbKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const target = targetRef.current
    if (!target) return

    const step = Math.max(target.clientWidth * 0.2, 48)
    if (event.key === "ArrowRight") {
      event.preventDefault()
      target.scrollLeft += step
    } else if (event.key === "ArrowLeft") {
      event.preventDefault()
      target.scrollLeft -= step
    } else if (event.key === "Home") {
      event.preventDefault()
      target.scrollLeft = 0
    } else if (event.key === "End") {
      event.preventDefault()
      target.scrollLeft = target.scrollWidth
    }
  }

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!trackRef.current) return
    if (event.target === thumbRef.current) return
    setIsActive(true)

    const rect = trackRef.current.getBoundingClientRect()
    const clickX = event.clientX - rect.left
    setTargetScrollFromThumb(clickX - effectiveThumbWidth / 2)
  }

  if (!mounted || !metrics.visible || maxScroll <= 0) return null

  return createPortal(
    <div
      ref={rootRef}
      className={cn(styles.root, isActive && styles.active)}
      data-active={isActive ? "true" : "false"}
    >
      <div
        className={styles.inner}
        style={
          {
            ["--mj-board-scroll-track-padding" as string]: `${trackPadding}px`,
          } as React.CSSProperties
        }
      >
        <div
          ref={trackRef}
          className={styles.track}
          onClick={() => setIsActive(true)}
          onPointerDown={handleTrackPointerDown}
        >
          <div
            ref={thumbRef}
            role="scrollbar"
            aria-label="Board horizontal scrollbar"
            aria-orientation="horizontal"
            aria-controls={controlledElementId}
            aria-valuemin={0}
            aria-valuemax={Math.round(maxScroll)}
            aria-valuenow={Math.round(metrics.scrollLeft)}
            tabIndex={0}
            className={styles.thumb}
            style={{
              width: effectiveThumbWidth,
              transform: `translateX(${thumbLeft}px)`,
            }}
            onFocus={() => setIsActive(true)}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={stopDrag}
            onPointerCancel={stopDrag}
            onKeyDown={handleThumbKeyDown}
          />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BottomHScrollbar
