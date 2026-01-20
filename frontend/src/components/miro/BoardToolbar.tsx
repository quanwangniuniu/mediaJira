"use client";

import React from "react";
import { Type, Square, StickyNote, Frame, Minus, GitBranch, PenTool } from "lucide-react";

type ToolType =
  | "select"
  | "text"
  | "shape"
  | "sticky_note"
  | "frame"
  | "line"
  | "connector"
  | "freehand";

interface BoardToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

export default function BoardToolbar({
  activeTool,
  onToolChange,
}: BoardToolbarProps) {
  const tools: Array<{ type: ToolType; icon: React.ReactNode; label: string }> = [
    { type: "select", icon: <Square className="w-5 h-5" />, label: "Select" },
    { type: "text", icon: <Type className="w-5 h-5" />, label: "Text" },
    { type: "shape", icon: <Square className="w-5 h-5" />, label: "Shape" },
    {
      type: "sticky_note",
      icon: <StickyNote className="w-5 h-5" />,
      label: "Sticky Note",
    },
    { type: "frame", icon: <Frame className="w-5 h-5" />, label: "Frame" },
    { type: "line", icon: <Minus className="w-5 h-5" />, label: "Line" },
    {
      type: "connector",
      icon: <GitBranch className="w-5 h-5" />,
      label: "Connector",
    },
    {
      type: "freehand",
      icon: <PenTool className="w-5 h-5" />,
      label: "Freehand",
    },
  ];

  return (
    <div className="w-16 border-r bg-white flex flex-col items-center py-4 gap-2">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onToolChange(tool.type)}
          className={`p-2 rounded ${
            activeTool === tool.type
              ? "bg-blue-100 text-blue-700"
              : "hover:bg-gray-100 text-gray-600"
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}

