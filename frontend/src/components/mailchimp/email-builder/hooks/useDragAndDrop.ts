import { useState, useCallback } from "react";
import { CanvasBlock, CanvasBlocks, DragOverIndex } from "../types";
import { getBlockLabel } from "../utils/helpers";

export const useDragAndDrop = (
  setCanvasBlocks: React.Dispatch<React.SetStateAction<CanvasBlocks>>
) => {
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<DragOverIndex | null>(
    null
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, blockType: string, columns?: number) => {
      e.dataTransfer.setData("blockType", blockType);
      if (columns !== undefined) {
        e.dataTransfer.setData("columns", columns.toString());
      }
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, section: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverSection(section);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverSection(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, section: string, index?: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverSection(null);
      setDragOverIndex(null);
      const blockType = e.dataTransfer.getData("blockType");
      const columnsData = e.dataTransfer.getData("columns");

      if (blockType) {
        const numColumns = columnsData ? parseInt(columnsData, 10) : undefined;
        // Initialize columnsWidths: evenly distribute 12 grid units
        let columnsWidths: number[] | undefined = undefined;
        if (blockType === "Layout" && numColumns) {
          const baseWidth = Math.floor(12 / numColumns);
          const remainder = 12 % numColumns;
          columnsWidths = Array(numColumns).fill(baseWidth);
          // Distribute remainder to first columns
          for (let i = 0; i < remainder; i++) {
            columnsWidths[i]++;
          }
        }

        // Default styles for Heading blocks (Heading 1) with padding 12px on all sides
        const defaultHeadingStyles = blockType === "Heading" 
          ? { fontSize: 31, fontWeight: "bold" as const, padding: "12px" }
          : undefined;

        const newBlock: CanvasBlock = {
          id: `${blockType}-${Date.now()}`,
          type: blockType,
          label: getBlockLabel(blockType),
          content: "",
          columns: numColumns,
          columnsWidths: columnsWidths,
          ...(defaultHeadingStyles && { styles: defaultHeadingStyles }),
        };

        setCanvasBlocks((prev) => {
          const sectionBlocks = [...prev[section as keyof typeof prev]];
          if (index !== undefined) {
            sectionBlocks.splice(index, 0, newBlock);
          } else {
            sectionBlocks.push(newBlock);
          }
          return {
            ...prev,
            [section]: sectionBlocks,
          };
        });
      }
    },
    [setCanvasBlocks]
  );

  const handleDragOverDropZone = useCallback(
    (e: React.DragEvent, section: string, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex({ section, index });
      setDragOverSection(null);
    },
    []
  );

  const handleDragLeaveDropZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're moving to another element that's not a drop zone
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && !relatedTarget.closest(".drop-zone")) {
      setDragOverIndex(null);
    }
  }, []);

  return {
    dragOverSection,
    setDragOverSection,
    dragOverIndex,
    setDragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
  };
};

