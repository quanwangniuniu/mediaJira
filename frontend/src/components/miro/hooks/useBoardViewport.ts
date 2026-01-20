import { useState, useCallback, useRef } from 'react';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export function useBoardViewport(initialViewport: Viewport) {
  const [viewport, setViewport] = useState<Viewport>(initialViewport);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Coordinate conversion
  const screenToWorld = useCallback(
    (screenX: number, screenY: number) => {
      return {
        x: (screenX - viewport.x) / viewport.zoom,
        y: (screenY - viewport.y) / viewport.zoom,
      };
    },
    [viewport]
  );

  const worldToScreen = useCallback(
    (worldX: number, worldY: number) => {
      return {
        x: worldX * viewport.zoom + viewport.x,
        y: worldY * viewport.zoom + viewport.y,
      };
    },
    [viewport]
  );

  // Zoom at mouse position
  const zoomAtPoint = useCallback(
    (mouseX: number, mouseY: number, zoomDelta: number) => {
      setViewport((prev) => {
        const worldPoint = {
          x: (mouseX - prev.x) / prev.zoom,
          y: (mouseY - prev.y) / prev.zoom,
        };

        const newZoom = Math.max(0.1, Math.min(10, prev.zoom * (1 + zoomDelta)));
        const newX = mouseX - worldPoint.x * newZoom;
        const newY = mouseY - worldPoint.y * newZoom;

        return { x: newX, y: newY, zoom: newZoom };
      });
    },
    []
  );

  // Pan handlers
  const startPan = useCallback(
    (startX: number, startY: number) => {
      isPanningRef.current = true;
      panStartRef.current = { x: startX - viewport.x, y: startY - viewport.y };
    },
    [viewport]
  );

  const updatePan = useCallback((currentX: number, currentY: number) => {
    if (!isPanningRef.current) return;
    setViewport((prev) => ({
      ...prev,
      x: currentX - panStartRef.current.x,
      y: currentY - panStartRef.current.y,
    }));
  }, []);

  const endPan = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  return {
    viewport,
    setViewport,
    screenToWorld,
    worldToScreen,
    zoomAtPoint,
    startPan,
    updatePan,
    endPan,
  };
}

