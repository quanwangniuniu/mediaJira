import { useState, useCallback, useRef, useEffect } from 'react';
import { ToolType } from './useToolDnD';

interface UseFreehandDrawingProps {
  activeTool: ToolType;
  canvasRef: React.RefObject<HTMLDivElement>;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
  onFreehandCreate?: (data: {
    x: number;
    y: number;
    width: number;
    height: number;
    style: { svgPath: string; strokeColor: string; strokeWidth: number };
  }) => void;
}

interface UseFreehandDrawingReturn {
  freehandDraft: Array<{ x: number; y: number }>;
  isDrawingFreehand: boolean;
  svgPathRef: React.RefObject<SVGPathElement>;
  handleFreehandMouseDown: (e: React.MouseEvent<HTMLDivElement>, isBackground: boolean) => void;
  handleFreehandMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleFreehandMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function useFreehandDrawing({
  activeTool,
  canvasRef,
  screenToWorld,
  worldToScreen,
  onFreehandCreate,
}: UseFreehandDrawingProps): UseFreehandDrawingReturn {
  const isDrawingFreehandRef = useRef(false);
  const freehandPointsRef = useRef<Array<{ x: number; y: number }>>([]);
  const [freehandDraft, setFreehandDraft] = useState<Array<{ x: number; y: number }>>([]);
  const [isDrawingFreehand, setIsDrawingFreehand] = useState(false);

  // Refs for direct SVG path updates (no React re-renders)
  const svgPathRef = useRef<SVGPathElement>(null);
  const currentPathRef = useRef<string>("");

  // Store latest dependencies in refs so handlers always have access to latest values
  const activeToolRef = useRef(activeTool);
  const screenToWorldRef = useRef(screenToWorld);
  const worldToScreenRef = useRef(worldToScreen);
  const onFreehandCreateRef = useRef(onFreehandCreate);
  const canvasRefRef = useRef(canvasRef);

  // Update refs when dependencies change
  useEffect(() => {
    activeToolRef.current = activeTool;
    screenToWorldRef.current = screenToWorld;
    worldToScreenRef.current = worldToScreen;
    onFreehandCreateRef.current = onFreehandCreate;
    canvasRefRef.current = canvasRef;
  }, [activeTool, screenToWorld, worldToScreen, onFreehandCreate, canvasRef]);

  // Global mouse handlers for freehand drawing (capture events even outside canvas)
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:60',message:'handleGlobalMouseMove ENTRY',data:{isDrawing:isDrawingFreehandRef.current,activeTool:activeToolRef.current,clientX:e.clientX,clientY:e.clientY},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!isDrawingFreehandRef.current || activeToolRef.current !== "freehand") {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:66',message:'handleGlobalMouseMove EARLY RETURN',data:{isDrawing:isDrawingFreehandRef.current,activeTool:activeToolRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return;
    }

    const rect = canvasRefRef.current.current?.getBoundingClientRect();
    if (!rect) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:72',message:'handleGlobalMouseMove NO RECT',data:{hasCanvasRef:!!canvasRefRef.current.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return;
    }

    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPoint = screenToWorldRef.current(screenX, screenY);
    freehandPointsRef.current.push({ x: worldPoint.x, y: worldPoint.y });

    // Direct SVG path update - NO React re-render
    // Note: First point is already set in mouseDown, so we always append line to here
    const screen = worldToScreenRef.current(worldPoint.x, worldPoint.y);
    currentPathRef.current += ` L ${screen.x} ${screen.y}`;

