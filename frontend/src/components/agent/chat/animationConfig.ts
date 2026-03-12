// Spring transition presets
export const SPRING = {
  open: { type: "spring" as const, stiffness: 300, damping: 28 },
  close: { type: "spring" as const, stiffness: 350, damping: 32 },
  maximize: { type: "spring" as const, stiffness: 280, damping: 26 },
  snap: { type: "spring" as const, stiffness: 400, damping: 35 },
}

// Floating window dimensions
export const FLOATING_SIZE = { width: 420, height: 560 }

// Layout constants
export const SIDEBAR_WIDTH = 240   // w-60
export const TOPBAR_HEIGHT = 48    // h-12
export const RIGHT_PANEL_WIDTH = 320 // w-80
export const MAGNETIC_THRESHOLD = 80 // px — snap zone detection range

/** Compute the default floating window position (bottom-right of content area). */
export function getFloatingPosition(isRightPanelOpen: boolean) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280
  const vh = typeof window !== "undefined" ? window.innerHeight : 800
  const rightOffset = isRightPanelOpen ? RIGHT_PANEL_WIDTH : 0

  return {
    x: vw - rightOffset - FLOATING_SIZE.width - 24,
    y: vh - FLOATING_SIZE.height - 24,
  }
}

/** Compute maximized window bounds (fills content area right of sidebar, below topbar). */
export function getMaximizedBounds(isRightPanelOpen: boolean) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280
  const vh = typeof window !== "undefined" ? window.innerHeight : 800
  const rightOffset = isRightPanelOpen ? RIGHT_PANEL_WIDTH : 0

  return {
    x: SIDEBAR_WIDTH,
    y: TOPBAR_HEIGHT,
    width: vw - SIDEBAR_WIDTH - rightOffset,
    height: vh - TOPBAR_HEIGHT,
  }
}
