"use client";

import React from "react";
import { BoardItem } from "@/lib/api/miroApi";

interface ShapeItemProps {
  item: BoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
}

export default function ShapeItem({
  item,
  isSelected,
  onSelect,
}: ShapeItemProps) {
  const shapeType = item.style.shapeType || "rectangle";
  const fillColor = item.style.fillColor || "#ffffff";
  const strokeColor = item.style.strokeColor || "#000000";
  const strokeWidth = item.style.strokeWidth || 2;

  const shapeStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: shapeType === "rectangle" ? fillColor : "transparent",
    border: `${strokeWidth}px solid ${strokeColor}`,
    borderRadius: shapeType === "circle" ? "50%" : item.style.borderRadius || 0,
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: isSelected ? "2px solid #3b82f6" : "none",
      }}
      onClick={onSelect}
    >
      <div style={shapeStyle} />
    </div>
  );
}

