"use client";

import React, { useRef, useMemo, useCallback } from "react";
import { BoardItem } from "@/lib/api/miroApi";
import { Viewport } from "./hooks/useBoardViewport";
import BaseBoardItem from "./items/BaseBoardItem";

interface BoardCanvasProps {
  viewport: Viewport;
  items: BoardItem[];
  selectedItemId: string | null;
  onItemSelect: (itemId: string | null) => void;
  onItemUpdate: (itemId: string, updates: Partial<BoardItem>) => void;
  onPanStart: (x: number, y: number) => void;
  onPanUpdate: (x: number, y: number) => void;
  onPanEnd: () => void;
  onZoom: (mouseX: number, mouseY: number, delta: number) => void;
  onCanvasClick?: (worldX: number, worldY: number) => void;
  width: number;
  height: number;
}

export default function BoardCanvas({
  viewport,
  items,
  selectedItemId,
  onItemSelect,
  onItemUpdate,
  onPanStart,
  onPanUpdate,
  onPanEnd,
  onZoom,
  onCanvasClick,
  width,
  height,
}: BoardCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);

  // Viewport culling: only render visible items
  const visibleItems = useMemo(() => {
    const buffer = 100; // pixels
    const bufferWorld = buffer / viewport.zoom;

    // Calculate visible world bounds
    const topLeft = {
      x: (0 - viewport.x) / viewport.zoom,
      y: (0 - viewport.y) / viewport.zoom,
    };
    const bottomRight = {
      x: (width - viewport.x) / viewport.zoom,
      y: (height - viewport.y) / viewport.zoom,
    };

    return items.filter((item) => {
      if (item.is_deleted) return false;
      return (
        item.x + item.width >= topLeft.x - bufferWorld &&
        item.x <= bottomRight.x + bufferWorld &&
        item.y + item.height >= topLeft.y - bufferWorld &&
        item.y <= bottomRight.y + bufferWorld
      );
    });
  }, [items, viewport, width, height]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomDelta = -e.deltaY * 0.001;
      onZoom(mouseX, mouseY, zoomDelta);
    },
    [onZoom]
  );

  // Handle pan (click and drag on background)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
        isPanningRef.current = true;
        onPanStart(e.clientX, e.clientY);
        e.preventDefault();
      }
    },
    [onPanStart]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isPanningRef.current) {
        onPanUpdate(e.clientX, e.clientY);
      }
    },
    [onPanUpdate]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      onPanEnd();
    }
  }, [onPanEnd]);

  // Handle canvas click (deselect or create item)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('canvas-background')) {
        if (onCanvasClick && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
          const worldPoint = {
            x: (screenX - viewport.x) / viewport.zoom,
            y: (screenY - viewport.y) / viewport.zoom,
          };
          onCanvasClick(worldPoint.x, worldPoint.y);
        } else {
          onItemSelect(null);
        }
      }
    },
    [onItemSelect, onCanvasClick, viewport]
  );

  const canvasStyle: React.CSSProperties = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: "0 0",
    willChange: "transform",
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Grid background */}
      <div
        className="canvas-background absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
        }}
      />

      {/* Canvas content */}
      <div
        className="absolute inset-0"
        style={canvasStyle}
      >
        {/* Render visible items */}
        {visibleItems.map((item) => (
          <BaseBoardItem
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            onSelect={() => onItemSelect(item.id)}
            onUpdate={(updates) => onItemUpdate(item.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}

