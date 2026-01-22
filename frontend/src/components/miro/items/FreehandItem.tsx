"use client";

import React from "react";
import { BoardItem } from "@/lib/api/miroApi";

interface FreehandItemProps {
  item: BoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
}

export default function FreehandItem({
  item,
  isSelected,
  onSelect,
}: FreehandItemProps) {
  const svgPath = item.style?.svgPath || "";
  const strokeColor = item.style?.strokeColor || "#000000";
  const strokeWidth = item.style?.strokeWidth || 4;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: isSelected ? "2px solid #3b82f6" : "none",
        cursor: "pointer",
      }}
      onClick={onSelect}
    >
      <svg
        width="100%"
        height="100%"
        style={{ display: "block" }}
        preserveAspectRatio="none"
      >
        <path
          d={svgPath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