    // Update SVG path directly via DOM manipulation
    if (svgPathRef.current) {
      svgPathRef.current.setAttribute('d', currentPathRef.current);
      // #region agent log
      const svgElement = svgPathRef.current.ownerSVGElement;
      fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:96',message:'SVG path setAttribute called',data:{pathLength:currentPathRef.current.length,pathPreview:currentPathRef.current.substring(0,100),svgElement:svgPathRef.current.tagName,svgParent:svgPathRef.current.parentElement?.tagName,svgViewBox:svgElement?.getAttribute('viewBox'),svgWidth:svgElement?.clientWidth,svgHeight:svgElement?.clientHeight,svgStyle:svgElement?.getAttribute('style')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'SVG_RENDER'})}).catch(()=>{});
      // #endregion
    }
  }, []);

  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (!isDrawingFreehandRef.current || activeToolRef.current !== "freehand") return;

    const points = freehandPointsRef.current;
    if (points.length >= 2 && onFreehandCreateRef.current) {
      // Compute bounding box
      let minX = Infinity,
        minY = Infinity;
      let maxX = -Infinity,
        maxY = -Infinity;

      points.forEach((p) => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });

      const width = maxX - minX || 1;
      const height = maxY - minY || 1;

      // Build SVG path relative to (minX, minY)
      let svgPath = "";
      points.forEach((p, i) => {
        const relX = p.x - minX;
        const relY = p.y - minY;
        if (i === 0) {
          svgPath += `M ${relX} ${relY}`;
        } else {
          svgPath += ` L ${relX} ${relY}`;
        }
      });

      onFreehandCreateRef.current({
        x: minX,
        y: minY,
        width,
        height,
        style: {
          svgPath,
          strokeColor: "#000000",
          strokeWidth: 4,
        },
      });
    }

    // Remove global listeners
    document.removeEventListener("mousemove", handleGlobalMouseMove);
    document.removeEventListener("mouseup", handleGlobalMouseUp);

    // Clear drawing state
    isDrawingFreehandRef.current = false;
    setIsDrawingFreehand(false);
    freehandPointsRef.current = [];
    currentPathRef.current = "";
    setFreehandDraft([]);
  }, [handleGlobalMouseMove]);

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  // Cleanup listeners when tool changes away from freehand
  useEffect(() => {
    if (activeTool !== "freehand" && isDrawingFreehandRef.current) {
      document.removeEventListener("mousemove", handleGlobalMouseMove);
      document.removeEventListener("mouseup", handleGlobalMouseUp);
      isDrawingFreehandRef.current = false;
      setIsDrawingFreehand(false);
      freehandPointsRef.current = [];
      currentPathRef.current = "";
      setFreehandDraft([]);
    }
  }, [activeTool, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Ensure SVG path is updated when element is mounted
  useEffect(() => {
    if (freehandDraft.length > 0 && svgPathRef.current && currentPathRef.current) {
      svgPathRef.current.setAttribute('d', currentPathRef.current);
    }
  }, [freehandDraft.length]);

  // Handle mouse down for freehand drawing
  const handleFreehandMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>, isBackground: boolean) => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:189',message:'handleFreehandMouseDown ENTRY',data:{activeTool,isBackground,hasHandleGlobalMouseMove:!!handleGlobalMouseMove,hasHandleGlobalMouseUp:!!handleGlobalMouseUp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (activeTool !== "freehand" || !isBackground) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:193',message:'handleFreehandMouseDown EARLY RETURN',data:{activeTool,isBackground},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }

      isDrawingFreehandRef.current = true;
      setIsDrawingFreehand(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:200',message:'handleFreehandMouseDown NO RECT',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        return;
      }

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld(screenX, screenY);
      freehandPointsRef.current = [{ x: worldPoint.x, y: worldPoint.y }];
      
      // Initialize path with first point
      const screen = worldToScreen(worldPoint.x, worldPoint.y);
      currentPathRef.current = `M ${screen.x} ${screen.y}`;
      
      // Show overlay (state update only for visibility toggle)
      // This triggers React render to mount the SVG element
      setFreehandDraft([{ x: worldPoint.x, y: worldPoint.y }]);
      
      // Set initial path on SVG element after a microtask to ensure it's mounted
      // The SVG element will be mounted after setFreehandDraft triggers a render
      setTimeout(() => {
        if (svgPathRef.current) {
          svgPathRef.current.setAttribute('d', currentPathRef.current);
        }
      }, 0);

      // Attach global mouse event listeners for real-time drawing
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:225',message:'BEFORE addEventListener',data:{svgPathRef:!!svgPathRef.current,currentPath:currentPathRef.current,handleGlobalMouseMoveType:typeof handleGlobalMouseMove,handleGlobalMouseUpType:typeof handleGlobalMouseUp},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0362ed7a-9d61-4b76-ab9c-02c5a8e829a0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useFreehandDrawing.ts:228',message:'AFTER addEventListener',data:{listenersAdded:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      e.preventDefault();
      e.stopPropagation();
    },
    [activeTool, canvasRef, screenToWorld, worldToScreen, handleGlobalMouseMove, handleGlobalMouseUp]
  );

  // Handle mouse move for freehand drawing
  const handleFreehandMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Freehand drawing is handled by global mouse event listeners for better tracking
      if (isDrawingFreehandRef.current && activeTool === "freehand") {
        // Let global handlers take care of it
        return;
      }
    },
    [activeTool]
  );

  // Handle mouse up for freehand drawing
  const handleFreehandMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDrawingFreehandRef.current && activeTool === "freehand") {
        // Global handlers will handle this, but clean up if React event fires first
        handleGlobalMouseUp(e.nativeEvent);
      }
    },
    [activeTool, handleGlobalMouseUp]
  );

  return {
    freehandDraft,
    isDrawingFreehand,
    svgPathRef,
    handleFreehandMouseDown,
    handleFreehandMouseMove,
    handleFreehandMouseUp,
  };
}

