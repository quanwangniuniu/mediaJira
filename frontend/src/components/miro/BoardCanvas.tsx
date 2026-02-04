"use client";

import React, { useRef, useMemo, useCallback, useEffect, useState } from "react";
import { BoardItem } from "@/lib/api/miroApi";
import { Viewport } from "./hooks/useBoardViewport";
import { useItemDrag } from "./hooks/useItemDrag";
import { useItemResize } from "./hooks/useItemResize";
import { useFreehandDrawing } from "./hooks/useFreehandDrawing";
import BoardItemContainer from "./items/BoardItemContainer";
import InlineContentEditor from "./InlineContentEditor";
import { ToolType } from "./hooks/useToolDnD";

interface BoardCanvasProps {
  viewport: Viewport;
  items: BoardItem[];
  selectedItemId: string | null;
  activeTool: ToolType;
  onItemSelect: (itemId: string | null) => void;
  onItemUpdate: (itemId: string, updates: Partial<BoardItem>) => void;
  onItemUpdateOptimistic: (itemId: string, updates: Partial<BoardItem>) => () => void;
  onItemUpdateAsync: (itemId: string, updates: Partial<BoardItem>, rollback: () => void) => Promise<BoardItem>;
  onPanStart: (x: number, y: number) => void;
  onPanUpdate: (x: number, y: number) => void;
  onPanEnd: () => void;
  onZoom: (mouseX: number, mouseY: number, delta: number) => void;
  onItemCreate?: (toolType: ToolType, worldX: number, worldY: number) => void;
  onFreehandCreate?: (data: { x: number; y: number; width: number; height: number; style: { svgPath: string; strokeColor: string; strokeWidth: number } }) => void;
  width: number;
  height: number;
  canvasRef: React.RefObject<HTMLDivElement>;
  brushSettings?: {
    strokeColor: string;
    strokeWidth: number;
  };
}

