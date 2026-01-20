"use client";

import React from "react";
import { BoardItem } from "@/lib/api/miroApi";

interface TextItemProps {
  item: BoardItem;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<BoardItem>) => void;
  style: React.CSSProperties;
}

export default function TextItem({
  item,
  isSelected,
  onSelect,
  onUpdate,
  style,
}: TextItemProps) {
  const textStyle = {
    ...item.style,
    fontSize: item.style.fontSize || 16,
    color: item.style.color || "#000000",
    fontFamily: item.style.fontFamily || "Arial",
    fontWeight: item.style.fontWeight || "normal",
    textAlign: item.style.textAlign || "left",
  };

  return (
    <div
      style={{
        ...style,
        border: isSelected ? "2px solid #3b82f6" : "1px solid transparent",
        padding: "4px",
        backgroundColor: item.style.backgroundColor || "transparent",
      }}
      onClick={onSelect}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // TODO: Enable inline editing
      }}
    >
      <div style={textStyle}>{item.content || "Text"}</div>
    </div>
  );
}

