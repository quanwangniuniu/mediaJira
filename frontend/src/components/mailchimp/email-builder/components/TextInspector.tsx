"use client";
import React from "react";
import { ChevronLeft, HelpCircle } from "lucide-react";
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
            <button className="w-full border border-gray-200 rounded-md px-3 py-3 flex items-center justify-between text-sm text-gray-800 hover:border-gray-300">
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
            <div className="border border-gray-200 rounded-md px-3 py-2">
              <select className="w-full bg-transparent text-sm text-gray-800 focus:outline-none">
                <option>None</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Rounded Corners
            </label>
            <div className="border border-gray-200 rounded-md p-3 space-y-3">
              <label className="flex items-center justify-between text-sm text-gray-700">
                <span>Apply to all sides</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  defaultChecked
                />
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded text-gray-500 text-lg">
                  ⌗
                </div>
                <input
                  type="number"
                  defaultValue={0}
                  className="flex-1 border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                />
              </div>
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
              <input
                type="checkbox"
                className="sr-only peer"
                defaultChecked
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
              <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
            </label>
          </div>
          <div className="px-3 py-3 space-y-4">
            {renderSpacingControl(
              "Padding",
              isPaddingLinked,
              setIsPaddingLinked,
              48
            )}
            <div className="border-t border-gray-200" />
            {renderSpacingControl(
              "Margin",
              isMarginLinked,
              setIsMarginLinked,
              0
            )}
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

