"use client";

import React from "react";
import { BoardItem } from "@/lib/api/miroApi";
import { Trash2 } from "lucide-react";

interface BoardPropertiesPanelProps {
  selectedItem: BoardItem | null;
  onUpdate: (updates: Partial<BoardItem>) => void;
  onDelete: () => void;
}

export default function BoardPropertiesPanel({
  selectedItem,
  onUpdate,
  onDelete,
}: BoardPropertiesPanelProps) {
  if (!selectedItem) {
    return (
      <div className="w-64 border-l bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Board Properties
        </h3>
        <p className="text-sm text-gray-500">Select an item to edit properties</p>
      </div>
    );
  }

  return (
    <div className="w-64 border-l bg-white p-4 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Properties</h3>

      <div className="space-y-4">
        {/* Position */}
        <div>
          <label className="text-xs font-medium text-gray-600">Position</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <input
              type="number"
              value={Math.round(selectedItem.x)}
              onChange={(e) =>
                onUpdate({ x: parseFloat(e.target.value) || 0 })
              }
              className="text-sm border rounded px-2 py-1"
              placeholder="X"
            />
            <input
              type="number"
              value={Math.round(selectedItem.y)}
              onChange={(e) =>
                onUpdate({ y: parseFloat(e.target.value) || 0 })
              }
              className="text-sm border rounded px-2 py-1"
              placeholder="Y"
            />
          </div>
        </div>

        {/* Size */}
        <div>
          <label className="text-xs font-medium text-gray-600">Size</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <input
              type="number"
              value={Math.round(selectedItem.width)}
              onChange={(e) =>
                onUpdate({ width: parseFloat(e.target.value) || 0 })
              }
              className="text-sm border rounded px-2 py-1"
              placeholder="Width"
            />
            <input
              type="number"
              value={Math.round(selectedItem.height)}
              onChange={(e) =>
                onUpdate({ height: parseFloat(e.target.value) || 0 })
              }
              className="text-sm border rounded px-2 py-1"
              placeholder="Height"
            />
          </div>
        </div>

        {/* Content (for text and sticky notes) */}
        {(selectedItem.type === "text" || selectedItem.type === "sticky_note") && (
          <div>
            <label className="text-xs font-medium text-gray-600">Content</label>
            <textarea
              value={selectedItem.content || ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full text-sm border rounded px-2 py-1 mt-1"
              rows={3}
            />
          </div>
        )}

        {/* Freehand stroke properties */}
        {selectedItem.type === "freehand" && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600">Stroke Color</label>
              <input
                type="color"
                value={selectedItem.style?.strokeColor || "#000000"}
                onChange={(e) =>
                  onUpdate({
                    style: {
                      ...selectedItem.style,
                      strokeColor: e.target.value,
                    },
                  })
                }
                className="w-full h-8 border rounded mt-1 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">
                Stroke Width: {selectedItem.style?.strokeWidth || 4}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={selectedItem.style?.strokeWidth || 4}
                onChange={(e) =>
                  onUpdate({
                    style: {
                      ...selectedItem.style,
                      strokeWidth: parseInt(e.target.value, 10),
                    },
                  })
                }
                className="w-full mt-1"
              />
            </div>
          </>
        )}

        {/* Parent item info (for items inside frames) */}
        {selectedItem.parent_item_id && (
          <div>
            <label className="text-xs font-medium text-gray-600">Parent Frame</label>
            <div className="text-xs text-gray-500 mt-1 p-2 bg-gray-50 rounded">
              ID: {selectedItem.parent_item_id}
            </div>
            <button
              onClick={() => onUpdate({ parent_item_id: null })}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Remove from frame
            </button>
          </div>
        )}

        {/* Frame properties */}
        {selectedItem.type === "frame" && (
          <>
            <div>
              <label className="text-xs font-medium text-gray-600">Frame Label</label>
              <input
                type="text"
                value={selectedItem.content || selectedItem.style?.label || ""}
                onChange={(e) =>
                  onUpdate({
                    content: e.target.value,
                    style: {
                      ...selectedItem.style,
                      label: e.target.value,
                    },
                  })
                }
                className="w-full text-sm border rounded px-2 py-1 mt-1"
                placeholder="Frame name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Background Color</label>
              <input
                type="color"
                value={selectedItem.style?.backgroundColor || "#f3f4f6"}
                onChange={(e) =>
                  onUpdate({
                    style: {
                      ...selectedItem.style,
                      backgroundColor: e.target.value,
                    },
                  })
                }
                className="w-full h-8 border rounded mt-1 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Border Color</label>
              <input
                type="color"
                value={selectedItem.style?.borderColor || "#9ca3af"}
                onChange={(e) =>
                  onUpdate({
                    style: {
                      ...selectedItem.style,
                      borderColor: e.target.value,
                    },
                  })
                }
                className="w-full h-8 border rounded mt-1 cursor-pointer"
              />
            </div>
          </>
        )}

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded hover:bg-red-100"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Delete</span>
        </button>
      </div>
    </div>
  );
}

