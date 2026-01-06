"use client";
import React from "react";
import { Minus } from "lucide-react";
import { CanvasBlock, BlockBoxStyles } from "@/components/mailchimp/email-builder/types";

interface KlaviyoSpacerInspectorProps {
  selectedBlockData: CanvasBlock | null;
  updateSpacerSettings: (updates: Partial<CanvasBlock>) => void;
  setIsSpacerBlockBackgroundPickerOpen?: (open: boolean) => void;
}

const KlaviyoSpacerInspector: React.FC<KlaviyoSpacerInspectorProps> = ({
  selectedBlockData,
  updateSpacerSettings,
  setIsSpacerBlockBackgroundPickerOpen,
}) => {

  const parseNumeric = (
    value: string | number | undefined,
    fallback: number
  ) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "number") return value;
    const parsed = parseFloat(value.toString().replace("px", ""));
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const spacerHeight = parseNumeric(selectedBlockData?.spacerHeight, 20);
  const blockBackgroundColor =
    selectedBlockData?.spacerBlockStyles?.backgroundColor || "transparent";

  const handleHeightChange = (value: number) => {
    updateSpacerSettings({
      spacerHeight: `${Math.max(20, Math.min(200, value))}px`,
    });
  };

  const updateBlockStyles = (updates: Partial<BlockBoxStyles>) => {
    if (!selectedBlockData) return;
    const current = selectedBlockData.spacerBlockStyles || {};
    const merged = { ...current, ...updates };

    // Remove undefined values
    Object.keys(merged).forEach((key) => {
      if (merged[key as keyof BlockBoxStyles] === undefined) {
        delete merged[key as keyof BlockBoxStyles];
      }
    });

    updateSpacerSettings({
      spacerBlockStyles: merged,
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
        {/* Height */}
        <div className="space-y-3">
          <span className="block text-sm font-semibold text-gray-900">
            Height
          </span>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
            <input
              type="number"
              min={20}
              max={200}
              value={spacerHeight}
              onChange={(e) =>
                handleHeightChange(Number(e.target.value || 20))
              }
              className="flex-1 text-sm outline-none"
            />
            <span className="text-xs text-gray-500">px</span>
          </div>
        </div>

        {/* Background color */}
        <div className="space-y-3 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <span className="block text-sm font-semibold text-gray-900">
              Background color
            </span>
            <button
              onClick={() => setIsSpacerBlockBackgroundPickerOpen?.(true)}
              className="text-gray-400 hover:text-gray-600"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsSpacerBlockBackgroundPickerOpen?.(true)}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm text-gray-800 hover:border-gray-300"
          >
            <span className="flex items-center gap-2">
              <span
                className="w-4 h-4 rounded border border-gray-200"
                style={{
                  backgroundColor:
                    !blockBackgroundColor || blockBackgroundColor === "transparent"
                      ? "transparent"
                      : blockBackgroundColor,
                  backgroundImage:
                    !blockBackgroundColor || blockBackgroundColor === "transparent"
                      ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                      : undefined,
                  backgroundSize:
                    !blockBackgroundColor || blockBackgroundColor === "transparent"
                      ? "8px 8px"
                      : undefined,
                  backgroundPosition:
                    !blockBackgroundColor || blockBackgroundColor === "transparent"
                      ? "0 0, 0 4px, 4px -4px, -4px 0px"
                      : undefined,
                }}
              />
              <span>
                {blockBackgroundColor === "transparent" || !blockBackgroundColor
                  ? "#000000"
                  : blockBackgroundColor.toUpperCase()}
              </span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KlaviyoSpacerInspector;

