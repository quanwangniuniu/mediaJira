"use client";

import React from "react";
import { Type, Square, StickyNote, Frame, Minus, GitBranch, PenTool, ArrowUpLeft } from "lucide-react";
import { LineVariant, ToolOptions, ToolType, useToolDnD } from "./hooks/useToolDnD";
import { Tooltip } from "@/components/overlay/OverlayPrimitives";

interface BoardToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onToolPrimaryAction: (tool: ToolType, options?: ToolOptions) => void;
  lineVariant: LineVariant;
  onLineVariantChange: (variant: LineVariant) => void;
}

export default function BoardToolbar({
  activeTool,
  onToolChange,
  onToolPrimaryAction,
  lineVariant,
  onLineVariantChange,
}: BoardToolbarProps) {
  const { handleDragStart, handleDragEnd } = useToolDnD();

  const tools: Array<{ type: ToolType; icon: React.ReactNode; label: string }> = [
    { type: "select", icon: <ArrowUpLeft className="w-5 h-5" />, label: "Select" },
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
      label: "brush",
    },
  ];

  return (
    <div className="w-16 border-r bg-white flex flex-col items-center py-4 gap-2">
      {tools.map((tool) => {
        const isSelect = tool.type === "select";
        const isPrimaryClickCreate =
          tool.type !== "select" && tool.type !== "freehand" && tool.type !== "line";
        const lineToolIsActive = tool.type === "line" && activeTool === "line";
        return (
          <div key={tool.type} className="flex flex-col items-center">
            <Tooltip content={tool.label} side="right">
              <button
                onClick={() => {
                  if (isPrimaryClickCreate) {
                    onToolPrimaryAction(tool.type);
                  } else {
                    onToolChange(tool.type);
                  }
                }}
                draggable={!isSelect}
                onDragStart={(e) =>
                  handleDragStart(
                    e,
                    tool.type,
                    tool.type === "line" ? { lineVariant } : undefined,
                  )
                }
                onDragEnd={handleDragEnd}
                className={`p-2 rounded ${
                  activeTool === tool.type
                    ? "bg-blue-100 text-blue-700"
                    : "hover:bg-gray-100 text-gray-600"
                } ${!isSelect ? "cursor-move" : ""}`}
                aria-label={tool.label}
                type="button"
              >
                {tool.icon}
              </button>
            </Tooltip>

            {lineToolIsActive ? (
              <div className="mt-2 flex flex-col items-center gap-1 rounded-lg border bg-white p-1 shadow-sm">
                <LineVariantButton
                  active={lineVariant === "straight_solid"}
                  label="Straight solid"
                  onClick={() => {
                    onLineVariantChange("straight_solid");
                    onToolPrimaryAction("line", { lineVariant: "straight_solid" });
                  }}
                >
                  ─
                </LineVariantButton>
                <LineVariantButton
                  active={lineVariant === "straight_dashed"}
                  label="Straight dashed"
                  onClick={() => {
                    onLineVariantChange("straight_dashed");
                    onToolPrimaryAction("line", { lineVariant: "straight_dashed" });
                  }}
                >
                  ─ ─
                </LineVariantButton>
                <LineVariantButton
                  active={lineVariant === "straight_dotted"}
                  label="Straight dotted"
                  onClick={() => {
                    onLineVariantChange("straight_dotted");
                    onToolPrimaryAction("line", { lineVariant: "straight_dotted" });
                  }}
                >
                  · · ·
                </LineVariantButton>
                <LineVariantButton
                  active={lineVariant === "arrow_solid"}
                  label="Arrow solid"
                  onClick={() => {
                    onLineVariantChange("arrow_solid");
                    onToolPrimaryAction("line", { lineVariant: "arrow_solid" });
                  }}
                >
                  ─▶
                </LineVariantButton>
                <LineVariantButton
                  active={lineVariant === "arrow_dashed"}
                  label="Arrow dashed"
                  onClick={() => {
                    onLineVariantChange("arrow_dashed");
                    onToolPrimaryAction("line", { lineVariant: "arrow_dashed" });
                  }}
                >
                  ─ ─▶
                </LineVariantButton>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LineVariantButton({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={label} side="right">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }}
        className={`w-12 rounded px-1 py-1 text-[10px] leading-none transition ${
          active ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100 text-gray-700"
        }`}
        aria-pressed={active}
        aria-label={label}
      >
        {children}
      </button>
    </Tooltip>
  );
}

