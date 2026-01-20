"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Layout from "@/components/layout/Layout";
import { miroApi, MiroBoard, BoardItem } from "@/lib/api/miroApi";
import { useBoardViewport, Viewport } from "@/components/miro/hooks/useBoardViewport";
import { useBoardItems } from "@/components/miro/hooks/useBoardItems";
import { ToolType } from "@/components/miro/hooks/useToolDnD";
import BoardCanvas from "@/components/miro/BoardCanvas";
import BoardHeader from "@/components/miro/BoardHeader";
import BoardToolbar from "@/components/miro/BoardToolbar";
import BoardPropertiesPanel from "@/components/miro/BoardPropertiesPanel";

export default function MiroBoardPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<MiroBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isSavingBoard, setIsSavingBoard] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Initialize viewport from board data
  const initialViewport: Viewport = board?.viewport
    ? {
        x: board.viewport.x || 0,
        y: board.viewport.y || 0,
        zoom: board.viewport.zoom || 1,
      }
    : { x: 0, y: 0, zoom: 1 };

  const {
    viewport,
    setViewport,
    screenToWorld,
    zoomAtPoint,
    startPan,
    updatePan,
    endPan,
  } = useBoardViewport(initialViewport);

  const {
    items,
    loading: itemsLoading,
    selectedItemId,
    setSelectedItemId,
    loadItems,
    createItem,
    updateItem,
    updateItemOptimistic,
    updateItemAsync,
    deleteItem,
  } = useBoardItems(boardId);

  // Load board data
  useEffect(() => {
    const loadBoard = async () => {
      setLoading(true);
      setError(null);
      try {
        const boardData = await miroApi.getBoard(boardId);
        setBoard(boardData);
        
        // Update viewport from board
        if (boardData.viewport) {
          setViewport({
            x: boardData.viewport.x || 0,
            y: boardData.viewport.y || 0,
            zoom: boardData.viewport.zoom || 1,
          });
        }
      } catch (err: any) {
        console.error("Failed to load board:", err);
        if (err?.status === 401) {
          window.location.href = "/login";
          return;
        }
        setError(err instanceof Error ? err.message : "Failed to load board");
      } finally {
        setLoading(false);
      }
    };

    if (boardId) {
      loadBoard();
      loadItems();
    }
  }, [boardId, loadItems, setViewport]);

  // Update canvas size on resize
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasContainerRef.current) {
        setCanvasSize({
          width: canvasContainerRef.current.clientWidth,
          height: canvasContainerRef.current.clientHeight,
        });
      }
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Debounced viewport save
  const viewportSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const saveViewport = useCallback(
    (newViewport: Viewport) => {
      if (viewportSaveTimeoutRef.current) {
        clearTimeout(viewportSaveTimeoutRef.current);
      }
      viewportSaveTimeoutRef.current = setTimeout(async () => {
        try {
          await miroApi.updateBoard(boardId, {
            viewport: {
              x: newViewport.x,
              y: newViewport.y,
              zoom: newViewport.zoom,
            },
          });
        } catch (err) {
          console.error("Failed to save viewport:", err);
        }
      }, 500);
    },
    [boardId]
  );

  // Handle viewport changes
  useEffect(() => {
    if (board) {
      saveViewport(viewport);
    }
  }, [viewport, board, saveViewport]);

  const handleSaveBoard = useCallback(async () => {
    if (!boardId) return;
    setIsSavingBoard(true);
    try {
      const updatedBoard = await miroApi.updateBoard(boardId, {
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
      });
      setBoard(updatedBoard);
    } catch (err) {
      console.error("Failed to save board:", err);
    } finally {
      setIsSavingBoard(false);
    }
  }, [boardId, viewport]);

  // Handle board title update
  const handleTitleChange = useCallback(
    async (newTitle: string) => {
      if (!board || newTitle === board.title) return;
      try {
        const updatedBoard = await miroApi.updateBoard(boardId, {
          title: newTitle,
        });
        setBoard(updatedBoard);
      } catch (err) {
        console.error("Failed to update board title:", err);
      }
    },
    [board, boardId]
  );

  // Handle item selection
  const handleItemSelect = useCallback((itemId: string | null) => {
    setSelectedItemId(itemId);
  }, [setSelectedItemId]);

  // Handle item update
  const handleItemUpdate = useCallback(
    async (itemId: string, updates: Partial<BoardItem>) => {
      try {
        await updateItem(itemId, updates);
      } catch (err) {
        console.error("Failed to update item:", err);
      }
    },
    [updateItem]
  );

  // Handle item delete
  const handleItemDelete = useCallback(async () => {
    if (!selectedItemId) return;
    try {
      await deleteItem(selectedItemId);
      setSelectedItemId(null);
    } catch (err) {
      console.error("Failed to delete item:", err);
    }
  }, [selectedItemId, deleteItem, setSelectedItemId]);

  // Handle item creation via drag-and-drop
  const handleItemCreate = useCallback(
    async (toolType: ToolType, worldX: number, worldY: number) => {
      if (toolType === "select") return;

      const defaultSizes: Record<string, { width: number; height: number }> = {
        text: { width: 200, height: 50 },
        shape: { width: 100, height: 100 },
        sticky_note: { width: 150, height: 150 },
        frame: { width: 300, height: 200 },
        line: { width: 100, height: 2 },
        connector: { width: 100, height: 2 },
        freehand: { width: 100, height: 100 },
      };

      const size = defaultSizes[toolType] || { width: 100, height: 100 };

      try {
        await createItem({
          type: toolType as BoardItem["type"],
          x: worldX,
          y: worldY,
          width: size.width,
          height: size.height,
          content: toolType === "text" || toolType === "sticky_note" ? "" : "",
          style: {},
          z_index: 0,
        });
        // Keep tool selected for potential repeated use
      } catch (err) {
        console.error("Failed to create item:", err);
      }
    },
    [createItem]
  );

  // Handle freehand creation
  const handleFreehandCreate = useCallback(
    async (data: {
      x: number;
      y: number;
      width: number;
      height: number;
      style: { svgPath: string; strokeColor: string; strokeWidth: number };
    }) => {
      try {
        await createItem({
          type: "freehand",
          x: data.x,
          y: data.y,
          width: data.width,
          height: data.height,
          content: "",
          style: data.style,
          z_index: 0,
        });
      } catch (err) {
        console.error("Failed to create freehand:", err);
      }
    },
    [createItem]
  );

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      zoomAtPoint(centerX, centerY, 0.2);
    }
  }, [zoomAtPoint]);

  const handleZoomOut = useCallback(() => {
    if (canvasContainerRef.current) {
      const rect = canvasContainerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      zoomAtPoint(centerX, centerY, -0.2);
    }
  }, [zoomAtPoint]);

  const handleFitToScreen = useCallback(() => {
    if (items.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const visibleItems = items.filter((item) => !item.is_deleted);
    if (visibleItems.length === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    let minX = Infinity,
      minY = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity;

    visibleItems.forEach((item) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    if (contentWidth === 0 || contentHeight === 0) {
      setViewport({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const padding = 50;
    const zoomX = (canvasSize.width - padding * 2) / contentWidth;
    const zoomY = (canvasSize.height - padding * 2) / contentHeight;
    const zoomUnclamped = Math.min(zoomX, zoomY, 1);
    const zoom = Math.max(0.5, Math.min(3, zoomUnclamped));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const x = canvasSize.width / 2 - centerX * zoom;
    const y = canvasSize.height / 2 - centerY * zoom;

    setViewport({ x, y, zoom });
  }, [items, canvasSize, setViewport]);

  // Pan handlers
  const handlePanStart = useCallback(
    (x: number, y: number) => {
      startPan(x, y);
    },
    [startPan]
  );

  const handlePanUpdate = useCallback(
    (x: number, y: number) => {
      updatePan(x, y);
    },
    [updatePan]
  );

  const handlePanEnd = useCallback(() => {
    endPan();
  }, [endPan]);

  // Zoom handler
  const handleZoom = useCallback(
    (mouseX: number, mouseY: number, delta: number) => {
      zoomAtPoint(mouseX, mouseY, delta);
    },
    [zoomAtPoint]
  );

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-gray-500">Loading board...</div>
        </div>
      </Layout>
    );
  }

  if (error || !board) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-screen">
          <div className="text-red-500 mb-4">
            {error || "Board not found"}
          </div>
          <button
            onClick={() => router.push("/miro")}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Back to Boards
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col h-screen">
        <BoardHeader
          title={board.title}
          onTitleChange={handleTitleChange}
          viewport={viewport}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onSave={handleSaveBoard}
          isSaving={isSavingBoard}
          shareToken={board.share_token}
        />

        <div className="flex flex-1 overflow-hidden">
          <BoardToolbar activeTool={activeTool} onToolChange={setActiveTool} />

          <div ref={canvasContainerRef} className="flex-1 relative">
            <BoardCanvas
              viewport={viewport}
              items={items}
              selectedItemId={selectedItemId}
              activeTool={activeTool}
              onItemSelect={handleItemSelect}
              onItemUpdate={handleItemUpdate}
              onItemUpdateOptimistic={updateItemOptimistic}
              onItemUpdateAsync={updateItemAsync}
              onPanStart={handlePanStart}
              onPanUpdate={handlePanUpdate}
              onPanEnd={handlePanEnd}
              onZoom={handleZoom}
              onItemCreate={handleItemCreate}
              onFreehandCreate={handleFreehandCreate}
              width={canvasSize.width}
              height={canvasSize.height}
              canvasRef={canvasContainerRef}
            />
          </div>

          <BoardPropertiesPanel
            selectedItem={selectedItem}
            onUpdate={(updates) =>
              selectedItem && handleItemUpdate(selectedItem.id, updates)
            }
            onDelete={handleItemDelete}
          />
        </div>
      </div>
    </Layout>
  );
}

