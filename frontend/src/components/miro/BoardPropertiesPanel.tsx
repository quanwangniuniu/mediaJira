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

