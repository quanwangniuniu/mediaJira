"use client";

import React, { useCallback, memo } from "react";
import { BoardItem } from "@/lib/api/miroApi";
import { Viewport } from "../hooks/useBoardViewport";
import BoardItemRenderer from "./BoardItemRenderer";

interface BoardItemContainerProps {
  item: BoardItem;
  viewport: Viewport;
  canvasRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  overridePosition: { x: number; y: number } | null;
  disableDrag?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
  onDragStart: (itemId: string, itemX: number, itemY: number, worldX: number, worldY: number) => void;
  onDragMove: (worldX: number, worldY: number) => void;
  onDragEnd: () => void;
}

const BoardItemContainer = memo(function BoardItemContainer({
  item,
  viewport,
  canvasRef,
  isSelected,
  overridePosition,
  disableDrag = false,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: BoardItemContainerProps) {
  // Treat pointer interaction as click by default; only become a drag after moving past a small threshold.
  const isDraggingRef = React.useRef(false);
  const dragActivatedRef = React.useRef(false);
  const startClientRef = React.useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 3;

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      return {
        x: (screenX - viewport.x) / viewport.zoom,
        y: (screenY - viewport.y) / viewport.zoom,
      };
    },
    [viewport, canvasRef]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      // Select immediately so properties panel opens without waiting for click.
      onSelect();

      if (disableDrag) {
        return;
      }

      startClientRef.current = { x: e.clientX, y: e.clientY };
      dragActivatedRef.current = false;
      isDraggingRef.current = true;

      const currentX = overridePosition?.x ?? item.x;
      const currentY = overridePosition?.y ?? item.y;
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [item, overridePosition, onSelect, disableDrag]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disableDrag) return;
      if (!isDraggingRef.current) return;
      const start = startClientRef.current;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const movedFarEnough = Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX;

      // Activate drag only after threshold so clicks don't trigger drag + PATCH.
      if (!dragActivatedRef.current) {
        if (!movedFarEnough) return;
        dragActivatedRef.current = true;

        const world = screenToWorld(start.x, start.y);
        const currentX = overridePosition?.x ?? item.x;
        const currentY = overridePosition?.y ?? item.y;
        onDragStart(item.id, currentX, currentY, world.x, world.y);
      }

      const world = screenToWorld(e.clientX, e.clientY);
      onDragMove(world.x, world.y);
    },
    [screenToWorld, onDragMove, onDragStart, item, overridePosition, disableDrag]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (disableDrag) return;
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        startClientRef.current = null;

        if (dragActivatedRef.current) {
          dragActivatedRef.current = false;
          onDragEnd();
        } else {
          dragActivatedRef.current = false;
        }
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [onDragEnd, disableDrag]
  );

  const currentX = overridePosition?.x ?? item.x;
  const currentY = overridePosition?.y ?? item.y;

  const itemStyle: React.CSSProperties = {
    position: "absolute",
    left: `${currentX}px`,
    top: `${currentY}px`,
    width: `${item.width}px`,
    height: `${item.height}px`,
    transform: `rotate(${item.rotation || 0}deg)`,
    zIndex: item.z_index,
    cursor: "move",
  };

  return (
    <div
      style={itemStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <BoardItemRenderer
        item={item}
        isSelected={isSelected}
        onSelect={onSelect}
        onUpdate={onUpdate}
      />
    </div>
  );
});

export default BoardItemContainer;

