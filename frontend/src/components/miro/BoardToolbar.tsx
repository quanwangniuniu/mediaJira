"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Type, Square, StickyNote, Frame, Minus, Link2, PenTool, ArrowUpLeft, ScanSearch, Smile } from "lucide-react";
import { LineVariant, ToolOptions, ToolType, useToolDnD } from "./hooks/useToolDnD";
import { Tooltip } from "@/components/overlay/OverlayPrimitives";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EmojiClickData } from "emoji-picker-react";

const EmojiPicker = dynamic(() => import("emoji-picker-react").then((m) => m.default), {
  ssr: false,
});

interface BoardToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onToolPrimaryAction: (tool: ToolType, options?: ToolOptions) => void;
  onEmojiInsert: (emoji: string) => void;
  lineVariant: LineVariant;
  onLineVariantChange: (variant: LineVariant) => void;
}

export default function BoardToolbar({
  activeTool,
  onToolChange,
  onToolPrimaryAction,
  onEmojiInsert,
  lineVariant,
  onLineVariantChange,
}: BoardToolbarProps) {
  const { handleDragStart, handleDragEnd } = useToolDnD();
  const [emojiOpen, setEmojiOpen] = useState(false);

  const tools: Array<{ type: ToolType; icon: React.ReactNode; label: string }> = [
    { type: "select", icon: <ArrowUpLeft className="w-5 h-5" />, label: "Select" },
    { type: "multi_select", icon: <ScanSearch className="w-5 h-5" />, label: "Multi-select" },
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
      type: "connect",
      icon: <Link2 className="w-5 h-5" />,
      label: "Connect",
    },
    {
      type: "freehand",
      icon: <PenTool className="w-5 h-5" />,
      label: "brush",
    },
    { type: "emoji", icon: <Smile className="w-5 h-5" />, label: "Emoji" },
  ];

  return (
    <div className="w-16 border-r bg-white flex flex-col items-center py-4 gap-2">
      {tools.map((tool) => {
        if (tool.type === "emoji") {
          return (
            <div key="emoji" className="flex flex-col items-center">
              <Popover
                open={emojiOpen}
                onOpenChange={(open) => {
                  setEmojiOpen(open);
                  if (open) onToolChange("emoji");
                }}
              >
                <Tooltip content={tool.label} side="right">
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) =>
                        handleDragStart(e, "emoji", { emoji: "😀" })
                      }
                      onDragEnd={handleDragEnd}
                      className={`p-2 rounded cursor-move ${
                        activeTool === "emoji"
                          ? "bg-blue-100 text-blue-700"
                          : "hover:bg-gray-100 text-gray-600"
                      }`}
                      aria-label={tool.label}
                    >
                      {tool.icon}
                    </button>
                  </PopoverTrigger>
                </Tooltip>
                <PopoverContent
                  side="right"
                  align="start"
                  className="w-auto max-h-[min(420px,70vh)] overflow-y-auto p-0 border-0 shadow-lg"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <EmojiPicker
                    onEmojiClick={(data: EmojiClickData) => {
                      onEmojiInsert(data.emoji);
                      setEmojiOpen(false);
                      onToolChange("select");
                    }}
                    width={320}
                    height={400}
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        }

        const isSelect = tool.type === "select" || tool.type === "multi_select";
        const isPrimaryClickCreate =
          tool.type !== "select" &&
          tool.type !== "multi_select" &&
          tool.type !== "freehand" &&
          tool.type !== "line" &&
          tool.type !== "connect";
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

