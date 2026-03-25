import { useCallback } from 'react';

export type ToolType =
  | "select"
  | "text"
  | "shape"
  | "sticky_note"
  | "frame"
  | "line"
  | "connector"
  | "freehand";

export type LineVariant =
  | "straight_solid"
  | "straight_dashed"
  | "straight_dotted"
  | "arrow_solid"
  | "arrow_dashed";

export type ToolOptions = {
  lineVariant?: LineVariant;
};

export const TOOL_DND_MIME = "application/x-miro-tool";

export function useToolDnD() {
  const handleDragStart = useCallback((e: React.DragEvent, toolType: ToolType, options?: ToolOptions) => {
    if (toolType === "select") {
      e.preventDefault();
      return;
    }
    const payload = { toolType, options: options ?? {} };
    e.dataTransfer.setData(TOOL_DND_MIME, JSON.stringify(payload));
    // Backward compatibility with existing handlers
    e.dataTransfer.setData("toolType", toolType);
    e.dataTransfer.setData("source", "toolbar");
    e.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Optional: cleanup if needed
  }, []);

  return {
    handleDragStart,
    handleDragEnd,
  };
}

