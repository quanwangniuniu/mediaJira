"use client";

import React, { useRef, useLayoutEffect, useMemo } from "react";
import { BoardItem } from "@/lib/api/miroApi";

interface StickyNoteItemProps {
  item: BoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
}

const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;
const MAX_WIDTH = 400;
const PADDING = 8; // Padding on all sides
const AUTO_SIZE_THRESHOLD = 5; // pixels - threshold to detect manual resize

export default function StickyNoteItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
}: StickyNoteItemProps) {
  const backgroundColor = item.style.backgroundColor || "#fef08a"; // Yellow sticky note
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate auto-sized dimensions (memoized to avoid recalculating on every render)
  const { autoWidth, autoHeight, isManuallyResized } = useMemo(() => {
    // Create a temporary element to measure content without constraints
    const measureEl = document.createElement("div");
    measureEl.style.position = "absolute";
    measureEl.style.visibility = "hidden";
    measureEl.style.whiteSpace = "pre-wrap";
    measureEl.style.wordWrap = "break-word";
    measureEl.style.overflowWrap = "break-word";
    measureEl.style.wordBreak = "break-word";
    measureEl.style.width = "auto";
    measureEl.style.maxWidth = `${MAX_WIDTH - PADDING * 2}px`;
    measureEl.style.fontSize = `${item.style.fontSize || 14}px`;
    measureEl.style.fontFamily = item.style.fontFamily || "Arial";
    measureEl.textContent = item.content || "Sticky Note";
    
    document.body.appendChild(measureEl);
    
    // Measure the content dimensions
    const scrollWidth = measureEl.scrollWidth;
    const scrollHeight = measureEl.scrollHeight;
    
    // Clean up
    document.body.removeChild(measureEl);

    // Calculate new dimensions accounting for padding (8px on all sides = 16px total)
    let autoWidth = scrollWidth + PADDING * 2;
    let autoHeight = scrollHeight + PADDING * 2;

    // Apply constraints
    autoWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, autoWidth));
    autoHeight = Math.max(MIN_HEIGHT, autoHeight);

    // Detect if user has manually resized by comparing current dimensions with auto-calculated
    const isManuallyResized = 
      Math.abs(item.width - autoWidth) > AUTO_SIZE_THRESHOLD || 
      Math.abs(item.height - autoHeight) > AUTO_SIZE_THRESHOLD;

    return { autoWidth, autoHeight, isManuallyResized };
  }, [item.content, item.style.fontSize, item.style.fontFamily, item.width, item.height]);

  // Auto-size based on content (only if not manually resized)
  useLayoutEffect(() => {
    if (isManuallyResized) return; // Don't auto-update if user manually resized

    const currentWidth = item.width;
    const currentHeight = item.height;
    const widthDiff = Math.abs(autoWidth - currentWidth);
    const heightDiff = Math.abs(autoHeight - currentHeight);

    // Only update if dimensions changed significantly (> 1px difference) to avoid infinite loops
    if (widthDiff > 1 || heightDiff > 1) {
      onUpdate({
        width: autoWidth,
        height: autoHeight,
      });
    }
  }, [item.content, item.style.fontSize, item.style.fontFamily, autoWidth, autoHeight, isManuallyResized, onUpdate]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: isSelected ? "2px solid #3b82f6" : "1px solid #d1d5db",
        backgroundColor,
        padding: `${PADDING}px`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        borderRadius: "4px",
        overflow: "hidden",
      }}
      onClick={onSelect}
    >
      <div
        ref={contentRef}
        style={{
          fontSize: item.style.fontSize || 14,
          color: item.style.color || "#000000",
          fontFamily: item.style.fontFamily || "Arial",
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
          overflowWrap: "break-word",
          wordBreak: "break-word",
          // Apply different styling based on whether manually resized or auto-sized
          width: isManuallyResized ? "100%" : "fit-content",
          maxWidth: isManuallyResized ? "100%" : `${MAX_WIDTH - PADDING * 2}px`,
          minHeight: "0",
        }}
      >
        {item.content || "Sticky Note"}
      </div>
    </div>
  );
}

