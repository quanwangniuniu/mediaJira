import type { HandlePosition } from "@/types/workflow";

/**
 * Calculate the optimal handle positions for a connection based on node positions
 * This creates natural-looking connections that avoid overlaps
 */
export function calculateOptimalHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: HandlePosition; targetHandle: HandlePosition } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  
  // Calculate the angle from source to target
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // Determine handles based on relative position
  // Using a simple quadrant-based approach
  
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal dominance
    if (dx > 0) {
      // Target is to the right
      return { sourceHandle: 'right', targetHandle: 'left' };
    } else {
      // Target is to the left
      return { sourceHandle: 'left', targetHandle: 'right' };
    }
  } else {
    // Vertical dominance
    if (dy > 0) {
      // Target is below
      return { sourceHandle: 'bottom', targetHandle: 'top' };
    } else {
      // Target is above
      return { sourceHandle: 'top', targetHandle: 'bottom' };
    }
  }
}

/**
 * Get the opposite handle position
 */
export function getOppositeHandle(handle: HandlePosition): HandlePosition {
  const opposites: Record<HandlePosition, HandlePosition> = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left',
  };
  return opposites[handle];
}