export default function BoardCanvas({
  viewport,
  items,
  selectedItemId,
  activeTool,
  onItemSelect,
  onItemUpdate,
  onItemUpdateOptimistic,
  onItemUpdateAsync,
  onPanStart,
  onPanUpdate,
  onPanEnd,
  onZoom,
  onItemCreate,
  onFreehandCreate,
  width,
  height,
  canvasRef,
  brushSettings,
}: BoardCanvasProps) {
  const isPanningRef = useRef(false);
  
  // Inline editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string>("");

  // Start editing an item
  const startEditing = useCallback((item: BoardItem) => {
    setEditingItemId(item.id);
    setDraftContent(item.content || "");
  }, []);

  // Commit editing (save changes)
  const commitEditing = useCallback(() => {
    if (!editingItemId) return;

    const originalContent = items.find((i) => i.id === editingItemId)?.content || "";
    if (draftContent === originalContent) {
      // No changes, just close
      setEditingItemId(null);
      setDraftContent("");
      return;
    }

    // Optimistic update
    const rollback = onItemUpdateOptimistic(editingItemId, { content: draftContent });

    // Async update
    onItemUpdateAsync(editingItemId, { content: draftContent }, rollback).catch((err) => {
      console.error("Failed to persist content edit:", err);
    });

    setEditingItemId(null);
    setDraftContent("");
  }, [editingItemId, draftContent, items, onItemUpdateOptimistic, onItemUpdateAsync]);

  // Cancel editing (discard changes)
  const cancelEditing = useCallback(() => {
    setEditingItemId(null);
    setDraftContent("");
  }, []);
  
  const {
    startDrag,
    updateDrag,
    endDrag,
    getOverridePosition,
    isDragging,
  } = useItemDrag();

  const {
    startResize,
    updateResize,
    endResize,
    getOverrideSize,
    isResizing,
  } = useItemResize();

  // Compute editor screen position for editing item
  const editorRect = useMemo(() => {
    if (!editingItemId || !canvasRef.current) return null;

    const editingItem = items.find((i) => i.id === editingItemId);
    if (!editingItem) return null;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const overridePosition = getOverridePosition(editingItemId);
    const overrideSize = getOverrideSize(editingItemId, viewport.zoom, editingItem.type);

    const itemX = overrideSize?.x ?? overridePosition?.x ?? editingItem.x;
    const itemY = overrideSize?.y ?? overridePosition?.y ?? editingItem.y;
    const itemWidth = overrideSize?.width ?? editingItem.width;
    const itemHeight = overrideSize?.height ?? editingItem.height;

    // Convert world coordinates to screen coordinates
    const screenX = itemX * viewport.zoom + viewport.x;
    const screenY = itemY * viewport.zoom + viewport.y;
    const screenWidth = itemWidth * viewport.zoom;
    const screenHeight = itemHeight * viewport.zoom;

    // Convert to fixed position relative to viewport
    return {
      left: canvasRect.left + screenX,
      top: canvasRect.top + screenY,
      width: screenWidth,
      height: screenHeight,
    };
  }, [editingItemId, items, viewport, canvasRef, getOverridePosition, getOverrideSize]);

  // Viewport culling: only render visible items
  // Sort items so that frames render first, then their children render on top
  const visibleItems = useMemo(() => {
    // If we don't know the canvas size yet, skip culling so items can still mount.
    // This avoids "items appear only after Inspect/DevTools resize" glitches.
    if (width <= 0 || height <= 0) {
      const filtered = items.filter((item) => !item.is_deleted);
      return filtered.sort((a, b) => {
        const aIsFrame = a.type === 'frame';
        const bIsFrame = b.type === 'frame';
        const aHasParent = !!a.parent_item_id;
        const bHasParent = !!b.parent_item_id;

        if (aIsFrame && !bIsFrame) return -1;
        if (!aIsFrame && bIsFrame) return 1;

        if (aHasParent && !bHasParent && !aIsFrame && !bIsFrame) return 1;
        if (!aHasParent && bHasParent && !aIsFrame && !bIsFrame) return -1;

        if (a.z_index !== b.z_index) {
          return a.z_index - b.z_index;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
    }

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

    const filtered = items.filter((item) => {
      if (item.is_deleted) return false;
      return (
        item.x + item.width >= topLeft.x - bufferWorld &&
        item.x <= bottomRight.x + bufferWorld &&
        item.y + item.height >= topLeft.y - bufferWorld &&
        item.y <= bottomRight.y + bufferWorld
      );
    });

    // Sort: frames first, then items without parent, then items with parent (children on top)
    // Within each group, sort by z_index
    return filtered.sort((a, b) => {
      const aIsFrame = a.type === 'frame';
      const bIsFrame = b.type === 'frame';
      const aHasParent = !!a.parent_item_id;
      const bHasParent = !!b.parent_item_id;

      // Frames render first (lowest z-order)
      if (aIsFrame && !bIsFrame) return -1;
      if (!aIsFrame && bIsFrame) return 1;

      // Items with parent (children) render last (highest z-order, on top of frames)
      if (aHasParent && !bHasParent && !aIsFrame && !bIsFrame) return 1;
      if (!aHasParent && bHasParent && !aIsFrame && !bIsFrame) return -1;

      // Within same group (both frames, both with parent, or both without parent), sort by z_index
      if (a.z_index !== b.z_index) {
        return a.z_index - b.z_index;
      }
      // Fallback to creation time for stable ordering
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [items, viewport, width, height]);

  // Handle mouse wheel zoom (native listener, non-passive so preventDefault works)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomDelta = -e.deltaY * 0.001;
      onZoom(mouseX, mouseY, zoomDelta);
    };

    el.addEventListener("wheel", wheelHandler, { passive: false });
    return () => el.removeEventListener("wheel", wheelHandler as any);
  }, [onZoom]);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - viewport.x) / viewport.zoom,
        y: (screenY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      return {
        x: worldX * viewport.zoom + viewport.x,
        y: worldY * viewport.zoom + viewport.y,
      };
    },
    [viewport]
  );

  // Freehand drawing hook
  const {
    freehandDraft,
    isDrawingFreehand,
    svgPathRef,
    handleFreehandMouseDown,
    handleFreehandMouseMove,
    handleFreehandMouseUp,
  } = useFreehandDrawing({
    activeTool,
    canvasRef,
    screenToWorld,
    worldToScreen,
    brushSettings,
    onFreehandCreate,
  });

  // Handle pan (click and drag on background)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const targetEl = e.target as HTMLElement | null;
      const isBackground = !targetEl?.closest?.('[data-board-item="true"]');

      // If we're editing content, only clicking the canvas background should commit.
      // Clicking inside the editor (or on items) should NOT immediately commit.
      if (editingItemId) {
        if (isBackground) {
          commitEditing();
        }
        return;
      }

      // Don't start panning if we're dragging an item
      if (isDragging) return;
      
      // Connector tool handles events in capture phase, so we don't need to handle it here
      
      // If freehand tool is active, start drawing instead of panning
      if (activeTool === "freehand") {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'BoardCanvas.tsx:294',message:'handleMouseDown calling handleFreehandMouseDown',data:{activeTool,isBackground,hasHandleFreehandMouseDown:!!handleFreehandMouseDown},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        handleFreehandMouseDown(e, isBackground);
        return;
      }
      
      if (isBackground) {
        // In select mode, clicking background should clear selection (and allow drag-to-pan immediately).
        if (activeTool === "select") {
          onItemSelect(null);
        }
        isPanningRef.current = true;
        onPanStart(e.clientX, e.clientY);
        e.preventDefault();
      }
    },
    [editingItemId, commitEditing, isDragging, activeTool, onItemSelect, onPanStart, handleFreehandMouseDown]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Connector tool handles events in capture phase, so we don't need to handle it here
      
      // Freehand drawing is handled by global mouse event listeners for better tracking
      handleFreehandMouseMove(e);
      
      if (isPanningRef.current) {
        onPanUpdate(e.clientX, e.clientY);
      }
    },
    [onPanUpdate, handleFreehandMouseMove]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Connector tool handles events in capture phase, so we don't need to handle it here
      
      // Handle freehand drawing mouse up
      handleFreehandMouseUp(e);
      
      if (isPanningRef.current) {
        isPanningRef.current = false;
        onPanEnd();
      }
    },
    [onPanEnd, handleFreehandMouseUp]
  );

  // Handle canvas click (deselect)
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const targetEl = e.target as HTMLElement | null;
      const isBackground = !targetEl?.closest?.('[data-board-item="true"]');
      if (isBackground) onItemSelect(null);
    },
    [onItemSelect]
  );

  // Handle drop to create item
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      const toolType = e.dataTransfer.getData("toolType");
      const source = e.dataTransfer.getData("source");
      
      if (source !== "toolbar" || !toolType || !onItemCreate || !canvasRef.current) {
        return;
      }

          const rect = canvasRef.current.getBoundingClientRect();
          const screenX = e.clientX - rect.left;
          const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld(screenX, screenY);

      onItemCreate(toolType as ToolType, worldPoint.x, worldPoint.y);
    },
    [onItemCreate, screenToWorld]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const source = e.dataTransfer.getData("source");
    if (source === "toolbar") {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  // Helper: check if item is inside frame bounds
  const isItemInsideFrame = useCallback((item: BoardItem, frame: BoardItem): boolean => {
    const itemLeft = item.x;
    const itemRight = item.x + item.width;
    const itemTop = item.y;
    const itemBottom = item.y + item.height;
    
    const frameLeft = frame.x;
    const frameRight = frame.x + frame.width;
    const frameTop = frame.y;
    const frameBottom = frame.y + frame.height;
    
    // Check if item is fully inside frame
    return (
      itemLeft >= frameLeft &&
      itemRight <= frameRight &&
      itemTop >= frameTop &&
      itemBottom <= frameBottom
    );
  }, []);

  // Helper: find frame that contains the item
  const findContainingFrame = useCallback((item: BoardItem): BoardItem | null => {
    // Find all frames
    const frames = items.filter((i) => i.type === 'frame' && !i.is_deleted);
    
    // Find the frame that contains this item (item must be fully inside)
    for (const frame of frames) {
      if (frame.id !== item.id && isItemInsideFrame(item, frame)) {
        return frame;
      }
    }
    
    return null;
  }, [items, isItemInsideFrame]);

  // Handle item resize commit (optimistic update + async PATCH)
  const handleItemResizeEnd = useCallback(() => {
    const result = endResize(viewport.zoom);
    if (!result) return;

    const resizedItem = items.find((i) => i.id === result.itemId);
    if (!resizedItem) return;

    // For connector/line, only update width (keep height fixed)
    const updates: Partial<BoardItem> = {
      x: result.newX,
      y: result.newY,
      width: result.newWidth,
      height: resizedItem.type === 'connector' || resizedItem.type === 'line' 
        ? resizedItem.height 
        : result.newHeight,
          };

    // Optimistic update
    const rollback = onItemUpdateOptimistic(result.itemId, updates);

    // Async PATCH
    onItemUpdateAsync(result.itemId, updates, rollback).catch((err) => {
      console.error('Failed to persist item resize:', err);
    });
  }, [endResize, onItemUpdateOptimistic, onItemUpdateAsync, items]);

  // Handle item drag commit (optimistic update + async PATCH)
  const handleItemDragEnd = useCallback(() => {
    const result = endDrag();
    if (!result) return;

    const movedItem = items.find((i) => i.id === result.itemId);
    if (!movedItem) return;

    // Compute new position
    const newItemData = {
      ...movedItem,
      x: result.newX,
      y: result.newY,
    };

    // If item is a frame, move all its children with it
    if (movedItem.type === 'frame') {
      const deltaX = result.newX - movedItem.x;
      const deltaY = result.newY - movedItem.y;
      
      // Find all child items
      const childItems = items.filter(
        (i) => i.parent_item_id === movedItem.id && !i.is_deleted
      );

      // Optimistically update frame position
      const frameRollback = onItemUpdateOptimistic(result.itemId, {
        x: result.newX,
        y: result.newY,
      });

      // Optimistically update all children and collect rollbacks
      const childRollbacksMap = new Map<string, () => void>();
      childItems.forEach((child) => {
        const childRollback = onItemUpdateOptimistic(child.id, {
          x: child.x + deltaX,
          y: child.y + deltaY,
        });
        childRollbacksMap.set(child.id, childRollback);
      });

      // Async update frame
      onItemUpdateAsync(result.itemId, {
        x: result.newX,
        y: result.newY,
      }, frameRollback).catch((err) => {
        console.error('Failed to persist frame move:', err);
      });

      // Async update all children
      childItems.forEach((child) => {
        const childRollback = childRollbacksMap.get(child.id);
        if (!childRollback) return;
        
        onItemUpdateAsync(child.id, {
          x: child.x + deltaX,
          y: child.y + deltaY,
        }, childRollback).catch((err) => {
          console.error(`Failed to persist child ${child.id} move:`, err);
        });
      });
    } else {
      // For non-frame items, check if they're inside a frame
      const containingFrame = findContainingFrame(newItemData);
      const newParentId = containingFrame ? containingFrame.id : null;
      
      // Only update parent if it changed
      const needsParentUpdate = movedItem.parent_item_id !== newParentId;
      
      // Optimistically update position
      const positionRollback = onItemUpdateOptimistic(result.itemId, {
        x: result.newX,
        y: result.newY,
        ...(needsParentUpdate && { parent_item_id: newParentId }),
      });

      // Async update
      onItemUpdateAsync(result.itemId, {
        x: result.newX,
        y: result.newY,
        ...(needsParentUpdate && { parent_item_id: newParentId }),
      }, positionRollback).catch((err) => {
        console.error('Failed to persist item move:', err);
      });
    }
  }, [endDrag, onItemUpdateOptimistic, onItemUpdateAsync, items, findContainingFrame]);

  const canvasStyle: React.CSSProperties = {
    transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    transformOrigin: "0 0",
    willChange: "transform",
  };

  return (
    <div
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden bg-gray-50 cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
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
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />

      {/* Canvas content */}
      <div
        className="absolute inset-0"
        style={canvasStyle}
      >
        {/* Render visible items */}
        {visibleItems.map((item) => {
          const overridePosition = getOverridePosition(item.id);
          const overrideSize = getOverrideSize(item.id, viewport.zoom, item.type);
          const isEditing = editingItemId === item.id;
          return (
            <BoardItemContainer
            key={item.id}
            item={item}
              viewport={viewport}
              canvasRef={canvasRef}
            isSelected={selectedItemId === item.id}
              overridePosition={overridePosition}
              overrideSize={overrideSize}
              activeTool={activeTool}
              // Allow dragging items with any tool (freehand tool handles background drawing separately)
              // Only disable dragging when editing item content
              disableDrag={isEditing}
              disableResize={isEditing}
            onSelect={() => onItemSelect(item.id)}
            onUpdate={(updates) => onItemUpdate(item.id, updates)}
              onRequestEdit={() => startEditing(item)}
              onDragStart={startDrag}
              onDragMove={updateDrag}
              onDragEnd={handleItemDragEnd}
              onResizeStart={startResize}
              onResizeMove={updateResize}
              onResizeEnd={handleItemResizeEnd}
          />
          );
        })}
      </div>

      {/* Freehand draft overlay (in screen coordinates, not world) */}
      {freehandDraft.length > 0 && brushSettings && (
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10 }}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
        >
          <path
            ref={svgPathRef}
            fill="none"
            stroke={brushSettings.strokeColor}
            strokeWidth={brushSettings.strokeWidth * viewport.zoom}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {/* Inline content editor overlay */}
      {editingItemId && editorRect && (
        <InlineContentEditor
          rect={editorRect}
          value={draftContent}
          onChange={setDraftContent}
          onCommit={commitEditing}
          onCancel={cancelEditing}
          multiline={
            items.find((i) => i.id === editingItemId)?.type === "sticky_note" ||
            items.find((i) => i.id === editingItemId)?.type === "shape"
          }
        />
      )}
    </div>
  );
}

