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

export function useToolDnD() {
  const handleDragStart = useCallback((e: React.DragEvent, toolType: ToolType) => {
    if (toolType === "select") {
      e.preventDefault();
      return;
    }
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

