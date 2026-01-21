"use client";

import React, { useCallback, memo } from "react";
import { BoardItem } from "@/lib/api/miroApi";
import { Viewport } from "../hooks/useBoardViewport";
import BoardItemRenderer from "./BoardItemRenderer";

type ResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface BoardItemContainerProps {
  item: BoardItem;
  viewport: Viewport;
  canvasRef: React.RefObject<HTMLDivElement>;
  isSelected: boolean;
  overridePosition: { x: number; y: number } | null;
  overrideSize?: { x: number; y: number; width: number; height: number } | null;
  disableDrag?: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
  onDragStart: (itemId: string, itemX: number, itemY: number, worldX: number, worldY: number) => void;
  onDragMove: (worldX: number, worldY: number) => void;
  onDragEnd: () => void;
  onResizeStart: (itemId: string, corner: ResizeCorner, itemX: number, itemY: number, itemWidth: number, itemHeight: number, clientX: number, clientY: number) => void;
  onResizeMove: (clientX: number, clientY: number) => void;
  onResizeEnd: () => void;
}

const BoardItemContainer = memo(function BoardItemContainer({
  item,
  viewport,
  canvasRef,
  isSelected,
  overridePosition,
  overrideSize,
  disableDrag = false,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: BoardItemContainerProps) {
  // Treat pointer interaction as click by default; only become a drag after moving past a small threshold.
  const isDraggingRef = React.useRef(false);
  const dragActivatedRef = React.useRef(false);
  const startClientRef = React.useRef<{ x: number; y: number } | null>(null);
  const DRAG_THRESHOLD_PX = 3;

  // Resize state
  const isResizingRef = React.useRef(false);
  const resizeCornerRef = React.useRef<ResizeCorner | null>(null);

  const cleanupPointerInteraction = useCallback((target: Element, pointerId?: number) => {
    isDraggingRef.current = false;
    dragActivatedRef.current = false;
    startClientRef.current = null;

    if (typeof pointerId === "number") {
      try {
        if ((target as any).hasPointerCapture?.(pointerId)) {
          (target as any).releasePointerCapture?.(pointerId);
        }
      } catch {
        // no-op: avoid blocking UI if browser throws
      }
    }
  }, []);

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

  const handleResizeHandleDown = useCallback(
    (e: React.PointerEvent, corner: ResizeCorner) => {
      e.stopPropagation();
      e.preventDefault();

      isResizingRef.current = true;
      resizeCornerRef.current = corner;

      const currentX = overrideSize?.x ?? overridePosition?.x ?? item.x;
      const currentY = overrideSize?.y ?? overridePosition?.y ?? item.y;
      const currentWidth = overrideSize?.width ?? item.width;
      const currentHeight = overrideSize?.height ?? item.height;

      onResizeStart(
        item.id,
        corner,
        currentX,
        currentY,
        currentWidth,
        currentHeight,
        e.clientX,
        e.clientY
      );

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [item, overridePosition, overrideSize, onResizeStart]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't start drag if clicking on a resize handle
      if ((e.target as HTMLElement).classList.contains('resize-handle')) {
        return;
      }

      e.stopPropagation();
      // Select immediately so properties panel opens without waiting for click.
      onSelect();

      if (disableDrag) {
        return;
      }

      startClientRef.current = { x: e.clientX, y: e.clientY };
      dragActivatedRef.current = false;
      isDraggingRef.current = true;

      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [onSelect, disableDrag]
  );

  const handleResizeHandleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizingRef.current) return;
      onResizeMove(e.clientX, e.clientY);
    },
    [onResizeMove]
  );

  const handleResizeHandleUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      resizeCornerRef.current = null;
      onResizeEnd();
      e.currentTarget.releasePointerCapture(e.pointerId);
    },
    [onResizeEnd]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Handle resize if active
      if (isResizingRef.current) {
        handleResizeHandleMove(e);
        return;
      }

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
    [screenToWorld, onDragMove, onDragStart, item, overridePosition, disableDrag, handleResizeHandleMove]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Handle resize end if active
      if (isResizingRef.current) {
        handleResizeHandleUp(e);
        return;
      }

      if (disableDrag) return;
      if (!isDraggingRef.current) return;

      const wasDrag = dragActivatedRef.current;
      cleanupPointerInteraction(e.currentTarget, e.pointerId);
      if (wasDrag) onDragEnd();
    },
    [onDragEnd, disableDrag, cleanupPointerInteraction, handleResizeHandleUp]
  );

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (disableDrag) return;
      cleanupPointerInteraction(e.currentTarget, e.pointerId);
    },
    [disableDrag, cleanupPointerInteraction]
  );

  const handleLostPointerCapture = useCallback(
    (e: React.PointerEvent) => {
      if (disableDrag) return;
      cleanupPointerInteraction(e.currentTarget, e.pointerId);
    },
    [disableDrag, cleanupPointerInteraction]
  );

  const currentX = overrideSize?.x ?? overridePosition?.x ?? item.x;
  const currentY = overrideSize?.y ?? overridePosition?.y ?? item.y;
  const currentWidth = overrideSize?.width ?? item.width;
  const currentHeight = overrideSize?.height ?? item.height;

  const itemStyle: React.CSSProperties = {
    position: "absolute",
    left: `${currentX}px`,
    top: `${currentY}px`,
    width: `${currentWidth}px`,
    height: `${currentHeight}px`,
    transform: `rotate(${item.rotation || 0}deg)`,
    zIndex: item.z_index,
    cursor: "move",
  };

  const HANDLE_SIZE = 8;
  const HANDLE_OFFSET = -HANDLE_SIZE / 2;

  const renderResizeHandles = () => {
    if (!isSelected) return null;

    const handles: Array<{ corner: ResizeCorner; style: React.CSSProperties }> = [
      {
        corner: 'top-left',
        style: {
          position: 'absolute',
          left: `${HANDLE_OFFSET}px`,
          top: `${HANDLE_OFFSET}px`,
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          borderRadius: '2px',
          cursor: 'nwse-resize',
          zIndex: 1000,
        },
      },
      {
        corner: 'top-right',
        style: {
          position: 'absolute',
          right: `${HANDLE_OFFSET}px`,
          top: `${HANDLE_OFFSET}px`,
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          borderRadius: '2px',
          cursor: 'nesw-resize',
          zIndex: 1000,
        },
      },
      {
        corner: 'bottom-left',
        style: {
          position: 'absolute',
          left: `${HANDLE_OFFSET}px`,
          bottom: `${HANDLE_OFFSET}px`,
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          borderRadius: '2px',
          cursor: 'nesw-resize',
          zIndex: 1000,
        },
      },
      {
        corner: 'bottom-right',
        style: {
          position: 'absolute',
          right: `${HANDLE_OFFSET}px`,
          bottom: `${HANDLE_OFFSET}px`,
          width: `${HANDLE_SIZE}px`,
          height: `${HANDLE_SIZE}px`,
          backgroundColor: '#3b82f6',
          border: '1px solid white',
          borderRadius: '2px',
          cursor: 'nwse-resize',
          zIndex: 1000,
        },
      },
    ];

    return (
      <>
        {handles.map(({ corner, style }) => (
          <div
            key={corner}
            className="resize-handle"
            style={style}
            onPointerDown={(e) => handleResizeHandleDown(e, corner)}
            onPointerMove={handleResizeHandleMove}
            onPointerUp={handleResizeHandleUp}
            onPointerCancel={handleResizeHandleUp}
            onLostPointerCapture={handleResizeHandleUp}
          />
        ))}
      </>
    );
  };

  return (
    <div
      style={itemStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
    >
      <BoardItemRenderer
        item={item}
        isSelected={isSelected}
        onSelect={onSelect}
        onUpdate={onUpdate}
      />
      {renderResizeHandles()}
    </div>
  );
});

export default BoardItemContainer;

