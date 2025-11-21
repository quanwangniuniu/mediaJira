import React from "react";

export const getBlockLabel = (blockType: string) => {
  if (blockType === "Paragraph") return "Text";
  if (blockType === "Layout") return "Layout";
  return blockType;
};

export const renderSpacingControl = (
  label: string,
  isLinked: boolean,
  setIsLinked: React.Dispatch<React.SetStateAction<boolean>>,
  defaultValue: number
) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <label className="flex items-center gap-2 text-xs text-gray-600 font-medium">
        Apply to all sides
        <input
          type="checkbox"
          className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
          checked={isLinked}
          onChange={(e) => setIsLinked(e.target.checked)}
        />
      </label>
    </div>
    {isLinked ? (
      <div className="flex items-center gap-2">
        <input
          type="number"
          defaultValue={defaultValue}
          className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
        />
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-2">
        {["Top", "Bottom", "Left", "Right"].map((side) => (
          <div key={`${label}-${side}`} className="space-y-1">
            <span className="text-xs text-gray-500">{side}</span>
            <input
              type="number"
              defaultValue={defaultValue}
              className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
            />
          </div>
        ))}
      </div>
    )}
  </div>
);

