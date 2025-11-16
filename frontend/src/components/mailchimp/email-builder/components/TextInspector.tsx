"use client";
import React from "react";
import { ChevronLeft, HelpCircle, Scan } from "lucide-react";
import { CanvasBlock, TextStyles } from "../types";
import { renderSpacingControl } from "../utils/helpers";

interface TextInspectorProps {
  selectedBlockData: CanvasBlock | null;
  activeBlockTab: "Content" | "Styles" | "Visibility";
  setActiveBlockTab: (tab: "Content" | "Styles" | "Visibility") => void;
  setSelectedBlock: (block: { section: string; id: string } | null) => void;
  isPaddingLinked: boolean;
  setIsPaddingLinked: (linked: boolean) => void;
  isMarginLinked: boolean;
  setIsMarginLinked: (linked: boolean) => void;
  currentStyles?: TextStyles;
  handleStyleChange?: (styles: Partial<TextStyles>) => void;
  setIsBlockBackgroundPickerOpen?: (open: boolean) => void;
  setIsBorderColorPickerOpen?: (open: boolean) => void;
}

const TextInspector: React.FC<TextInspectorProps> = ({
  selectedBlockData,
  activeBlockTab,
  setActiveBlockTab,
  setSelectedBlock,
  isPaddingLinked,
  setIsPaddingLinked,
  isMarginLinked,
  setIsMarginLinked,
  currentStyles,
  handleStyleChange,
  setIsBlockBackgroundPickerOpen,
  setIsBorderColorPickerOpen,
}) => {
  const textInspectorTitleMap: Record<string, string> = {
    Paragraph: "Text",
    Heading: "Heading",
  };
  const textInspectorTitle = selectedBlockData?.type
    ? textInspectorTitleMap[selectedBlockData.type] || "Text"
    : "Text";
  const textInspectorHelpLabel = `How to use ${textInspectorTitle.toLowerCase()} blocks`;

  const stylesContent = (
    <>
      <div className="space-y-3">
        <span className="uppercase text-[11px] font-semibold text-gray-500">
          All devices
        </span>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Colors
            </label>
            <button
              className="w-full border border-gray-200 rounded-md px-3 py-3 flex items-center justify-between text-sm text-gray-800 hover:border-gray-300"
              onClick={() => setIsBlockBackgroundPickerOpen?.(true)}
            >
              Block Background
              <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                ⌀
              </span>
            </button>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Border
            </label>
            <div className="border border-gray-200 rounded-md px-3 py-2 space-y-2">
              <select
                className="w-full bg-transparent text-sm text-gray-800 focus:outline-none"
                value={currentStyles?.borderStyle || "none"}
                onChange={(e) =>
                  handleStyleChange?.({
                    borderStyle: e.target.value as any,
                    borderWidth:
                      (currentStyles?.borderWidth as any) ??
                      (e.target.value === "none" ? 0 : "1px"),
                    borderColor: currentStyles?.borderColor ?? "#000000",
                  })
                }
              >
                {[
                  "none",
                  "solid",
                  "dashed",
                  "dotted",
                  "double",
                  "inset",
                  "outset",
                  "groove",
                  "ridge",
                ].map((style) => (
                  <option key={style} value={style}>
                    {style[0].toUpperCase() + style.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {currentStyles?.borderStyle &&
              currentStyles.borderStyle !== "none" && (
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="flex-1 border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    value={
                      typeof currentStyles.borderWidth === "number"
                        ? (currentStyles.borderWidth as number)
                        : parseFloat(
                            (currentStyles.borderWidth as string)
                              ?.toString()
                              .replace("px", "") || "1"
                          ) || 1
                    }
                    onChange={(e) =>
                      handleStyleChange?.({
                        borderWidth: `${Number(e.target.value || 0)}px`,
                      })
                    }
                  />
                  <button
                    type="button"
                    className="w-10 h-10 rounded-full border border-gray-300"
                    style={{
                      backgroundColor: currentStyles.borderColor || "#000000",
                    }}
                    aria-label="Border color"
                    onClick={() => setIsBorderColorPickerOpen?.(true)}
                  />
                </div>
              )}
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rounded Corners
              </label>
              <label className="flex items-center gap-2 text-[12px] text-gray-600">
                <span>Apply to all sides</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  defaultChecked
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded text-gray-500 text-lg">
                <Scan className="w-5 h-5 text-gray-500" />
              </div>
              <input
                type="number"
                value={
                  typeof currentStyles?.borderRadius === "number"
                    ? (currentStyles?.borderRadius as number)
                    : parseFloat(
                        (currentStyles?.borderRadius as string)
                          ?.toString()
                          .replace("px", "") || "0"
                      ) || 0
                }
                className="flex-1 border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                onChange={(e) =>
                  handleStyleChange?.({
                    borderRadius: `${Number(e.target.value || 0)}px`,
                  })
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <span className="uppercase text-[11px] font-semibold text-gray-500">
          Device-specific
        </span>
        <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-sm font-medium text-gray-700">
              Link Desktop and Mobile Styles
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </label>
          </div>
          <div className="px-3 py-3 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Padding
                </span>
                <label className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  Apply to all sides
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                    checked={isPaddingLinked}
                    onChange={(e) => setIsPaddingLinked(e.target.checked)}
                  />
                </label>
              </div>
              {isPaddingLinked ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={Number(
                      (currentStyles?.padding as string)
                        ?.toString()
                        .replace("px", "") || 12
                    )}
                    className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                    onChange={(e) =>
                      handleStyleChange?.({
                        padding: `${Number(e.target.value || 0)}px`,
                      })
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {["Top", "Bottom", "Left", "Right"].map((side) => {
                    const key =
                      side === "Top"
                        ? "paddingTop"
                        : side === "Bottom"
                        ? "paddingBottom"
                        : side === "Left"
                        ? "paddingLeft"
                        : "paddingRight";
                    const linkedPaddingValue =
                      typeof currentStyles?.padding === "number"
                        ? (currentStyles?.padding as number)
                        : parseFloat(
                            (currentStyles?.padding as string)
                              ?.toString()
                              .replace("px", "") || "12"
                          ) || 12;
                    return (
                      <div key={`Padding-${side}`} className="space-y-1">
                        <span className="text-xs text-gray-500">{side}</span>
                        <input
                          type="number"
                          defaultValue={linkedPaddingValue}
                          className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                          onChange={(e) =>
                            handleStyleChange?.({
                              [key]: `${Number(e.target.value || 0)}px`,
                            } as any)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="border-t border-gray-200" />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Margin
                </span>
                <label className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                  Apply to all sides
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                    checked={isMarginLinked}
                    onChange={(e) => setIsMarginLinked(e.target.checked)}
                  />
                </label>
              </div>
              {isMarginLinked ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={Number(
                      (currentStyles?.margin as string)
                        ?.toString()
                        .replace("px", "") || 0
                    )}
                    className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                    onChange={(e) =>
                      handleStyleChange?.({
                        margin: `${Number(e.target.value || 0)}px`,
                      })
                    }
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {["Top", "Bottom", "Left", "Right"].map((side) => {
                    const key =
                      side === "Top"
                        ? "marginTop"
                        : side === "Bottom"
                        ? "marginBottom"
                        : side === "Left"
                        ? "marginLeft"
                        : "marginRight";
                    const linkedMarginValue =
                      typeof currentStyles?.margin === "number"
                        ? (currentStyles?.margin as number)
                        : parseFloat(
                            (currentStyles?.margin as string)
                              ?.toString()
                              .replace("px", "") || "0"
                          ) || 0;
                    return (
                      <div key={`Margin-${side}`} className="space-y-1">
                        <span className="text-xs text-gray-500">{side}</span>
                        <input
                          type="number"
                          defaultValue={linkedMarginValue}
                          className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                          onChange={(e) =>
                            handleStyleChange?.({
                              [key]: `${Number(e.target.value || 0)}px`,
                            } as any)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const visibilityContent = (
    <div className="space-y-4 text-sm text-gray-600">
      <p>Visibility settings for this block will appear here.</p>
    </div>
  );

  const codeContent = (
    <div className="space-y-4 text-sm text-gray-600">
      <p>Custom code options for this block will appear here.</p>
    </div>
  );

  const currentContent =
    activeBlockTab === "Styles"
      ? stylesContent
      : activeBlockTab === "Visibility"
      ? visibilityContent
      : codeContent;

  return (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setSelectedBlock(null)}
          className="flex items-center text-sm text-emerald-700 hover:text-emerald-800 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Done
        </button>
        <span className="text-base font-semibold text-gray-900">
          {textInspectorTitle}
        </span>
        <button className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1">
          <HelpCircle className="h-4 w-4" />
          {textInspectorHelpLabel}
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        {(["Content", "Styles", "Visibility"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveBlockTab(tab)}
            className={`flex-1 text-sm font-medium py-3 ${
              activeBlockTab === tab
                ? "text-emerald-700 border-b-2 border-emerald-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
        {currentContent}
      </div>

      {activeBlockTab === "Styles" && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
          <button className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Clear styles
          </button>
          <button className="flex-1 bg-emerald-700 text-white rounded-md px-3 py-2 text-sm hover:bg-emerald-800">
            Apply to all
          </button>
        </div>
      )}
    </div>
  );
};

export default TextInspector;
